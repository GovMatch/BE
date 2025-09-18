import { Injectable, Logger } from '@nestjs/common';
import { MatchingRequestDto } from '../../dto/matching/matching-request.dto';
import { MatchedProgram } from './matching.service';
import { OpenAIService } from '../openai.service';

@Injectable()
export class LlmMatchingService {
  private readonly logger = new Logger(LlmMatchingService.name);

  constructor(private readonly openAIService: OpenAIService) {}

  async analyzeFinalMatches(
    programs: MatchedProgram[],
    requestData: MatchingRequestDto
  ): Promise<MatchedProgram[]> {
    if (programs.length === 0) {
      return [];
    }

    this.logger.log(`${programs.length}개 프로그램에 대한 OpenAI Assistant 분석 시작`);

    try {
      // 1. OpenAI Assistant 기반 검색 및 분석 시도
      const assistantAnalysisResults = await this.openAIService.searchAndAnalyzeWithAssistant(requestData);

      if (assistantAnalysisResults && assistantAnalysisResults.length > 0) {
        this.logger.log('Assistant 기반 분석 성공, 결과 적용');

        // Assistant 결과를 기존 프로그램 데이터와 매핑
        const enhancedPrograms = programs.slice(0, Math.min(programs.length, assistantAnalysisResults.length))
          .map((program, index) => {
            const analysis = assistantAnalysisResults[index];

            if (analysis && analysis.confidence > 0.5) {
              return {
                ...program,
                matchScore: analysis.matchScore,
                matchReasons: analysis.matchReasons
              };
            } else {
              return this.applyRuleBasedLogic(program, requestData);
            }
          });

        const finalPrograms = enhancedPrograms
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 10);

        this.logger.log(`Assistant 분석 완료: ${finalPrograms.length}개 최종 결과`);
        return finalPrograms;
      }

      // 2. Assistant 실패 시 기존 배치 분석 방식으로 폴백
      this.logger.warn('Assistant 분석 실패, 기존 배치 분석으로 폴백');
      return await this.fallbackToBatchAnalysis(programs, requestData);

    } catch (error) {
      this.logger.error('OpenAI Assistant 분석 실패, 룰 기반 로직으로 폴백:', error);
      return this.fallbackToRuleBasedLogic(programs, requestData);
    }
  }

  private async fallbackToBatchAnalysis(
    programs: MatchedProgram[],
    requestData: MatchingRequestDto
  ): Promise<MatchedProgram[]> {
    this.logger.log('기존 OpenAI 배치 분석 방식으로 실행');

    try {
      const analysisResults = await this.openAIService.analyzeBatchMatching(programs, requestData);

      const enhancedPrograms = programs.map((program, index) => {
        const analysis = analysisResults[index];

        if (analysis && analysis.confidence > 0.5) {
          return {
            ...program,
            matchScore: analysis.matchScore,
            matchReasons: analysis.matchReasons
          };
        } else {
          return this.applyRuleBasedLogic(program, requestData);
        }
      });

      const finalPrograms = enhancedPrograms
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 10);

      this.logger.log(`배치 분석 완료: ${finalPrograms.length}개 최종 결과`);
      return finalPrograms;

    } catch (error) {
      this.logger.error('배치 분석도 실패, 룰 기반 로직으로 폴백:', error);
      return this.fallbackToRuleBasedLogic(programs, requestData);
    }
  }

  private fallbackToRuleBasedLogic(
    programs: MatchedProgram[],
    requestData: MatchingRequestDto
  ): Promise<MatchedProgram[]> {
    this.logger.log(`${programs.length}개 프로그램에 대한 룰 기반 분석 시작 (폴백)`);

    const enhancedPrograms = programs.map(program => this.applyRuleBasedLogic(program, requestData));

    const finalPrograms = enhancedPrograms
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);

    this.logger.log(`룰 기반 분석 완료: ${finalPrograms.length}개 최종 결과`);
    return Promise.resolve(finalPrograms);
  }

  private applyRuleBasedLogic(program: MatchedProgram, requestData: MatchingRequestDto): MatchedProgram {
    const enhancedReasons = this.enhanceMatchReasons(program, requestData);
    const adjustedScore = this.adjustScoreWithLlmLogic(program, requestData);

    return {
      ...program,
      matchScore: adjustedScore,
      matchReasons: enhancedReasons
    };
  }

  private enhanceMatchReasons(program: MatchedProgram, requestData: MatchingRequestDto): string[] {
    const enhancedReasons = [...program.matchReasons];

    // 사업 목적과 프로그램 설명 간의 연관성 분석
    const purposeAlignment = this.analyzePurposeAlignment(
      requestData.businessPurpose,
      program.description
    );

    if (purposeAlignment.score > 0.7) {
      enhancedReasons.push(`사업 목적과 ${Math.round(purposeAlignment.score * 100)}% 일치`);
      if (purposeAlignment.keyMatches.length > 0) {
        enhancedReasons.push(`핵심 키워드 매칭: ${purposeAlignment.keyMatches.join(', ')}`);
      }
    }

    // 기업 성장 단계별 적합성 분석
    const growthStageMatch = this.analyzeGrowthStageMatch(program, requestData);
    if (growthStageMatch) {
      enhancedReasons.push(growthStageMatch);
    }

    // 지원금액 대비 효율성 분석
    const efficiencyAnalysis = this.analyzeEfficiency(program, requestData);
    if (efficiencyAnalysis) {
      enhancedReasons.push(efficiencyAnalysis);
    }

    // 중복 제거 및 최대 5개로 제한
    return [...new Set(enhancedReasons)].slice(0, 5);
  }

  private adjustScoreWithLlmLogic(program: MatchedProgram, requestData: MatchingRequestDto): number {
    let adjustedScore = program.matchScore;

    // 사업 목적 정확도에 따른 점수 조정
    const purposeScore = this.analyzePurposeAlignment(
      requestData.businessPurpose,
      program.description
    ).score;

    adjustedScore += (purposeScore - 0.5) * 0.2; // 최대 ±0.1 조정

    // 기업 성장 단계별 가산점
    if (this.isOptimalForGrowthStage(program, requestData)) {
      adjustedScore += 0.1;
    }

    // 시급성과 마감일의 완벽한 매칭
    if (this.isPerfectUrgencyMatch(program, requestData)) {
      adjustedScore += 0.05;
    }

    // 혁신성/성장성 키워드 보너스
    if (this.hasInnovationKeywords(program.description)) {
      adjustedScore += 0.05;
    }

    // 최종 점수 범위 제한 (0-1)
    return Math.max(0, Math.min(1, adjustedScore));
  }

  private analyzePurposeAlignment(businessPurpose: string, programDescription: string): {
    score: number;
    keyMatches: string[];
  } {
    if (!businessPurpose || !programDescription) {
      return { score: 0.5, keyMatches: [] };
    }

    const purposeKeywords = this.extractBusinessKeywords(businessPurpose);
    const descriptionKeywords = this.extractBusinessKeywords(programDescription);

    const matches: string[] = [];
    let matchCount = 0;

    purposeKeywords.forEach(purposeKeyword => {
      descriptionKeywords.forEach(descKeyword => {
        if (this.isSemanticMatch(purposeKeyword, descKeyword)) {
          matches.push(purposeKeyword);
          matchCount++;
        }
      });
    });

    const score = Math.min(1, matchCount / Math.max(purposeKeywords.length, 1));

    return {
      score,
      keyMatches: [...new Set(matches)]
    };
  }

  private analyzeGrowthStageMatch(program: MatchedProgram, requestData: MatchingRequestDto): string | null {
    const establishedYear = parseInt(requestData.establishedYear);
    const companyAge = new Date().getFullYear() - establishedYear;

    if (companyAge <= 3 && program.category === '06') { // 창업 분야
      return '초기 스타트업에 최적화된 프로그램';
    }

    if (companyAge > 3 && companyAge <= 7 && program.category === '02') { // 기술 분야
      return '성장기 기업의 기술개발에 적합';
    }

    if (companyAge > 7 && program.category === '04') { // 수출 분야
      return '안정기 기업의 해외진출에 유리';
    }

    return null;
  }

  private analyzeEfficiency(program: MatchedProgram, requestData: MatchingRequestDto): string | null {
    if (!program.amountMax || !program.supportRate) {
      return null;
    }

    const expectedNeed = this.estimateFinancialNeed(requestData);
    const supportAmount = program.amountMax * program.supportRate;

    if (supportAmount >= expectedNeed * 0.8) {
      return '예상 자금 수요의 대부분을 충족 가능';
    }

    if (program.supportRate >= 0.8) {
      return `높은 지원율로 자부담 최소화 (${Math.round(program.supportRate * 100)}%)`;
    }

    return null;
  }

  private isOptimalForGrowthStage(program: MatchedProgram, requestData: MatchingRequestDto): boolean {
    const businessType = requestData.businessType;
    const employees = requestData.employees;

    // 스타트업 + 창업 분야
    if (businessType === 'startup' && program.category === '06') {
      return true;
    }

    // 소규모 기업 + 기술 분야
    if (employees === '1-9' && program.category === '02') {
      return true;
    }

    // 중견기업 + 수출/경영 분야
    if (employees === '50-99' && (program.category === '04' || program.category === '07')) {
      return true;
    }

    return false;
  }

  private isPerfectUrgencyMatch(program: MatchedProgram, requestData: MatchingRequestDto): boolean {
    if (!program.deadline) {
      return requestData.urgency === 'long'; // 상시모집은 장기 계획에 적합
    }

    const daysLeft = Math.ceil(
      (program.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const urgencyDays = {
      'immediate': 30,
      'short': 90,
      'medium': 180,
      'long': 365
    }[requestData.urgency] || 90;

    return daysLeft <= urgencyDays && daysLeft >= urgencyDays * 0.5;
  }

  private hasInnovationKeywords(description: string): boolean {
    const innovationKeywords = [
      '혁신', '신기술', 'AI', '인공지능', '빅데이터', 'IoT', '블록체인',
      '디지털', '스마트', '클라우드', '로봇', '자동화', '첨단'
    ];

    return innovationKeywords.some(keyword =>
      description.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private extractBusinessKeywords(text: string): string[] {
    // 비즈니스 관련 핵심 키워드 추출
    const businessKeywords = [
      '솔루션', '플랫폼', '서비스', '시스템', '기술', '개발', '제조', '생산',
      '판매', '유통', '마케팅', '컨설팅', '교육', '의료', '금융', '물류',
      'AI', '빅데이터', 'IoT', '블록체인', '모바일', '웹', '앱', '소프트웨어'
    ];

    const words = text
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1);

    return words.filter(word =>
      businessKeywords.some(keyword =>
        word.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(word.toLowerCase())
      )
    );
  }

  private isSemanticMatch(word1: string, word2: string): boolean {
    // 간단한 의미적 유사성 검사
    const synonymGroups = [
      ['AI', '인공지능', '머신러닝'],
      ['개발', '제작', '구축', '구현'],
      ['솔루션', '시스템', '플랫폼'],
      ['서비스', '사업', '비즈니스'],
      ['기술', '테크', '테크놀로지'],
      ['헬스케어', '의료', '건강'],
      ['금융', 'fintech', '핀테크']
    ];

    if (word1.toLowerCase() === word2.toLowerCase()) {
      return true;
    }

    return synonymGroups.some(group =>
      group.some(synonym => synonym.toLowerCase().includes(word1.toLowerCase())) &&
      group.some(synonym => synonym.toLowerCase().includes(word2.toLowerCase()))
    );
  }

  private estimateFinancialNeed(requestData: MatchingRequestDto): number {
    // 간단한 자금 수요 추정 로직
    const baseNeed = {
      '1-9': 50000000,      // 5천만원
      '10-49': 200000000,   // 2억원
      '50-99': 500000000,   // 5억원
      '100+': 1000000000    // 10억원
    }[requestData.employees] || 50000000;

    const purposeMultiplier = requestData.businessPurpose.includes('개발') ? 1.5 : 1.0;

    return baseNeed * purposeMultiplier;
  }
}