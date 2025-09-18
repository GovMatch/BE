import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../config/prisma.service';
import { MatchingRequestDto } from '../../dto/matching/matching-request.dto';
import { Prisma, SupportProgram, Provider } from '@prisma/client';

export type ProgramWithProvider = SupportProgram & {
  provider: Provider;
  embeddingScore?: number;
};

@Injectable()
export class FilteringService {
  private readonly logger = new Logger(FilteringService.name);

  constructor(private readonly prisma: PrismaService) {}

  async applyHardFilters(requestData: MatchingRequestDto): Promise<ProgramWithProvider[]> {
    const andConditions: Prisma.SupportProgramWhereInput[] = [];

    // 1. 카테고리 필터링
    if (requestData.targetPrograms && requestData.targetPrograms.length > 0) {
      andConditions.push({
        category: {
          in: requestData.targetPrograms
        }
      });
      this.logger.log(`카테고리 필터: [${requestData.targetPrograms.join(', ')}]`);
    }

    // 2. 지역 필터링
    if (requestData.region && requestData.region !== 'other') {
      const regionKeywords = this.getRegionKeywords(requestData.region);
      andConditions.push({
        OR: [
          { region: null }, // 전국 대상
          { region: { contains: regionKeywords, mode: 'insensitive' } }
        ]
      });
      this.logger.log(`지역 필터: ${requestData.region} (키워드: ${regionKeywords})`);
    }

    // 3. 기업 규모별 타겟 필터링
    const targetConditions = this.buildTargetConditions(requestData);
    if (targetConditions.length > 0) {
      andConditions.push({
        OR: [
          { target: null }, // 타겟이 명시되지 않은 경우 (전체 대상)
          ...targetConditions
        ]
      });
      this.logger.log(`타겟 조건 개수: ${targetConditions.length}`);
    }

    // 4. 시급성 기반 마감일 필터링
    const deadlineCondition = this.buildDeadlineCondition(requestData.urgency);
    if (deadlineCondition) {
      andConditions.push(deadlineCondition);
      this.logger.log(`마감일 필터: ${requestData.urgency}`);
    }

    // 5. 활성 사업만 (기본 조건)
    andConditions.push({
      OR: [
        { deadline: { gte: new Date() } },
        { deadline: null }
      ]
    });

    const where: Prisma.SupportProgramWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    try {
      const programs = await this.prisma.supportProgram.findMany({
        where,
        include: {
          provider: true
        },
        orderBy: {
          deadline: 'asc' // 마감일 빠른 순
        }
      });

      this.logger.log(`하드 필터링 결과: ${programs.length}개 프로그램`);
      return programs;

    } catch (error) {
      this.logger.error('하드 필터링 실행 중 오류:', error);
      throw error;
    }
  }

  async applyEmbeddingFilters(
    programs: ProgramWithProvider[],
    businessPurpose: string
  ): Promise<ProgramWithProvider[]> {
    // TODO: 실제 임베딩 API 연동 시 구현
    // 현재는 키워드 기반 간단 매칭으로 구현

    if (!businessPurpose || programs.length === 0) {
      return programs.slice(0, 50); // 상위 50개만 반환
    }

    const purposeKeywords = this.extractKeywords(businessPurpose);
    this.logger.log(`사업 목적 키워드: [${purposeKeywords.join(', ')}]`);

    const scoredPrograms = programs.map(program => {
      let score = 0;
      const description = program.description || '';
      const title = program.title || '';
      const tags = program.tags || [];

      // 제목에서 키워드 매칭
      purposeKeywords.forEach(keyword => {
        if (title.toLowerCase().includes(keyword.toLowerCase())) {
          score += 3;
        }
      });

      // 설명에서 키워드 매칭
      purposeKeywords.forEach(keyword => {
        if (description.toLowerCase().includes(keyword.toLowerCase())) {
          score += 2;
        }
      });

      // 태그에서 키워드 매칭
      purposeKeywords.forEach(keyword => {
        tags.forEach(tag => {
          if (tag.toLowerCase().includes(keyword.toLowerCase())) {
            score += 1;
          }
        });
      });

      return {
        ...program,
        embeddingScore: score
      };
    });

    // 점수순으로 정렬 후 상위 50개 반환
    const sortedPrograms = scoredPrograms
      .sort((a, b) => (b.embeddingScore || 0) - (a.embeddingScore || 0))
      .slice(0, 50);

    this.logger.log(`임베딩 필터링 완료: ${sortedPrograms.length}개 (평균 점수: ${this.calculateAverageEmbeddingScore(sortedPrograms)})`);

    return sortedPrograms;
  }

  private getRegionKeywords(region: string): string {
    const regionMap: Record<string, string> = {
      'seoul': '서울',
      'busan': '부산',
      'daegu': '대구',
      'incheon': '인천',
      'gwangju': '광주',
      'daejeon': '대전',
      'ulsan': '울산',
      'gyeonggi': '경기',
      'gangwon': '강원'
    };
    return regionMap[region] || region;
  }

  private buildTargetConditions(requestData: MatchingRequestDto): Prisma.SupportProgramWhereInput[] {
    const conditions: Prisma.SupportProgramWhereInput[] = [];

    // 사업자 유형별 조건
    if (requestData.businessType === 'startup') {
      conditions.push(
        { target: { contains: '창업', mode: 'insensitive' } },
        { target: { contains: '스타트업', mode: 'insensitive' } },
        { target: { contains: '벤처', mode: 'insensitive' } }
      );
    }

    if (requestData.businessType === 'individual') {
      conditions.push(
        { target: { contains: '개인', mode: 'insensitive' } },
        { target: { contains: '소상공인', mode: 'insensitive' } }
      );
    }

    // 기업 규모별 조건
    if (requestData.employees === '1-9') {
      conditions.push(
        { target: { contains: '소기업', mode: 'insensitive' } },
        { target: { contains: '소상공인', mode: 'insensitive' } }
      );
    } else if (requestData.employees === '10-49') {
      conditions.push(
        { target: { contains: '중소기업', mode: 'insensitive' } },
        { target: { contains: '중소', mode: 'insensitive' } }
      );
    } else if (requestData.employees === '50-99') {
      conditions.push(
        { target: { contains: '중견기업', mode: 'insensitive' } },
        { target: { contains: '중견', mode: 'insensitive' } }
      );
    }

    return conditions;
  }

  private buildDeadlineCondition(urgency: string): Prisma.SupportProgramWhereInput | null {
    const now = new Date();
    let maxDate: Date;

    switch (urgency) {
      case 'immediate':
        maxDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 1개월
        break;
      case 'short':
        maxDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 3개월
        break;
      case 'medium':
        maxDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 6개월
        break;
      case 'long':
        maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1년
        break;
      default:
        return null;
    }

    return {
      OR: [
        { deadline: null }, // 마감일이 없는 경우
        { deadline: { lte: maxDate } } // 지정된 기간 내 마감
      ]
    };
  }

  private extractKeywords(text: string): string[] {
    // 간단한 키워드 추출 (실제로는 더 정교한 NLP 처리 필요)
    const stopWords = ['의', '이', '가', '을', '를', '에', '와', '과', '기반', '통해', '위한', '관련'];

    return text
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.includes(word))
      .slice(0, 10); // 상위 10개 키워드만
  }

  private calculateAverageEmbeddingScore(programs: ProgramWithProvider[]): number {
    if (programs.length === 0) return 0;
    const total = programs.reduce((sum, p) => sum + (p.embeddingScore || 0), 0);
    return Math.round((total / programs.length) * 100) / 100;
  }
}