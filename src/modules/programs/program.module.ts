import { Module } from '@nestjs/common';
import { ProgramController } from './controllers/program.controller';
import { MatchingController } from './controllers/matching/matching.controller';
import { ProgramAdminController } from './controllers/program-admin.controller';
import { ProgramService } from './services/program.service';
import { MatchingService } from './services/matching/matching.service';
import { FilteringService } from './services/matching/filtering.service';
import { ScoringService } from './services/matching/scoring.service';
import { LlmMatchingService } from './services/matching/llm-matching.service';
import { OpenAIService } from './services/openai.service';
import { ProgramFileService } from './services/program-file.service';
import { ProgramSchedulerService } from './services/program-scheduler.service';
import { PrismaModule } from '../../config/prisma.module';
import { BizinfoModule } from '../bizinfo/bizinfo.module';

@Module({
  imports: [PrismaModule, BizinfoModule],
  controllers: [ProgramController, MatchingController, ProgramAdminController],
  providers: [
    ProgramService,
    MatchingService,
    FilteringService,
    ScoringService,
    LlmMatchingService,
    OpenAIService,
    ProgramFileService,
    ProgramSchedulerService
  ],
  exports: [ProgramService, MatchingService]
})
export class ProgramModule {}