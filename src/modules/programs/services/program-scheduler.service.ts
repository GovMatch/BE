import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProgramFileService } from './program-file.service';
import { OpenAIService } from './openai.service';
import { SupportProgramSyncService } from '../../bizinfo/support-program-sync.service';

@Injectable()
export class ProgramSchedulerService {
  private readonly logger = new Logger(ProgramSchedulerService.name);

  constructor(
    private readonly programFileService: ProgramFileService,
    private readonly openAIService: OpenAIService,
    private readonly supportProgramSyncService: SupportProgramSyncService
  ) {}

  // 매일 새벽 1시에 만료된 프로그램 정리
  @Cron('0 1 * * *', {
    name: 'cleanupExpiredPrograms',
    timeZone: 'Asia/Seoul'
  })
  async cleanupExpiredProgramsDaily() {
    this.logger.log('=== 정기 만료 프로그램 정리 시작 ===');

    try {
      const cleanupResult = await this.supportProgramSyncService.cleanupExpiredPrograms();

      this.logger.log('=== 만료 프로그램 정리 완료 ===');
      this.logger.log(`삭제된 프로그램: ${cleanupResult.deletedCount}개`);

      if (cleanupResult.deletedCount > 0) {
        this.logger.log('삭제된 프로그램 목록:');
        cleanupResult.deletedPrograms.forEach((title, index) => {
          this.logger.log(`  ${index + 1}. ${title}`);
        });
      }

    } catch (error) {
      this.logger.error('만료 프로그램 정리 실패:', error);
      await this.handleUpdateError(error);
    }
  }

  // 매일 새벽 2시에 실행 (서버 부하가 적은 시간)
  @Cron('0 2 * * *', {
    name: 'updateProgramData',
    timeZone: 'Asia/Seoul'
  })
  async updateProgramDataDaily() {
    this.logger.log('=== 정기 지원사업 데이터 업데이트 시작 ===');

    try {
      // 1. 만료된 프로그램 정리
      const cleanupResult = await this.supportProgramSyncService.cleanupExpiredPrograms();
      this.logger.log(`만료된 프로그램 ${cleanupResult.deletedCount}개 삭제`);

      // 2. 데이터 업데이트 및 OpenAI 동기화
      const result = await this.programFileService.updateProgramDataAndUpload();

      this.logger.log('=== 정기 업데이트 완료 ===');
      this.logger.log(`처리 결과:`);
      this.logger.log(`- 만료 프로그램 삭제: ${cleanupResult.deletedCount}개`);
      this.logger.log(`- 파일 경로: ${result.filePath}`);
      this.logger.log(`- OpenAI File ID: ${result.fileId}`);
      this.logger.log(`- Vector Store ID: ${result.vectorStoreId}`);
      this.logger.log(`- 전체 프로그램: ${result.stats.totalPrograms}개`);
      this.logger.log(`- 활성 프로그램: ${result.stats.activePrograms}개`);

    } catch (error) {
      this.logger.error('정기 지원사업 데이터 업데이트 실패:', error);

      // 에러 알림 로직 (필요 시 Slack, 이메일 등으로 확장 가능)
      await this.handleUpdateError(error);
    }
  }

  // 서버 시작 시 초기 데이터 업로드 (선택사항)
  async initializeProgramData() {
    this.logger.log('=== 서버 시작 시 지원사업 데이터 초기화 ===');

    try {
      // OpenAI 초기화 상태 확인
      const aiStatus = this.openAIService.getInitializationStatus();
      this.logger.log(`OpenAI 상태: ${JSON.stringify(aiStatus)}`);

      if (aiStatus.isInitialized) {
        this.logger.log('OpenAI Assistant가 이미 초기화되어 있습니다. 건너뜁니다.');
        return;
      }

      // 기존 파일이 있는지 확인
      const existingFile = await this.programFileService.getLatestProgramFile();

      if (!existingFile) {
        this.logger.log('기존 데이터 파일이 없습니다. 새로 생성합니다.');
        await this.updateProgramDataDaily();
      } else {
        this.logger.log(`기존 데이터 파일 발견: ${existingFile}`);
        this.logger.log('기존 파일로 Vector Store 및 Assistant 초기화를 진행합니다.');

        // 기존 파일로 OpenAI Vector Store 초기화
        const result = await this.programFileService.uploadToOpenAI(existingFile);

        this.logger.log('=== 기존 파일로 초기화 완료 ===');
        this.logger.log(`- OpenAI File ID: ${result.fileId}`);
        this.logger.log(`- Vector Store ID: ${result.vectorStoreId}`);
      }

    } catch (error) {
      this.logger.error('초기 데이터 설정 실패:', error);
      this.logger.log('초기화 실패로 인해 새로운 데이터로 재시도합니다.');

      try {
        await this.updateProgramDataDaily();
      } catch (retryError) {
        this.logger.error('재시도도 실패했습니다:', retryError);
        this.logger.warn('서버는 계속 실행되지만 AI 매칭 기능이 제한될 수 있습니다.');
      }
    }
  }

  // 수동 업데이트 트리거 (API 엔드포인트에서 호출 가능)
  async triggerManualUpdate(): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    this.logger.log('수동 지원사업 데이터 업데이트 요청');

    try {
      const result = await this.programFileService.updateProgramDataAndUpload();

      return {
        success: true,
        message: '지원사업 데이터 업데이트가 완료되었습니다.',
        data: {
          fileId: result.fileId,
          vectorStoreId: result.vectorStoreId,
          stats: result.stats,
          updatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('수동 업데이트 실패:', error);

      return {
        success: false,
        message: '지원사업 데이터 업데이트 중 오류가 발생했습니다.',
        data: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // 업데이트 상태 확인
  async getUpdateStatus(): Promise<{
    lastUpdate: string | null;
    nextUpdate: string;
    vectorStoreId: string | null;
    assistantId: string | null;
  }> {
    try {
      const latestFile = await this.programFileService.getLatestProgramFile();

      // 다음 업데이트 시간 계산 (매일 새벽 2시)
      const now = new Date();
      const nextUpdate = new Date();
      nextUpdate.setHours(2, 0, 0, 0);

      if (nextUpdate <= now) {
        nextUpdate.setDate(nextUpdate.getDate() + 1);
      }

      return {
        lastUpdate: latestFile ? this.getFileTimestamp(latestFile) : null,
        nextUpdate: nextUpdate.toISOString(),
        vectorStoreId: null, // OpenAI 서비스에서 가져올 수 있음
        assistantId: null    // OpenAI 서비스에서 가져올 수 있음
      };

    } catch (error) {
      this.logger.error('업데이트 상태 조회 실패:', error);
      throw error;
    }
  }

  private async handleUpdateError(error: any): Promise<void> {
    // 에러 처리 로직
    this.logger.error('업데이트 에러 상세:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // 추후 확장: Slack 알림, 이메일 발송 등
    // await this.notificationService.sendError(error);
  }

  private getFileTimestamp(filePath: string): string | null {
    try {
      const filename = filePath.split('/').pop();
      const match = filename?.match(/support-programs-(\d{4}-\d{2}-\d{2})\.json/);
      return match ? `${match[1]}T02:00:00.000Z` : null;
    } catch {
      return null;
    }
  }

  // 개발/테스트용 메서드들
  async forceUpdateNow(): Promise<void> {
    this.logger.log('강제 업데이트 실행 (개발용)');
    await this.updateProgramDataDaily();
  }

  // Cron 작업 상태 확인
  getCronJobInfo() {
    return {
      name: 'updateProgramData',
      schedule: '0 2 * * *',
      timezone: 'Asia/Seoul',
      description: '매일 새벽 2시 지원사업 데이터 업데이트'
    };
  }
}