import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '정부지원사업 매칭 에이전트 API에 오신 것을 환영합니다!';
  }
}