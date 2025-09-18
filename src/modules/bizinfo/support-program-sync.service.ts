import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { BizinfoApiService } from './bizinfo-api.service';
import { DataMapperService, MappedProgramData } from './data-mapper.service';
import { SupportProgramCategory } from '../../shared/enums/support-program-category.enum';

export interface SyncResult {
  success: boolean;
  totalFetched: number;
  totalProcessed: number;
  created: number;
  updated: number;
  deleted: number;
  errors: number;
  startTime: Date;
  endTime: Date;
  errorDetails: string[];
  deletedPrograms?: string[];
}

@Injectable()
export class SupportProgramSyncService {
  private readonly logger = new Logger(SupportProgramSyncService.name);

  constructor(
    private prisma: PrismaService,
    private bizinfoApiService: BizinfoApiService,
    private dataMapperService: DataMapperService,
  ) {}

  async syncAllPrograms(): Promise<SyncResult> {
    const startTime = new Date();
    this.logger.log('Starting full sync of support programs');

    const result: SyncResult = {
      success: false,
      totalFetched: 0,
      totalProcessed: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
      startTime,
      endTime: new Date(),
      errorDetails: [],
      deletedPrograms: [],
    };

    try {
      // 1. API에서 모든 데이터 가져오기
      const apiData = await this.bizinfoApiService.fetchAllSupportPrograms();
      result.totalFetched = apiData.length;
      this.logger.log(`Fetched ${apiData.length} programs from API`);

      if (apiData.length === 0) {
        this.logger.warn('No data fetched from API');
        result.endTime = new Date();
        return result;
      }

      // 2. 데이터 변환
      const mappedData = this.dataMapperService.mapMultipleProgramsData(apiData);
      this.logger.log(`Mapped ${mappedData.length} programs`);

      // 3. 데이터베이스에 저장
      for (const programData of mappedData) {
        try {
          const upsertResult = await this.upsertSupportProgram(programData);
          result.totalProcessed++;
          if (upsertResult.action === 'created') {
            result.created++;
          } else {
            result.updated++;
          }
        } catch (error) {
          result.errors++;
          result.errorDetails.push(`Program ${programData.externalId}: ${error.message}`);
          this.logger.error(`Error processing program ${programData.externalId}:`, error.message);
        }
      }

      // 4. 만료된 프로그램 정리
      try {
        const cleanupResult = await this.cleanupExpiredPrograms();
        result.deleted = cleanupResult.deletedCount;
        result.deletedPrograms = cleanupResult.deletedPrograms;
        this.logger.log(`Cleaned up ${cleanupResult.deletedCount} expired programs`);
      } catch (cleanupError) {
        result.errors++;
        result.errorDetails.push(`Cleanup error: ${cleanupError.message}`);
        this.logger.error('Error during cleanup:', cleanupError.message);
      }

      // 결과 로깅
      result.success = result.errors === 0;
      result.endTime = new Date();

      this.logger.log(`Sync completed. Processed: ${result.totalProcessed}, Deleted: ${result.deleted}, Errors: ${result.errors}`);

      return result;

    } catch (error) {
      result.errors++;
      result.errorDetails.push(`General sync error: ${error.message}`);
      result.endTime = new Date();
      this.logger.error('Sync failed with error:', error.message);
      throw error;
    }
  }

  private async upsertSupportProgram(programData: MappedProgramData): Promise<{ action: 'created' | 'updated' }> {
    try {
      // 1. Provider 찾기 또는 생성
      const provider = await this.findOrCreateProvider(programData.provider);

      // 2. 기존 프로그램 확인 (외부 ID로)
      const existingProgram = await this.prisma.supportProgram.findFirst({
        where: {
          OR: [
            { title: programData.title },
            // externalId 필드가 있다면 추가
          ],
        },
      });

      if (existingProgram) {
        // 3. 기존 프로그램 업데이트
        await this.prisma.supportProgram.update({
          where: { id: existingProgram.id },
          data: {
            title: programData.title,
            category: programData.category,
            target: programData.target,
            description: programData.description,
            deadline: programData.deadline,
            applicationUrl: programData.applicationUrl,
            attachmentUrl: programData.attachmentUrl,
            tags: programData.tags,
            providerId: provider.id,
          },
        });

        this.logger.debug(`Updated program: ${programData.title}`);
        return { action: 'updated' };
        
      } else {
        // 4. 새 프로그램 생성
        await this.prisma.supportProgram.create({
          data: {
            title: programData.title,
            category: programData.category,
            target: programData.target,
            description: programData.description,
            deadline: programData.deadline,
            applicationUrl: programData.applicationUrl,
            attachmentUrl: programData.attachmentUrl,
            tags: programData.tags,
            providerId: provider.id,
          },
        });

        this.logger.debug(`Created new program: ${programData.title}`);
        return { action: 'created' };
      }
      
    } catch (error) {
      this.logger.error(`Error upserting program "${programData.title}":`, error.message);
      throw error;
    }
  }

  private async findOrCreateProvider(providerData: { name: string; type: string; contact: string | null }) {
    try {
      // 기존 Provider 찾기
      let provider = await this.prisma.provider.findFirst({
        where: { name: providerData.name },
      });

      if (!provider) {
        // 새 Provider 생성
        provider = await this.prisma.provider.create({
          data: {
            name: providerData.name,
            type: providerData.type,
            contact: providerData.contact,
          },
        });
        
        this.logger.debug(`Created new provider: ${providerData.name}`);
      } else {
        // 기존 Provider 정보 업데이트 (필요시)
        if (provider.contact !== providerData.contact || provider.type !== providerData.type) {
          provider = await this.prisma.provider.update({
            where: { id: provider.id },
            data: {
              type: providerData.type,
              contact: providerData.contact,
            },
          });
          
          this.logger.debug(`Updated provider: ${providerData.name}`);
        }
      }

      return provider;
      
    } catch (error) {
      this.logger.error(`Error finding/creating provider "${providerData.name}":`, error.message);
      throw error;
    }
  }

  async syncProgramsByCategory(categoryId: string): Promise<SyncResult> {
    const startTime = new Date();
    this.logger.log(`Starting sync for category: ${categoryId}`);

    const result: SyncResult = {
      success: false,
      totalFetched: 0,
      totalProcessed: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
      startTime,
      endTime: new Date(),
      errorDetails: [],
      deletedPrograms: [],
    };

    try {
      const apiData = await this.bizinfoApiService.fetchProgramsByCategory(categoryId);
      result.totalFetched = apiData.length;

      const mappedData = this.dataMapperService.mapMultipleProgramsData(apiData);
      
      for (const programData of mappedData) {
        try {
          const upsertResult = await this.upsertSupportProgram(programData);
          result.totalProcessed++;
          if (upsertResult.action === 'created') {
            result.created++;
          } else {
            result.updated++;
          }
        } catch (error) {
          result.errors++;
          result.errorDetails.push(`Program ${programData.externalId}: ${error.message}`);
        }
      }

      result.success = result.errors === 0;
      result.endTime = new Date();
      
      return result;

    } catch (error) {
      result.errors++;
      result.errorDetails.push(`Category sync error: ${error.message}`);
      result.endTime = new Date();
      throw error;
    }
  }

  async cleanupExpiredPrograms(): Promise<{
    deletedCount: number;
    deletedPrograms: string[];
  }> {
    const now = new Date();
    this.logger.log('만료된 지원사업 정리 시작');

    try {
      // 1. 만료된 프로그램 조회
      const expiredPrograms = await this.prisma.supportProgram.findMany({
        where: {
          deadline: {
            lt: now
          }
        },
        select: {
          id: true,
          title: true,
          deadline: true
        }
      });

      this.logger.log(`만료된 프로그램 ${expiredPrograms.length}개 발견`);

      if (expiredPrograms.length === 0) {
        return {
          deletedCount: 0,
          deletedPrograms: []
        };
      }

      // 2. 만료된 프로그램 삭제
      const deletedPrograms = expiredPrograms.map(p => p.title);
      const expiredIds = expiredPrograms.map(p => p.id);

      await this.prisma.supportProgram.deleteMany({
        where: {
          id: {
            in: expiredIds
          }
        }
      });

      this.logger.log(`만료된 프로그램 ${expiredPrograms.length}개 삭제 완료`);

      return {
        deletedCount: expiredPrograms.length,
        deletedPrograms
      };

    } catch (error) {
      this.logger.error('만료된 프로그램 정리 실패:', error.message);
      throw error;
    }
  }

  async getSyncStatus(): Promise<{
    lastSyncTime: Date | null;
    totalPrograms: number;
    totalProviders: number;
  }> {
    try {
      const [totalPrograms, totalProviders] = await Promise.all([
        this.prisma.supportProgram.count(),
        this.prisma.provider.count(),
      ]);

      // TODO: 마지막 동기화 시간을 저장하는 테이블이나 설정을 추가할 수 있음
      return {
        lastSyncTime: null, // 나중에 구현
        totalPrograms,
        totalProviders,
      };

    } catch (error) {
      this.logger.error('Error getting sync status:', error.message);
      throw error;
    }
  }
}