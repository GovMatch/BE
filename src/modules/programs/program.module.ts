import { Module } from '@nestjs/common';
import { ProgramController } from './program.controller';
import { ProgramService } from './program.service';
import { PrismaModule } from '../../config/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProgramController],
  providers: [ProgramService],
  exports: [ProgramService]
})
export class ProgramModule {}