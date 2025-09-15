import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): object {
    return {
      status: 'ok',
      message: '정부지원사업 매칭 에이전트 API가 정상 동작 중입니다.',
      timestamp: new Date().toISOString(),
    };
  }
}