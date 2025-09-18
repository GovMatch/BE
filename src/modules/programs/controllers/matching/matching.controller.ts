import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { MatchingRequestDto } from '../../dto/matching/matching-request.dto';
import { MatchingResponseDto } from '../../dto/matching/matching-response.dto';
import { MatchingService } from '../../services/matching/matching.service';

@ApiTags('상담/매칭')
@Controller('programs/matching')
export class MatchingController {
  private readonly logger = new Logger(MatchingController.name);

  constructor(private readonly matchingService: MatchingService) {}
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '기업 매칭 분석',
    description: '기업 정보를 바탕으로 적합한 지원사업을 매칭합니다.',
  })
  @ApiBody({
    type: MatchingRequestDto,
    description: '기업 정보 및 지원 희망 분야',
  })
  @ApiResponse({
    status: 200,
    description: '매칭 결과 반환',
    type: MatchingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '입력 데이터 검증 실패',
  })
  async createMatching(
    @Body(ValidationPipe) matchingData: MatchingRequestDto,
  ): Promise<MatchingResponseDto> {
    this.logger.log('=== 기업 매칭 요청 수신 ===');
    this.logger.log(`기업명: ${matchingData.companyName}`);
    this.logger.log(`사업자 유형: ${matchingData.businessType}`);
    this.logger.log(`설립연도: ${matchingData.establishedYear}`);
    this.logger.log(`직원 수: ${matchingData.employees}`);
    this.logger.log(`연매출: ${matchingData.annualRevenue}`);
    this.logger.log(`소재지: ${matchingData.region}`);
    this.logger.log(`관심 지원분야: [${matchingData.targetPrograms.join(', ')}]`);
    this.logger.log(`지원 시급성: ${matchingData.urgency}`);
    this.logger.log(`바우처 관심분야: [${matchingData.voucherInterest.join(', ')}]`);
    this.logger.log(`사업 목적: ${matchingData.businessPurpose}`);

    try {
      // 매칭 서비스 실행
      const matchingResult = await this.matchingService.matchPrograms(matchingData);

      this.logger.log('=== 매칭 프로세스 성공 ===');
      this.logger.log(`매칭 ID: ${matchingResult.matchingId}`);
      this.logger.log(`총 후보: ${matchingResult.totalCandidates}개`);
      this.logger.log(`필터링 후: ${matchingResult.filteredCount}개`);
      this.logger.log(`최종 매칭: ${matchingResult.finalMatches.length}개`);

      return {
        success: true,
        message: '매칭 분석이 완료되었습니다.',
        data: matchingResult
      };

    } catch (error) {
      this.logger.error('매칭 프로세스 실행 중 오류 발생:', error);

      return {
        success: false,
        message: '매칭 분석 중 오류가 발생했습니다.',
        data: {
          matchingId: `error_${Date.now()}`,
          companyName: matchingData.companyName,
          totalCandidates: 0,
          filteredCount: 0,
          finalMatches: [],
          summary: {
            bestMatch: null as any,
            categoryDistribution: {},
            averageMatchScore: 0
          },
          recommendations: ['시스템 오류로 인해 매칭을 완료할 수 없습니다.']
        }
      };
    }
  }
}