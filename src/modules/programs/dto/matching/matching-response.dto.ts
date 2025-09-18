import { ApiProperty } from '@nestjs/swagger';

export class MatchedProgramDto {
  @ApiProperty({
    description: '지원사업 ID',
    example: 'clm1234567890'
  })
  id: string;

  @ApiProperty({
    description: '지원사업 명',
    example: 'AI 기반 스타트업 지원사업'
  })
  title: string;

  @ApiProperty({
    description: '지원사업 설명',
    example: 'AI 기술을 활용한 스타트업의 기술개발 및 사업화를 지원하는 프로그램'
  })
  description: string;

  @ApiProperty({
    description: '지원사업 카테고리',
    example: '02'
  })
  category: string;

  @ApiProperty({
    description: '지원기관 정보',
    type: 'object',
    properties: {
      name: {
        type: 'string',
        example: '중소벤처기업부'
      },
      type: {
        type: 'string',
        example: '정부기관'
      }
    }
  })
  provider: {
    name: string;
    type: string;
  };

  @ApiProperty({
    description: '최소 지원금액',
    example: 10000000,
    nullable: true
  })
  amountMin?: number;

  @ApiProperty({
    description: '최대 지원금액',
    example: 100000000,
    nullable: true
  })
  amountMax?: number;

  @ApiProperty({
    description: '지원율',
    example: 0.8,
    nullable: true
  })
  supportRate?: number;

  @ApiProperty({
    description: '지원 지역',
    example: '전국',
    nullable: true
  })
  region?: string;

  @ApiProperty({
    description: '마감일',
    example: '2024-12-31T23:59:59.000Z',
    nullable: true
  })
  deadline?: Date;

  @ApiProperty({
    description: '매칭 점수 (0-1)',
    example: 0.92
  })
  matchScore: number;

  @ApiProperty({
    description: '매칭 이유들',
    example: [
      '선택한 지원 분야와 정확히 일치',
      '기업 규모에 적합한 프로그램',
      '사업 목적과 85% 일치'
    ],
    type: [String]
  })
  matchReasons: string[];
}

export class MatchingSummaryDto {
  @ApiProperty({
    description: '최적 매칭 프로그램',
    type: MatchedProgramDto
  })
  bestMatch: MatchedProgramDto;

  @ApiProperty({
    description: '카테고리별 분포',
    example: {
      '02': 3,
      '06': 2,
      '07': 1
    }
  })
  categoryDistribution: Record<string, number>;

  @ApiProperty({
    description: '평균 매칭 점수',
    example: 0.78
  })
  averageMatchScore: number;
}

export class MatchingDataDto {
  @ApiProperty({
    description: '매칭 ID',
    example: 'matching_1703123456789'
  })
  matchingId: string;

  @ApiProperty({
    description: '기업명',
    example: '테크스타트'
  })
  companyName: string;

  @ApiProperty({
    description: '전체 후보 프로그램 수',
    example: 245
  })
  totalCandidates: number;

  @ApiProperty({
    description: '필터링 후 프로그램 수',
    example: 48
  })
  filteredCount: number;

  @ApiProperty({
    description: '최종 매칭된 프로그램들',
    type: [MatchedProgramDto]
  })
  finalMatches: MatchedProgramDto[];

  @ApiProperty({
    description: '매칭 요약 정보',
    type: MatchingSummaryDto
  })
  summary: MatchingSummaryDto;

  @ApiProperty({
    description: '추천 사항',
    example: [
      '가장 적합한 사업: AI 기반 스타트업 지원사업',
      '총 6개의 적합한 사업을 발견했습니다.',
      '2개 사업이 한 달 내 마감 예정입니다.'
    ],
    type: [String]
  })
  recommendations: string[];
}

export class MatchingResponseDto {
  @ApiProperty({
    description: '성공 여부',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: '응답 메시지',
    example: '매칭 분석이 완료되었습니다.'
  })
  message: string;

  @ApiProperty({
    description: '매칭 결과 데이터',
    type: MatchingDataDto
  })
  data: MatchingDataDto;
}