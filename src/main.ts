import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ProgramSchedulerService } from './modules/programs/services/program-scheduler.service';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // CORS 설정
  app.enableCors();

  // Global prefix 설정
  app.setGlobalPrefix('api');

  // Validation Pipe 설정 (쿼리 파라미터 타입 변환 지원)
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}/api`);

  // 서버 시작 후 자동 초기화
  try {
    logger.log('=== 서버 시작 시 자동 초기화 시작 ===');
    const schedulerService = app.get(ProgramSchedulerService);
    await schedulerService.initializeProgramData();
    logger.log('=== 서버 시작 시 자동 초기화 완료 ===');
  } catch (error) {
    logger.error('서버 시작 시 자동 초기화 실패:', error);
    // 초기화 실패해도 서버는 계속 실행
  }
}

bootstrap();