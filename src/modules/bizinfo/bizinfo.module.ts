import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BizinfoApiService } from './bizinfo-api.service';
import { DataMapperService } from './data-mapper.service';
import { SupportProgramSyncService } from './support-program-sync.service';
import { SyncSchedulerService } from './sync-scheduler.service';
import { BizinfoController } from './bizinfo.controller';
import { PrismaModule } from '../../config/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
  providers: [
    BizinfoApiService,
    DataMapperService,
    SupportProgramSyncService,
    SyncSchedulerService,
  ],
  controllers: [BizinfoController],
  exports: [
    BizinfoApiService,
    SupportProgramSyncService,
    SyncSchedulerService,
  ],
})
export class BizinfoModule {}