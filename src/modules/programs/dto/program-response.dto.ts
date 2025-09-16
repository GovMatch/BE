import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportProgramCategory, SUPPORT_PROGRAM_CATEGORY_LABELS } from '../../../shared/enums/support-program-category.enum';

export class ProgramResponseDto {
  @ApiProperty({
    description: '지원사업 ID',
    example: 'prog_123456789'
  })
  id: string;

  @ApiProperty({
    description: '지원사업명',
    example: '청년창업 사관학교'
  })
  title: string;

  @ApiProperty({
    description: '사업 설명',
    example: '청년 창업가를 위한 종합 지원 프로그램'
  })
  description: string;

  @ApiProperty({
    description: '지원사업 분야 코드',
    enum: SupportProgramCategory,
    example: SupportProgramCategory.STARTUP
  })
  category: SupportProgramCategory;

  @ApiProperty({
    description: '지원사업 분야명',
    example: '창업'
  })
  categoryLabel: string;

  @ApiProperty({
    description: '지원 대상',
    example: '청년 예비창업자'
  })
  target: string;

  @ApiPropertyOptional({
    description: '최소 지원금액',
    example: 10000000
  })
  amountMin?: number;

  @ApiPropertyOptional({
    description: '최대 지원금액',
    example: 100000000
  })
  amountMax?: number;

  @ApiPropertyOptional({
    description: '지원률 (%)',
    example: 80
  })
  supportRate?: number;

  @ApiPropertyOptional({
    description: '지원 지역',
    example: '전국'
  })
  region?: string;

  @ApiPropertyOptional({
    description: '신청 마감일',
    example: '2024-12-31T23:59:59Z'
  })
  deadline?: Date;

  @ApiPropertyOptional({
    description: '마감까지 남은 일수',
    example: 15
  })
  daysLeft?: number;

  @ApiPropertyOptional({
    description: '신청 URL',
    example: 'https://www.k-startup.go.kr'
  })
  applicationUrl?: string;

  @ApiPropertyOptional({
    description: '첨부파일 URL',
    example: 'https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/F/71/view.do'
  })
  attachmentUrl?: string;

  @ApiProperty({
    description: '태그 목록',
    example: ['청년', '창업', '기술개발'],
    type: [String]
  })
  tags: string[];

  @ApiProperty({
    description: '지원기관 정보'
  })
  provider: {
    id: string;
    name: string;
    type: string;
    contact?: string;
    website?: string;
  };

  @ApiProperty({
    description: '등록일',
    example: '2024-03-15T10:30:00Z'
  })
  createdAt: Date;
}

export class ProgramListResponseDto {
  @ApiProperty({
    description: '지원사업 목록',
    type: [ProgramResponseDto]
  })
  programs: ProgramResponseDto[];

  @ApiProperty({
    description: '총 개수'
  })
  total: number;

  @ApiProperty({
    description: '현재 페이지'
  })
  page: number;

  @ApiProperty({
    description: '페이지당 항목 수'
  })
  limit: number;

  @ApiProperty({
    description: '총 페이지 수'
  })
  totalPages: number;

  @ApiProperty({
    description: '다음 페이지 존재 여부'
  })
  hasNext: boolean;

  @ApiProperty({
    description: '이전 페이지 존재 여부'
  })
  hasPrev: boolean;
}

export class CategoryResponseDto {
  @ApiProperty({
    description: '분야 코드',
    enum: SupportProgramCategory,
    example: SupportProgramCategory.TECH
  })
  code: SupportProgramCategory;

  @ApiProperty({
    description: '분야명',
    example: '기술'
  })
  label: string;

  @ApiProperty({
    description: '해당 분야 지원사업 개수',
    example: 45
  })
  count: number;
}