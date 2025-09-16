import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDate, IsEnum, IsObject } from 'class-validator';

// 상담 세션 상태
export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

// 상담 세션 생성 요청 DTO
export class CreateSessionDto {
  @ApiPropertyOptional({
    description: '사용자 식별자 (옵션)',
    example: 'user_123456789'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: '세션 메타데이터',
    example: { userAgent: 'Mozilla/5.0...', ip: '192.168.1.1' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// 상담 세션 응답 DTO
export class ConsultationSessionDto {
  @ApiProperty({
    description: '세션 ID',
    example: 'session_123456789'
  })
  @IsString()
  sessionId: string;

  @ApiProperty({
    description: '세션 상태',
    enum: SessionStatus,
    example: SessionStatus.ACTIVE
  })
  @IsEnum(SessionStatus)
  status: SessionStatus;

  @ApiProperty({
    description: '현재 단계',
    example: 1
  })
  currentStep: number;

  @ApiProperty({
    description: '세션 생성 시간',
    example: '2024-03-15T10:30:00Z'
  })
  @IsDate()
  createdAt: Date;

  @ApiPropertyOptional({
    description: '세션 만료 시간',
    example: '2024-03-15T11:30:00Z'
  })
  @IsOptional()
  @IsDate()
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: '수집된 데이터',
    example: { step1: { supportPreferences: { targetPrograms: ['rd', 'tech'] } } }
  })
  @IsOptional()
  @IsObject()
  collectedData?: Record<string, any>;

  @ApiPropertyOptional({
    description: '세션 메타데이터',
    example: { userAgent: 'Mozilla/5.0...', ip: '192.168.1.1' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// 세션 업데이트 DTO
export class UpdateSessionDto {
  @ApiPropertyOptional({
    description: '현재 단계',
    example: 2
  })
  @IsOptional()
  currentStep?: number;

  @ApiPropertyOptional({
    description: '세션 상태',
    enum: SessionStatus,
    example: SessionStatus.COMPLETED
  })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({
    description: '수집된 데이터',
    example: { step2: { companyScale: { employees: '10-49' } } }
  })
  @IsOptional()
  @IsObject()
  collectedData?: Record<string, any>;
}

// 세션 데이터 저장 DTO
export class SaveSessionDataDto {
  @ApiProperty({
    description: '단계 번호',
    example: 1
  })
  step: number;

  @ApiProperty({
    description: '단계별 데이터',
    example: { supportPreferences: { targetPrograms: ['rd', 'tech'] } }
  })
  @IsObject()
  data: Record<string, any>;
}