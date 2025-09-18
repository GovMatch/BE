import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../config/prisma.service';
import { OpenAIService } from './openai.service';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ProgramFileData {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryName: string;
  provider: {
    name: string;
    type: string;
  };
  amountMin?: number;
  amountMax?: number;
  supportRate?: number;
  region?: string;
  target?: string;
  deadline?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ProgramFileService {
  private readonly logger = new Logger(ProgramFileService.name);
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');

  constructor(
    private readonly prisma: PrismaService,
    private readonly openAIService: OpenAIService
  ) {}

  async createProgramDataFile(): Promise<{
    filePath: string;
    totalPrograms: number;
    activePrograms: number;
  }> {
    this.logger.log('지원사업 데이터 파일 생성 시작');

    try {
      // uploads 디렉토리 생성
      await this.ensureUploadsDirectory();

      // 활성 지원사업 데이터 조회
      const programs = await this.getActiveProgramsData();
      const totalCount = await this.getTotalProgramsCount();

      this.logger.log(`총 ${totalCount}개 중 ${programs.length}개 활성 프로그램 조회`);

      // JSON Lines 파일 생성
      const filePath = await this.createJsonLinesFile(programs);

      this.logger.log(`지원사업 데이터 파일 생성 완료: ${filePath}`);

      return {
        filePath,
        totalPrograms: totalCount,
        activePrograms: programs.length
      };

    } catch (error) {
      this.logger.error('지원사업 데이터 파일 생성 실패:', error);
      throw error;
    }
  }

  async uploadToOpenAI(filePath: string): Promise<{
    fileId: string;
    vectorStoreId: string;
  }> {
    this.logger.log(`OpenAI에 파일 업로드 시작: ${filePath}`);

    try {
      const result = await this.openAIService.uploadAndCreateVectorStore(filePath);

      this.logger.log(`OpenAI 업로드 완료 - File ID: ${result.fileId}, Vector Store ID: ${result.vectorStoreId}`);

      return result;

    } catch (error) {
      this.logger.error('OpenAI 파일 업로드 실패:', error);
      throw error;
    }
  }

  async updateProgramDataAndUpload(): Promise<{
    filePath: string;
    fileId: string;
    vectorStoreId: string;
    stats: {
      totalPrograms: number;
      activePrograms: number;
    };
  }> {
    this.logger.log('=== 지원사업 데이터 업데이트 및 OpenAI 동기화 시작 ===');

    try {
      // 1. 새 데이터 파일 생성
      const fileResult = await this.createProgramDataFile();

      // 2. OpenAI에 업로드
      const uploadResult = await this.uploadToOpenAI(fileResult.filePath);

      // 3. 이전 파일 정리 (선택사항)
      await this.cleanupOldFiles();

      const result = {
        filePath: fileResult.filePath,
        fileId: uploadResult.fileId,
        vectorStoreId: uploadResult.vectorStoreId,
        stats: {
          totalPrograms: fileResult.totalPrograms,
          activePrograms: fileResult.activePrograms
        }
      };

      this.logger.log('=== 지원사업 데이터 업데이트 및 동기화 완료 ===');
      this.logger.log(`활성 프로그램: ${result.stats.activePrograms}개`);
      this.logger.log(`Vector Store ID: ${result.vectorStoreId}`);

      return result;

    } catch (error) {
      this.logger.error('지원사업 데이터 업데이트 실패:', error);
      throw error;
    }
  }

  private async getActiveProgramsData(): Promise<ProgramFileData[]> {
    const programs = await this.prisma.supportProgram.findMany({
      where: {
        OR: [
          { deadline: { gte: new Date() } },
          { deadline: null }
        ]
      },
      orderBy: [
        { deadline: 'asc' }
      ]
    });

    return programs.map(program => ({
      id: program.id,
      title: program.title,
      description: program.description || '',
      category: program.category,
      categoryName: program.category || '미분류',
      provider: {
        name: '정보없음',
        type: '기타'
      },
      amountMin: program.amountMin,
      amountMax: program.amountMax,
      supportRate: program.supportRate,
      region: program.region,
      target: program.target,
      deadline: program.deadline?.toISOString(),
      tags: program.tags as string[] || [],
      isActive: !program.deadline || program.deadline >= new Date(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }

  private async getTotalProgramsCount(): Promise<number> {
    return await this.prisma.supportProgram.count();
  }

  private async createJsonLinesFile(programs: ProgramFileData[]): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `support-programs-${timestamp}.json`;
    const filePath = path.join(this.uploadsDir, filename);

    // JSON 배열 형태로 데이터 변환
    const jsonData = programs.map(program => {
      // OpenAI 검색에 최적화된 형태로 변환
      return {
        id: program.id,
        title: program.title,
        description: program.description,
        category: program.categoryName,
        provider: `${program.provider.name} (${program.provider.type})`,
        amount_range: this.formatAmountRange(program.amountMin, program.amountMax),
        support_rate: program.supportRate ? `${Math.round(program.supportRate * 100)}%` : null,
        region: program.region || '전국',
        target: program.target,
        deadline: program.deadline ? new Date(program.deadline).toLocaleDateString('ko-KR') : '상시모집',
        tags: program.tags?.join(', '),

        // 검색 성능을 위한 통합 텍스트
        searchable_text: [
          program.title,
          program.description,
          program.categoryName,
          program.provider.name,
          program.region,
          program.target,
          ...(program.tags || [])
        ].filter(Boolean).join(' '),

        // 메타데이터
        metadata: {
          category_id: program.category,
          is_active: program.isActive,
          created_at: program.createdAt,
          updated_at: program.updatedAt
        }
      };
    });

    // JSON 파일 쓰기
    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');

    this.logger.log(`JSON 파일 생성 완료: ${filename} (${programs.length}개 프로그램)`);

    return filePath;
  }

  private formatAmountRange(min?: number, max?: number): string {
    if (!min && !max) return '정보없음';
    if (!min) return `최대 ${max?.toLocaleString()}원`;
    if (!max) return `최소 ${min?.toLocaleString()}원`;
    if (min === max) return `${min?.toLocaleString()}원`;
    return `${min?.toLocaleString()}원 ~ ${max?.toLocaleString()}원`;
  }

  private async ensureUploadsDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      this.logger.log(`uploads 디렉토리 생성: ${this.uploadsDir}`);
    }
  }

  private async cleanupOldFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.uploadsDir);
      const programFiles = files.filter(file => file.startsWith('support-programs-') && file.endsWith('.json'));

      // 최신 3개 파일만 유지
      if (programFiles.length > 3) {
        const sortedFiles = programFiles.sort().reverse();
        const filesToDelete = sortedFiles.slice(3);

        for (const file of filesToDelete) {
          const filePath = path.join(this.uploadsDir, file);
          await fs.unlink(filePath);
          this.logger.log(`이전 파일 삭제: ${file}`);
        }
      }
    } catch (error) {
      this.logger.warn('이전 파일 정리 실패:', error);
    }
  }

  async getLatestProgramFile(): Promise<string | null> {
    try {
      const files = await fs.readdir(this.uploadsDir);
      const programFiles = files
        .filter(file => file.startsWith('support-programs-') && file.endsWith('.json'))
        .sort()
        .reverse();

      if (programFiles.length > 0) {
        return path.join(this.uploadsDir, programFiles[0]);
      }

      return null;
    } catch {
      return null;
    }
  }
}