import { Injectable, Logger } from '@nestjs/common';
import { MatchingRequestDto } from '../../dto/matching/matching-request.dto';
import { FilteringService } from './filtering.service';
import { ScoringService } from './scoring.service';
import { LlmMatchingService } from './llm-matching.service';

export interface MatchedProgram {
  id: string;
  title: string;
  description: string;
  category: string;
  provider: {
    name: string;
    type: string;
  };
  amountMin?: number;
  amountMax?: number;
  supportRate?: number;
  region?: string;
  deadline?: Date;
  matchScore: number;
  matchReasons: string[];
}

export interface MatchingResult {
  matchingId: string;
  companyName: string;
  totalCandidates: number;
  filteredCount: number;
  finalMatches: MatchedProgram[];
  summary: {
    bestMatch: MatchedProgram;
    categoryDistribution: Record<string, number>;
    averageMatchScore: number;
  };
  recommendations: string[];
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly filteringService: FilteringService,
    private readonly scoringService: ScoringService,
    private readonly llmMatchingService: LlmMatchingService,
  ) {}

  async matchPrograms(requestData: MatchingRequestDto): Promise<MatchingResult> {
    const matchingId = `matching_${Date.now()}`;

    this.logger.log(`=== 매칭 프로세스 시작: ${matchingId} ===`);
    this.logger.log(`기업: ${requestData.companyName}`);

    try {
      // 1단계: 하드 필터링
      this.logger.log('1단계: 하드 필터링 시작');
      const hardFilteredPrograms = await this.filteringService.applyHardFilters(requestData);
      this.logger.log(`하드 필터링 결과: ${hardFilteredPrograms.length}개 프로그램`);

      if (hardFilteredPrograms.length === 0) {
        return this.createEmptyResult(matchingId, requestData.companyName);
      }

      // 2단계: 임베딩 기반 필터링
      this.logger.log('2단계: 임베딩 기반 필터링 시작');
      const embeddingFilteredPrograms = await this.filteringService.applyEmbeddingFilters(
        hardFilteredPrograms,
        requestData.businessPurpose
      );
      this.logger.log(`임베딩 필터링 결과: ${embeddingFilteredPrograms.length}개 프로그램`);

      // 3단계: 비즈니스 로직 스코어링
      this.logger.log('3단계: 비즈니스 로직 스코어링 시작');
      const scoredPrograms = await this.scoringService.calculateScores(
        embeddingFilteredPrograms,
        requestData
      );
      this.logger.log(`스코어링 완료: 평균 점수 ${this.calculateAverageScore(scoredPrograms)}`);

      // 4단계: LLM 최종 매칭 분석
      this.logger.log('4단계: LLM 최종 매칭 분석 시작');
      const finalMatches = await this.llmMatchingService.analyzeFinalMatches(
        scoredPrograms.slice(0, 20), // 상위 20개만 LLM 분석
        requestData
      );
      this.logger.log(`최종 매칭 완료: ${finalMatches.length}개 결과`);

      const result = this.buildMatchingResult(
        matchingId,
        requestData.companyName,
        hardFilteredPrograms.length,
        embeddingFilteredPrograms.length,
        finalMatches
      );

      this.logger.log(`=== 매칭 프로세스 완료: ${matchingId} ===`);
      return result;

    } catch (error) {
      this.logger.error(`매칭 프로세스 실패: ${matchingId}`, error);
      throw error;
    }
  }

  private createEmptyResult(matchingId: string, companyName: string): MatchingResult {
    return {
      matchingId,
      companyName,
      totalCandidates: 0,
      filteredCount: 0,
      finalMatches: [],
      summary: {
        bestMatch: null as any,
        categoryDistribution: {},
        averageMatchScore: 0,
      },
      recommendations: [
        '조건에 맞는 지원사업이 없습니다.',
        '지원 분야나 지역 조건을 조정해보세요.',
        '새로운 지원사업 공고를 기다려보세요.'
      ],
    };
  }

  private calculateAverageScore(programs: any[]): number {
    if (programs.length === 0) return 0;
    const total = programs.reduce((sum, p) => sum + (p.matchScore || 0), 0);
    return Math.round((total / programs.length) * 100) / 100;
  }

  private buildMatchingResult(
    matchingId: string,
    companyName: string,
    totalCandidates: number,
    filteredCount: number,
    finalMatches: MatchedProgram[]
  ): MatchingResult {
    const categoryDistribution: Record<string, number> = {};
    finalMatches.forEach(match => {
      categoryDistribution[match.category] = (categoryDistribution[match.category] || 0) + 1;
    });

    return {
      matchingId,
      companyName,
      totalCandidates,
      filteredCount,
      finalMatches,
      summary: {
        bestMatch: finalMatches[0] || null,
        categoryDistribution,
        averageMatchScore: this.calculateAverageScore(finalMatches),
      },
      recommendations: this.generateRecommendations(finalMatches),
    };
  }

  private generateRecommendations(matches: MatchedProgram[]): string[] {
    const recommendations: string[] = [];

    if (matches.length === 0) {
      return ['조건에 맞는 지원사업이 없습니다.'];
    }

    if (matches.length > 0) {
      recommendations.push(`가장 적합한 사업: ${matches[0].title}`);
    }

    if (matches.length > 3) {
      recommendations.push(`총 ${matches.length}개의 적합한 사업을 발견했습니다.`);
    }

    const urgentDeadlines = matches.filter(m =>
      m.deadline && new Date(m.deadline).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
    );

    if (urgentDeadlines.length > 0) {
      recommendations.push(`${urgentDeadlines.length}개 사업이 한 달 내 마감 예정입니다.`);
    }

    return recommendations;
  }
}