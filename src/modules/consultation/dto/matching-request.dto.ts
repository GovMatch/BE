import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  MaxLength,
  IsOptional,
  ValidateNested,
  IsIn
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enum 정의
export enum BusinessType {
  CORPORATION = 'corporation',
  INDIVIDUAL = 'individual',
  STARTUP = 'startup',
  SOCIAL = 'social'
}

export enum EmployeeRange {
  MICRO = '1-9',           // 소기업
  SMALL = '10-49',         // 중소기업
  MEDIUM = '50-99',        // 중견기업
  LARGE = '100+'           // 대기업
}

export enum RevenueRange {
  UNDER_1B = 'under-1b',   // 10억 미만
  RANGE_1B_10B = '1b-10b', // 10억-100억
  RANGE_10B_50B = '10b-50b', // 100억-500억
  OVER_50B = 'over-50b'    // 500억 이상
}

export enum Urgency {
  IMMEDIATE = 'immediate',  // 1개월 이내
  SHORT = 'short',         // 3개월 이내
  MEDIUM = 'medium',       // 6개월 이내
  LONG = 'long'           // 1년 이내
}

// 1. 기업 기본 정보 DTO
export class CompanyInfoDto {
  @ApiProperty({
    description: '기업명',
    example: '혁신기술(주)',
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty({ message: '기업명은 필수입니다' })
  @MaxLength(100, { message: '기업명은 100자 이하여야 합니다' })
  companyName: string;

  @ApiProperty({
    description: '사업자 유형',
    enum: BusinessType,
    example: BusinessType.CORPORATION
  })
  @IsEnum(BusinessType, { message: '올바른 사업자 유형을 선택해주세요' })
  businessType: BusinessType;

  @ApiPropertyOptional({
    description: '사업 목적/업종',
    example: 'AI 기반 솔루션 개발',
    maxLength: 1000
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: '사업목적은 1000자 이하여야 합니다' })
  businessPurpose?: string;

  @ApiProperty({
    description: '설립연도',
    example: 2020,
    minimum: 1900,
    maximum: 2030
  })
  @IsInt({ message: '설립연도는 숫자여야 합니다' })
  @Min(1900, { message: '설립연도가 올바르지 않습니다' })
  @Max(2030, { message: '설립연도가 올바르지 않습니다' })
  establishedYear: number;
}

// 2. 기업 규모 정보 DTO
export class CompanyScaleDto {
  @ApiProperty({
    description: '직원 수 범위',
    enum: EmployeeRange,
    example: EmployeeRange.SMALL
  })
  @IsEnum(EmployeeRange, { message: '올바른 직원 수 범위를 선택해주세요' })
  employees: EmployeeRange;

  @ApiProperty({
    description: '연매출 범위',
    enum: RevenueRange,
    example: RevenueRange.RANGE_1B_10B
  })
  @IsEnum(RevenueRange, { message: '올바른 연매출 범위를 선택해주세요' })
  annualRevenue: RevenueRange;

  @ApiProperty({
    description: '사업장 소재지',
    example: 'seoul',
    maxLength: 50
  })
  @IsString()
  @IsNotEmpty({ message: '소재지는 필수입니다' })
  @MaxLength(50, { message: '소재지는 50자 이하여야 합니다' })
  region: string;
}

// 3. 지원 희망 분야 DTO
export class SupportPreferencesDto {
  @ApiProperty({
    description: '관심 지원 분야 목록',
    example: ['rd', 'tech', 'digital'],
    type: [String],
    maxItems: 10
  })
  @IsArray({ message: '지원분야는 배열이어야 합니다' })
  @ArrayNotEmpty({ message: '관심 지원분야를 하나 이상 선택해주세요' })
  @ArrayMaxSize(10, { message: '최대 10개까지 선택 가능합니다' })
  @IsString({ each: true, message: '지원분야는 문자열이어야 합니다' })
  targetPrograms: string[];

  @ApiProperty({
    description: '지원 시급성',
    enum: Urgency,
    example: Urgency.SHORT
  })
  @IsEnum(Urgency, { message: '올바른 시급성을 선택해주세요' })
  urgency: Urgency;

  @ApiPropertyOptional({
    description: '관심 바우처 분야',
    example: ['voucher1', 'voucher3'],
    type: [String],
    maxItems: 5
  })
  @IsOptional()
  @IsArray({ message: '바우처 관심분야는 배열이어야 합니다' })
  @ArrayMaxSize(5, { message: '바우처 관심분야는 최대 5개까지 선택 가능합니다' })
  @IsString({ each: true, message: '바우처 분야는 문자열이어야 합니다' })
  voucherInterest?: string[];
}

// 메인 요청 DTO
export class MatchingRequestDto {
  @ApiProperty({
    description: '기업 기본 정보',
    type: CompanyInfoDto
  })
  @ValidateNested()
  @Type(() => CompanyInfoDto)
  companyInfo: CompanyInfoDto;

  @ApiProperty({
    description: '기업 규모 정보',
    type: CompanyScaleDto
  })
  @ValidateNested()
  @Type(() => CompanyScaleDto)
  companyScale: CompanyScaleDto;

  @ApiProperty({
    description: '지원 희망 분야',
    type: SupportPreferencesDto
  })
  @ValidateNested()
  @Type(() => SupportPreferencesDto)
  supportPreferences: SupportPreferencesDto;
}

// 단계별 요청 DTO (3단계 플로우용)
export class ConsultationStep1Dto {
  @ApiProperty({
    description: '지원 희망 분야',
    type: SupportPreferencesDto
  })
  @ValidateNested()
  @Type(() => SupportPreferencesDto)
  supportPreferences: SupportPreferencesDto;
}

export class ConsultationStep2Dto {
  @ApiProperty({
    description: '기업 규모 정보',
    type: CompanyScaleDto
  })
  @ValidateNested()
  @Type(() => CompanyScaleDto)
  companyScale: CompanyScaleDto;
}

export class ConsultationStep3Dto {
  @ApiProperty({
    description: '기업 기본 정보',
    type: CompanyInfoDto
  })
  @ValidateNested()
  @Type(() => CompanyInfoDto)
  companyInfo: CompanyInfoDto;
}