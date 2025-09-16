import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsInt, Min, Max, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { SupportProgramCategory } from '../../../shared/enums/support-program-category.enum';

export class ProgramQueryDto {
  @ApiPropertyOptional({
    description: '페이지 번호 (1부터 시작)',
    example: 1,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '페이지당 항목 수',
    example: 20,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: '지원사업 분야',
    enum: SupportProgramCategory,
    example: SupportProgramCategory.TECH
  })
  @IsOptional()
  @IsEnum(SupportProgramCategory)
  category?: SupportProgramCategory;

  @ApiPropertyOptional({
    description: '검색어 (제목, 설명 검색)',
    example: '청년창업'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '지역 필터',
    example: '서울'
  })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({
    description: '정렬 기준',
    enum: ['deadline', 'createdAt', 'title'],
    example: 'deadline'
  })
  @IsOptional()
  @IsString()
  sortBy?: 'deadline' | 'createdAt' | 'title' = 'deadline';

  @ApiPropertyOptional({
    description: '정렬 방향',
    enum: ['asc', 'desc'],
    example: 'asc'
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({
    description: '태그 필터 (여러 개 가능)',
    example: ['청년', '스타트업'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  tags?: string[];

  @ApiPropertyOptional({
    description: '마감일이 지나지 않은 사업만 조회',
    example: true
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  activeOnly?: boolean = true;
}