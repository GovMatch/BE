import {
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ProgramSchedulerService } from '../services/program-scheduler.service';
import { OpenAIService } from '../services/openai.service';

@ApiTags('관리자/지원사업')
@Controller('admin/programs')
export class ProgramAdminController {
  private readonly logger = new Logger(ProgramAdminController.name);

  constructor(
    private readonly schedulerService: ProgramSchedulerService,
    private readonly openAIService: OpenAIService
  ) {}

  @Post('update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '지원사업 데이터 수동 업데이트',
    description: 'DB에서 최신 지원사업 데이터를 가져와 OpenAI에 업로드합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '업데이트 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            fileId: { type: 'string' },
            vectorStoreId: { type: 'string' },
            stats: {
              type: 'object',
              properties: {
                totalPrograms: { type: 'number' },
                activePrograms: { type: 'number' }
              }
            },
            updatedAt: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: '업데이트 실패'
  })
  async triggerUpdate() {
    this.logger.log('=== 관리자 수동 업데이트 요청 ===');

    try {
      const result = await this.schedulerService.triggerManualUpdate();

      this.logger.log(`수동 업데이트 결과: ${result.success ? '성공' : '실패'}`);

      return result;

    } catch (error) {
      this.logger.error('수동 업데이트 요청 처리 실패:', error);

      return {
        success: false,
        message: '수동 업데이트 요청 처리 중 오류가 발생했습니다.',
        data: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  @Get('status')
  @ApiOperation({
    summary: '지원사업 업데이트 상태 조회',
    description: '마지막 업데이트 시간, 다음 업데이트 예정 시간 등을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '상태 조회 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            lastUpdate: { type: 'string', nullable: true },
            nextUpdate: { type: 'string' },
            vectorStoreId: { type: 'string', nullable: true },
            assistantId: { type: 'string', nullable: true },
            cronJob: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                schedule: { type: 'string' },
                timezone: { type: 'string' },
                description: { type: 'string' }
              }
            }
          }
        }
      }
    }
  })
  async getUpdateStatus() {
    this.logger.log('업데이트 상태 조회 요청');

    try {
      const status = await this.schedulerService.getUpdateStatus();
      const cronInfo = this.schedulerService.getCronJobInfo();

      return {
        success: true,
        data: {
          ...status,
          vectorStoreId: this.openAIService.getCurrentVectorStoreId(),
          assistantId: this.openAIService.getCurrentAssistantId(),
          cronJob: cronInfo
        }
      };

    } catch (error) {
      this.logger.error('상태 조회 실패:', error);

      return {
        success: false,
        message: '상태 조회 중 오류가 발생했습니다.',
        data: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  @Get('connection/test')
  @ApiOperation({
    summary: 'OpenAI 연결 테스트',
    description: 'OpenAI API 연결 상태를 확인합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '연결 테스트 완료',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        connected: { type: 'boolean' },
        message: { type: 'string' },
        timestamp: { type: 'string' }
      }
    }
  })
  async testOpenAIConnection() {
    this.logger.log('OpenAI 연결 테스트 요청');

    try {
      const isConnected = await this.openAIService.testConnection();

      return {
        success: true,
        connected: isConnected,
        message: isConnected ? 'OpenAI 연결 정상' : 'OpenAI 연결 실패',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('OpenAI 연결 테스트 실패:', error);

      return {
        success: false,
        connected: false,
        message: `OpenAI 연결 테스트 중 오류: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Post('initialize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '지원사업 데이터 초기화',
    description: '서버 시작 시 또는 초기 설정을 위한 데이터 초기화를 수행합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '초기화 성공'
  })
  async initializeData() {
    this.logger.log('=== 관리자 데이터 초기화 요청 ===');

    try {
      await this.schedulerService.initializeProgramData();

      return {
        success: true,
        message: '지원사업 데이터 초기화가 완료되었습니다.',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('데이터 초기화 실패:', error);

      return {
        success: false,
        message: '데이터 초기화 중 오류가 발생했습니다.',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}