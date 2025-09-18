import { Injectable, Logger } from '@nestjs/common';
import { MatchingRequestDto } from '../../dto/matching/matching-request.dto';
import { ProgramWithProvider } from './filtering.service';
import { MatchedProgram } from './matching.service';

interface ScoringWeights {
  category: number;      // 40%
  amount: number;        // 25%
  region: number;        // 15%
  deadline: number;      // 10%
  companySize: number;   // 10%
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  private readonly weights: ScoringWeights = {
    category: 0.4,
    amount: 0.25,
    region: 0.15,
    deadline: 0.1,
    companySize: 0.1
  };

  async calculateScores(
    programs: ProgramWithProvider[],
    requestData: MatchingRequestDto
  ): Promise<MatchedProgram[]> {
    this.logger.log(`${programs.length}개 프로그램에 대한 스코어링 시작`);

    const scoredPrograms = programs.map(program => {
      const scores = {
        category: this.calculateCategoryScore(program, requestData),
        amount: this.calculateAmountScore(program, requestData),
        region: this.calculateRegionScore(program, requestData),
        deadline: this.calculateDeadlineScore(program, requestData),
        companySize: this.calculateCompanySizeScore(program, requestData)
      };

      const totalScore = this.calculateWeightedScore(scores);
      const reasons = this.generateMatchReasons(program, requestData, scores);

      const matchedProgram: MatchedProgram = {
        id: program.id,
        title: program.title,
        description: program.description || '',
        category: program.category || 'OTHER',
        provider: {
          name: program.provider.name,
          type: program.provider.type
        },
        amountMin: program.amountMin,
        amountMax: program.amountMax,
        supportRate: program.supportRate,
        region: program.region,
        deadline: program.deadline,
        matchScore: Math.round(totalScore * 100) / 100,
        matchReasons: reasons
      };

      return matchedProgram;
    });

    // 매칭 점수 순으로 정렬
    const sortedPrograms = scoredPrograms.sort((a, b) => b.matchScore - a.matchScore);

    this.logger.log(`스코어링 완료: 평균 점수 ${this.calculateAverageScore(sortedPrograms)}`);

    return sortedPrograms;
  }

  private calculateCategoryScore(program: ProgramWithProvider, requestData: MatchingRequestDto): number {
    if (!program.category || !requestData.targetPrograms) {
      return 0.5; // 기본 점수
    }

    // 정확히 매칭되는 카테고리
    if (requestData.targetPrograms.includes(program.category)) {
      return 1.0;
    }

    // 관련 카테고리 (예: 창업과 기술, 기술과 경영 등)
    const relatedCategories = this.getRelatedCategories(requestData.targetPrograms);
    if (relatedCategories.includes(program.category)) {
      return 0.7;
    }

    return 0.3;
  }

  private calculateAmountScore(program: ProgramWithProvider, requestData: MatchingRequestDto): number {
    if (!program.amountMin && !program.amountMax) {
      return 0.8; // 금액 정보가 없으면 중간 점수
    }

    // 기업 규모별 적정 지원금액 범위 설정
    const expectedRange = this.getExpectedAmountRange(requestData);

    let score = 0.5; // 기본 점수

    // 최소 금액이 기대 범위 내에 있는지
    if (program.amountMin && program.amountMin >= expectedRange.min && program.amountMin <= expectedRange.max) {
      score += 0.3;
    }

    // 최대 금액이 기대 범위 내에 있는지
    if (program.amountMax && program.amountMax >= expectedRange.min && program.amountMax <= expectedRange.max) {
      score += 0.2;
    }

    // 너무 작거나 큰 금액 페널티
    if (program.amountMax && program.amountMax < expectedRange.min * 0.1) {
      score -= 0.3;
    }

    return Math.max(0, Math.min(1, score));
  }

  private calculateRegionScore(program: ProgramWithProvider, requestData: MatchingRequestDto): number {
    if (!program.region) {
      return 1.0; // 전국 대상이면 만점
    }

    if (!requestData.region) {
      return 0.8;
    }

    const regionKeyword = this.getRegionKeyword(requestData.region);
    if (program.region.includes(regionKeyword)) {
      return 1.0; // 정확한 지역 매칭
    }

    // 인근 지역 체크 (예: 경기 <-> 서울)
    if (this.isNearbyRegion(requestData.region, program.region)) {
      return 0.7;
    }

    return 0.3;
  }

  private calculateDeadlineScore(program: ProgramWithProvider, requestData: MatchingRequestDto): number {
    if (!program.deadline) {
      return 0.8; // 상시 모집이면 좋은 점수
    }

    const now = new Date();
    const daysLeft = Math.ceil((program.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return 0; // 이미 마감
    }

    // 시급성과 남은 기간의 적합성 평가
    const urgencyDays = this.getUrgencyDays(requestData.urgency);

    if (daysLeft <= urgencyDays) {
      return 1.0; // 시급성에 맞음
    } else if (daysLeft <= urgencyDays * 2) {
      return 0.8; // 약간 여유 있음
    } else if (daysLeft <= urgencyDays * 3) {
      return 0.6; // 많이 여유 있음
    } else {
      return 0.4; // 너무 먼 미래
    }
  }

  private calculateCompanySizeScore(program: ProgramWithProvider, requestData: MatchingRequestDto): number {
    if (!program.target) {
      return 0.8; // 타겟이 명시되지 않으면 보통 점수
    }

    const target = program.target.toLowerCase();

    // 사업자 유형별 매칭
    if (requestData.businessType === 'startup') {
      if (target.includes('창업') || target.includes('스타트업') || target.includes('벤처')) {
        return 1.0;
      }
    }

    if (requestData.businessType === 'individual') {
      if (target.includes('개인') || target.includes('소상공인')) {
        return 1.0;
      }
    }

    // 기업 규모별 매칭
    if (requestData.employees === '1-9') {
      if (target.includes('소기업') || target.includes('소상공인')) {
        return 1.0;
      }
    } else if (requestData.employees === '10-49') {
      if (target.includes('중소기업') || target.includes('중소')) {
        return 1.0;
      }
    } else if (requestData.employees === '50-99') {
      if (target.includes('중견기업') || target.includes('중견')) {
        return 1.0;
      }
    } else if (requestData.employees === '100+') {
      if (target.includes('대기업') || target.includes('대')) {
        return 1.0;
      }
    }

    return 0.5; // 명확하지 않으면 중간 점수
  }

  private calculateWeightedScore(scores: Record<string, number>): number {
    return (
      scores.category * this.weights.category +
      scores.amount * this.weights.amount +
      scores.region * this.weights.region +
      scores.deadline * this.weights.deadline +
      scores.companySize * this.weights.companySize
    );
  }

  private generateMatchReasons(
    program: ProgramWithProvider,
    requestData: MatchingRequestDto,
    scores: Record<string, number>
  ): string[] {
    const reasons: string[] = [];

    if (scores.category >= 0.9) {
      reasons.push('선택한 지원 분야와 정확히 일치');
    } else if (scores.category >= 0.7) {
      reasons.push('관련 지원 분야에 해당');
    }

    if (scores.region >= 0.9) {
      reasons.push('해당 지역 지원 프로그램');
    }

    if (scores.companySize >= 0.9) {
      reasons.push('기업 규모에 적합한 프로그램');
    }

    if (scores.deadline >= 0.9) {
      reasons.push('지원 시급성에 맞는 마감일');
    }

    if (scores.amount >= 0.8) {
      reasons.push('적절한 지원금액 규모');
    }

    if (program.supportRate && program.supportRate >= 0.8) {
      reasons.push(`높은 지원율 (${Math.round(program.supportRate * 100)}%)`);
    }

    if (reasons.length === 0) {
      reasons.push('기본 조건에 부합하는 프로그램');
    }

    return reasons;
  }

  private getRelatedCategories(targetPrograms: string[]): string[] {
    const related: string[] = [];

    // 기술과 창업 연관성
    if (targetPrograms.includes('02') || targetPrograms.includes('06')) {
      related.push('02', '06');
    }

    // 수출과 경영 연관성
    if (targetPrograms.includes('04') || targetPrograms.includes('07')) {
      related.push('04', '07');
    }

    return related;
  }

  private getExpectedAmountRange(requestData: MatchingRequestDto): { min: number; max: number } {
    // 기업 규모와 매출에 따른 예상 지원금액 범위
    const employeeMultiplier = {
      '1-9': 1,
      '10-49': 2,
      '50-99': 3,
      '100+': 4
    }[requestData.employees] || 1;

    const revenueMultiplier = {
      'under-1b': 1,
      '1b-10b': 2,
      '10b-50b': 3,
      'over-50b': 4
    }[requestData.annualRevenue] || 1;

    const baseAmount = 10000000; // 1천만원
    const multiplier = employeeMultiplier * revenueMultiplier;

    return {
      min: baseAmount * multiplier * 0.5,
      max: baseAmount * multiplier * 3
    };
  }

  private getRegionKeyword(region: string): string {
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

  private isNearbyRegion(userRegion: string, programRegion: string): boolean {
    const nearbyMap: Record<string, string[]> = {
      'seoul': ['경기', '인천'],
      'gyeonggi': ['서울', '인천'],
      'incheon': ['서울', '경기']
    };

    const userKeyword = this.getRegionKeyword(userRegion);
    const nearbyRegions = nearbyMap[userRegion] || [];

    return nearbyRegions.some(nearby => programRegion.includes(nearby));
  }

  private getUrgencyDays(urgency: string): number {
    switch (urgency) {
      case 'immediate': return 30;
      case 'short': return 90;
      case 'medium': return 180;
      case 'long': return 365;
      default: return 90;
    }
  }

  private calculateAverageScore(programs: MatchedProgram[]): number {
    if (programs.length === 0) return 0;
    const total = programs.reduce((sum, p) => sum + p.matchScore, 0);
    return Math.round((total / programs.length) * 100) / 100;
  }
}