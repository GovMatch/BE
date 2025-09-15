import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupportProgramSyncService } from './support-program-sync.service';

@Injectable()
export class SyncSchedulerService {
  private readonly logger = new Logger(SyncSchedulerService.name);
  private isRunning = false;

  constructor(private supportProgramSyncService: SupportProgramSyncService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySync() {
    if (this.isRunning) {
      this.logger.warn('Sync already in progress, skipping scheduled sync');
      return;
    }

    this.logger.log('Starting scheduled daily sync at midnight');
    await this.executeDailySync();
  }

  async executeDailySync(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Sync already in progress');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      this.logger.log('Starting daily support program sync');
      
      const result = await this.supportProgramSyncService.syncAllPrograms();
      
      const duration = new Date().getTime() - startTime.getTime();
      const durationMinutes = Math.round(duration / 1000 / 60 * 100) / 100;

      if (result.success) {
        this.logger.log(
          `Daily sync completed successfully in ${durationMinutes} minutes. ` +
          `Processed: ${result.totalProcessed}, Errors: ${result.errors}`
        );
      } else {
        this.logger.error(
          `Daily sync completed with errors in ${durationMinutes} minutes. ` +
          `Processed: ${result.totalProcessed}, Errors: ${result.errors}`
        );
        
        // 에러 상세 정보 로깅 (최대 5개까지)
        result.errorDetails.slice(0, 5).forEach(error => {
          this.logger.error(`Sync error: ${error}`);
        });
        
        if (result.errorDetails.length > 5) {
          this.logger.error(`... and ${result.errorDetails.length - 5} more errors`);
        }
      }
      
    } catch (error) {
      const duration = new Date().getTime() - startTime.getTime();
      const durationMinutes = Math.round(duration / 1000 / 60 * 100) / 100;
      
      this.logger.error(
        `Daily sync failed after ${durationMinutes} minutes: ${error.message}`,
        error.stack
      );
      
      // TODO: 실패 시 알림 시스템 연동 (Slack, 이메일 등)
      
    } finally {
      this.isRunning = false;
    }
  }

  // 수동 실행을 위한 메서드
  async triggerManualSync(): Promise<any> {
    if (this.isRunning) {
      throw new Error('Sync is already in progress');
    }

    this.logger.log('Manual sync triggered');
    
    try {
      this.isRunning = true;
      const result = await this.supportProgramSyncService.syncAllPrograms();
      
      this.logger.log(
        `Manual sync completed. Processed: ${result.totalProcessed}, Errors: ${result.errors}`
      );
      
      return result;
      
    } finally {
      this.isRunning = false;
    }
  }

  // 카테고리별 수동 동기화
  async triggerCategorySync(categoryId: string): Promise<any> {
    if (this.isRunning) {
      throw new Error('Sync is already in progress');
    }

    this.logger.log(`Manual category sync triggered for: ${categoryId}`);
    
    try {
      this.isRunning = true;
      const result = await this.supportProgramSyncService.syncProgramsByCategory(categoryId);
      
      this.logger.log(
        `Category sync completed for ${categoryId}. Processed: ${result.totalProcessed}, Errors: ${result.errors}`
      );
      
      return result;
      
    } finally {
      this.isRunning = false;
    }
  }

  // 현재 동기화 상태 확인
  getSyncStatus(): { isRunning: boolean } {
    return { isRunning: this.isRunning };
  }

  // 주간 요약 (선택사항 - 월요일 오전 9시)
  @Cron('0 9 * * 1') // 매주 월요일 오전 9시
  async handleWeeklySummary() {
    try {
      this.logger.log('Generating weekly sync summary');
      
      const status = await this.supportProgramSyncService.getSyncStatus();
      
      this.logger.log(
        `Weekly Summary - Total Programs: ${status.totalPrograms}, ` +
        `Total Providers: ${status.totalProviders}`
      );
      
      // TODO: 주간 요약 리포트 생성 및 전송
      
    } catch (error) {
      this.logger.error('Error generating weekly summary:', error.message);
    }
  }
}