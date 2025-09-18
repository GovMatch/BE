import { Controller, Post, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { SyncSchedulerService } from './sync-scheduler.service';
import { SupportProgramSyncService } from './support-program-sync.service';

@Controller('admin/sync')
export class BizinfoController {
  constructor(
    private syncSchedulerService: SyncSchedulerService,
    private supportProgramSyncService: SupportProgramSyncService,
  ) {}

  @Post('manual')
  async triggerManualSync() {
    try {
      const result = await this.syncSchedulerService.triggerManualSync();
      
      return {
        success: true,
        message: '수동 동기화가 완료되었습니다.',
        data: {
          totalFetched: result.totalFetched,
          totalProcessed: result.totalProcessed,
          created: result.created,
          updated: result.updated,
          errors: result.errors,
          duration: result.endTime.getTime() - result.startTime.getTime(),
          errorDetails: result.errors > 0 ? result.errorDetails.slice(0, 10) : [],
        },
      };
      
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: '동기화 실행 중 오류가 발생했습니다.',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('category/:categoryId')
  async triggerCategorySync(@Param('categoryId') categoryId: string) {
    try {
      if (!categoryId) {
        throw new HttpException(
          {
            success: false,
            message: '카테고리 ID가 필요합니다.',
          },
          HttpStatus.BAD_REQUEST
        );
      }

      const result = await this.syncSchedulerService.triggerCategorySync(categoryId);
      
      return {
        success: true,
        message: `카테고리 ${categoryId} 동기화가 완료되었습니다.`,
        data: {
          categoryId,
          totalFetched: result.totalFetched,
          totalProcessed: result.totalProcessed,
          created: result.created,
          updated: result.updated,
          errors: result.errors,
          duration: result.endTime.getTime() - result.startTime.getTime(),
          errorDetails: result.errors > 0 ? result.errorDetails.slice(0, 10) : [],
        },
      };
      
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: '카테고리 동기화 실행 중 오류가 발생했습니다.',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('status')
  async getSyncStatus() {
    try {
      const [schedulerStatus, dataStatus] = await Promise.all([
        this.syncSchedulerService.getSyncStatus(),
        this.supportProgramSyncService.getSyncStatus(),
      ]);

      return {
        success: true,
        data: {
          isRunning: schedulerStatus.isRunning,
          lastSyncTime: dataStatus.lastSyncTime,
          totalPrograms: dataStatus.totalPrograms,
          totalProviders: dataStatus.totalProviders,
        },
      };
      
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: '동기화 상태 조회 중 오류가 발생했습니다.',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('cleanup/expired')
  async cleanupExpiredPrograms() {
    try {
      const result = await this.supportProgramSyncService.cleanupExpiredPrograms();

      return {
        success: true,
        message: '만료된 지원사업 정리가 완료되었습니다.',
        data: {
          deletedCount: result.deletedCount,
          deletedPrograms: result.deletedPrograms,
          timestamp: new Date().toISOString()
        },
      };

    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: '만료된 지원사업 정리 중 오류가 발생했습니다.',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('test')
  async testApiConnection() {
    try {
      // API 연결 테스트 (소량 데이터만 가져와서 확인)
      const result = await this.supportProgramSyncService.syncProgramsByCategory('02');

      return {
        success: true,
        message: 'API 연결 테스트가 성공했습니다.',
        data: {
          totalFetched: result.totalFetched,
          totalProcessed: result.totalProcessed,
          errors: result.errors,
          sampleData: result.totalProcessed > 0 ? '데이터 처리 성공' : '데이터 없음',
        },
      };

    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'API 연결 테스트에 실패했습니다.',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}