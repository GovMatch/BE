import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './config/prisma.module';
import { BizinfoModule } from './modules/bizinfo/bizinfo.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    BizinfoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}