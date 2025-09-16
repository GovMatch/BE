import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsDate, IsEnum, IsOptional, Min, Max } from 'class-validator';

// 매칭 상태 Enum
export enum MatchingStatus {
  SUCCESS = 'SUCCESS',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL'  // 일부만 매칭된 경우
}

// 매칭된 지원사업 DTO
export class MatchedProgramDto {
  @ApiProperty({
    description: '지원사업 ID',
    example: 'prog_123456789'
  })
  @IsString()
  programId: string;

  @ApiProperty({
    description: '지원사업명',
    example: '청년창업 사관학교'
  })
  @IsString()
  programName: string;

  @ApiProperty({
    description: '사업 설명',
    example: '청년 창업가를 위한 종합 지원 프로그램'
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: '매칭 점수 (0-100)',
    example: 85,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  matchScore: number;

  @ApiProperty({
    description: '매칭 이유 목록',
    example: ['업종 일치', '기업 규모 적합', '지역 조건 만족'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  matchReasons: string[];

  @ApiProperty({
    description: '신청 마감일',
    example: '2024-12-31',
    type: String
  })
  @IsString()
  applicationDeadline: string;

  @ApiProperty({
    description: '지원 금액',
    example: '최대 1억원'
  })
  @IsString()
  supportAmount: string;

  @ApiPropertyOptional({
    description: '지원 기관',
    example: '중소벤처기업부'
  })
  @IsOptional()
  @IsString()
  supportOrganization?: string;

  @ApiPropertyOptional({
    description: '마감까지 남은 일수',
    example: 15
  })
  @IsOptional()
  @IsNumber()
  daysLeft?: number;

  @ApiPropertyOptional({
    description: '신청 URL',
    example: 'https://www.k-startup.go.kr'
  })
  @IsOptional()
  @IsString()
  applicationUrl?: string;
}

// 추천 바우처 DTO
export class RecommendedVoucherDto {
  @ApiProperty({
    description: '바우처 ID',
    example: 'voucher_123456789'
  })
  @IsString()
  voucherId: string;

  @ApiProperty({
    description: '바우처명',
    example: '중소기업 기술개발 바우처'
  })
  @IsString()
  voucherName: string;

  @ApiProperty({
    description: '바우처 설명',
    example: '기술개발 비용 지원 바우처'
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: '지원 금액',
    example: '최대 5천만원'
  })
  @IsString()
  supportAmount: string;

  @ApiProperty({
    description: '매칭 점수 (0-100)',
    example: 78,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  matchScore: number;

  @ApiPropertyOptional({
    description: '추천 이유',
    example: ['기업 규모 적합', '업종 매치']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendReasons?: string[];
}

// 분석 메타데이터 DTO
export class AnalysisMetaDto {
  @ApiProperty({
    description: '분석 일시',
    example: '2024-03-15T10:30:00Z'
  })
  @IsDate()
  analysisDate: Date;

  @ApiProperty({
    description: '분석한 총 지원사업 수',
    example: 156
  })
  @IsNumber()
  totalProgramsAnalyzed: number;

  @ApiProperty({
    description: '분석 버전',
    example: 'v1.0.0'
  })
  @IsString()
  analysisVersion: string;

  @ApiPropertyOptional({
    description: '분석 소요 시간 (밀리초)',
    example: 1250
  })
  @IsOptional()
  @IsNumber()
  processingTime?: number;

  @ApiPropertyOptional({
    description: '캐시 사용 여부',
    example: false
  })
  @IsOptional()
  cached?: boolean;
}

// 메인 응답 DTO
export class MatchingResponseDto {
  @ApiProperty({
    description: '분석 ID',
    example: 'analysis_123456789'
  })
  @IsString()
  analysisId: string;

  @ApiProperty({
    description: '매칭 상태',
    enum: MatchingStatus,
    example: MatchingStatus.SUCCESS
  })
  @IsEnum(MatchingStatus)
  status: MatchingStatus;

  @ApiProperty({
    description: '매칭된 지원사업 목록',
    type: [MatchedProgramDto]
  })
  @IsArray()
  matchedPrograms: MatchedProgramDto[];

  @ApiPropertyOptional({
    description: '추천 바우처 목록',
    type: [RecommendedVoucherDto]
  })
  @IsOptional()
  @IsArray()
  recommendedVouchers?: RecommendedVoucherDto[];

  @ApiProperty({
    description: '분석 메타데이터',
    type: AnalysisMetaDto
  })
  analysisMeta: AnalysisMetaDto;

  @ApiPropertyOptional({
    description: '에러 메시지 (실패 시)',
    example: '일시적인 서버 오류가 발생했습니다'
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({
    description: '다음 단계 안내',
    example: '매칭된 사업의 신청서를 자동 생성할 수 있습니다'
  })
  @IsOptional()
  @IsString()
  nextStepGuidance?: string;
}

// 단계별 응답 DTO (3단계 플로우용)
export class ConsultationStepResponseDto {
  @ApiProperty({
    description: '현재 단계',
    example: 1
  })
  @IsNumber()
  currentStep: number;

  @ApiProperty({
    description: '다음 단계',
    example: 2
  })
  @IsNumber()
  nextStep: number;

  @ApiProperty({
    description: '세션 ID',
    example: 'session_123456789'
  })
  @IsString()
  sessionId: string;

  @ApiProperty({
    description: '단계 완료 여부',
    example: true
  })
  completed: boolean;

  @ApiPropertyOptional({
    description: '다음 단계 안내 메시지',
    example: '기업 규모 정보를 입력해주세요'
  })
  @IsOptional()
  @IsString()
  nextStepMessage?: string;

  @ApiPropertyOptional({
    description: '현재까지 수집된 데이터 요약',
    example: { supportPreferences: 'R&D, 기술개발' }
  })
  @IsOptional()
  dataSummary?: Record<string, any>;
}