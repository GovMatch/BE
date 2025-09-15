import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { BizinfoApiService } from './bizinfo-api.service';
import { DataMapperService, MappedProgramData } from './data-mapper.service';

export interface SyncResult {
  success: boolean;
  totalFetched: number;
  totalProcessed: number;
  created: number;
  updated: number;
  errors: number;
  startTime: Date;
  endTime: Date;
  errorDetails: string[];
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
      errors: 0,
      startTime,
      endTime: new Date(),
      errorDetails: [],
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
          await this.upsertSupportProgram(programData);
          result.totalProcessed++;
        } catch (error) {
          result.errors++;
          result.errorDetails.push(`Program ${programData.externalId}: ${error.message}`);
          this.logger.error(`Error processing program ${programData.externalId}:`, error.message);
        }
      }

      // 결과 로깅
      result.success = result.errors === 0;
      result.endTime = new Date();
      
      this.logger.log(`Sync completed. Processed: ${result.totalProcessed}, Errors: ${result.errors}`);
      
      return result;

    } catch (error) {
      result.errors++;
      result.errorDetails.push(`General sync error: ${error.message}`);
      result.endTime = new Date();
      this.logger.error('Sync failed with error:', error.message);
      throw error;
    }
  }

  private async upsertSupportProgram(programData: MappedProgramData): Promise<void> {
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
      errors: 0,
      startTime,
      endTime: new Date(),
      errorDetails: [],
    };

    try {
      const apiData = await this.bizinfoApiService.fetchProgramsByCategory(categoryId);
      result.totalFetched = apiData.length;

      const mappedData = this.dataMapperService.mapMultipleProgramsData(apiData);
      
      for (const programData of mappedData) {
        try {
          await this.upsertSupportProgram(programData);
          result.totalProcessed++;
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