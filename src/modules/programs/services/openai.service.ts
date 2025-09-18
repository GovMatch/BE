import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { MatchingRequestDto } from '../dto/matching/matching-request.dto';
import { MatchedProgram } from './matching/matching.service';
import { createReadStream } from 'fs';

export interface MatchingAnalysis {
  matchScore: number;
  matchReasons: string[];
  confidence: number;
}

export interface VectorStoreInfo {
  fileId: string;
  vectorStoreId: string;
  assistantId?: string;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly client: OpenAI;
  private currentVectorStoreId: string | null = null;
  private currentAssistantId: string | null = null;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.logger.log('OpenAI 클라이언트가 성공적으로 초기화되었습니다.');
  }

  async analyzeMatching(
    program: MatchedProgram,
    requestData: MatchingRequestDto
  ): Promise<MatchingAnalysis> {
    try {
      const prompt = this.buildMatchingPrompt(program, requestData);

      this.logger.debug(`OpenAI 매칭 분석 요청: ${program.title}`);

      const completion = await this.client.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user",
            content: prompt
          }
        ],
        functions: [
          {
            name: "analyze_matching",
            description: "지원사업과 기업 정보의 매칭도를 분석합니다.",
            parameters: {
              type: "object",
              properties: {
                match_score: {
                  type: "number",
                  description: "매칭 점수 (0.0 ~ 1.0)",
                  minimum: 0,
                  maximum: 1
                },
                match_reasons: {
                  type: "array",
                  items: {
                    type: "string"
                  },
                  description: "매칭 이유 목록 (3-5개)",
                  minItems: 3,
                  maxItems: 5
                },
                confidence: {
                  type: "number",
                  description: "분석 신뢰도 (0.0 ~ 1.0)",
                  minimum: 0,
                  maximum: 1
                }
              },
              required: ["match_score", "match_reasons", "confidence"]
            }
          }
        ],
        function_call: { name: "analyze_matching" },
        temperature: 0.3,
        max_tokens: 1000
      });

      const functionCall = completion.choices[0]?.message?.function_call;
      if (!functionCall || !functionCall.arguments) {
        throw new Error('OpenAI 함수 호출 결과가 없습니다.');
      }

      const result = JSON.parse(functionCall.arguments);

      this.logger.debug(`OpenAI 분석 완료: ${program.title}, 점수: ${result.match_score}`);

      return {
        matchScore: Math.max(0, Math.min(1, result.match_score)),
        matchReasons: result.match_reasons || [],
        confidence: Math.max(0, Math.min(1, result.confidence || 0.8))
      };

    } catch (error) {
      this.logger.error(`OpenAI 매칭 분석 실패 (${program.title}):`, error);
      throw error;
    }
  }

  async analyzeBatchMatching(
    programs: MatchedProgram[],
    requestData: MatchingRequestDto
  ): Promise<MatchingAnalysis[]> {
    this.logger.log(`배치 매칭 분석 시작: ${programs.length}개 프로그램`);

    const batchSize = 5; // OpenAI API 제한을 고려한 배치 크기
    const results: MatchingAnalysis[] = [];

    for (let i = 0; i < programs.length; i += batchSize) {
      const batch = programs.slice(i, i + batchSize);

      try {
        const batchPromises = batch.map(program =>
          this.analyzeMatching(program, requestData)
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // API 요청 간 간격 (Rate Limit 방지)
        if (i + batchSize < programs.length) {
          await this.delay(100);
        }

      } catch (error) {
        this.logger.error(`배치 매칭 분석 실패 (배치 ${Math.floor(i / batchSize) + 1}):`, error);

        // 실패한 배치에 대해 기본값 제공
        const fallbackResults = batch.map(() => ({
          matchScore: 0.5,
          matchReasons: ['AI 분석 실패로 인한 기본 평가'],
          confidence: 0.3
        }));

        results.push(...fallbackResults);
      }
    }

    this.logger.log(`배치 매칭 분석 완료: ${results.length}개 결과`);
    return results;
  }

  private getSystemPrompt(): string {
    return `
당신은 정부 지원사업 매칭 전문가입니다.
기업의 정보와 정부 지원사업의 정보를 분석하여 매칭도를 정확히 평가해주세요.

평가 기준:
1. 사업 목적과 프로그램 내용의 부합성 (40%)
2. 기업 규모와 지원 대상의 적합성 (25%)
3. 지원금액과 기업 수요의 적절성 (20%)
4. 지역적 조건의 만족 여부 (10%)
5. 시급성과 마감일의 부합성 (5%)

매칭 점수는 0.0(전혀 부적합) ~ 1.0(완벽 적합) 범위로 평가하며,
구체적이고 실용적인 매칭 이유를 3-5개 제시해주세요.

분석 시 다음을 고려해주세요:
- 누락된 정보는 중립적으로 평가
- 기업의 성장 단계와 프로그램 특성의 조화
- 실제 지원 가능성과 활용도
`;
  }

  private buildMatchingPrompt(
    program: MatchedProgram,
    requestData: MatchingRequestDto
  ): string {
    const establishedYear = parseInt(requestData.establishedYear);
    const companyAge = new Date().getFullYear() - establishedYear;

    return `
기업 정보:
- 회사명: ${requestData.companyName}
- 사업 목적: ${requestData.businessPurpose}
- 사업자 유형: ${requestData.businessType}
- 설립연도: ${requestData.establishedYear} (${companyAge}년차)
- 직원 수: ${requestData.employees}
- 연매출: ${requestData.annualRevenue}
- 소재지: ${requestData.region}
- 지원 시급성: ${requestData.urgency}
- 관심 분야: ${requestData.targetPrograms.join(', ')}

지원사업 정보:
- 제목: ${program.title}
- 설명: ${program.description}
- 카테고리: ${program.category}
- 지원기관: ${program.provider.name} (${program.provider.type})
- 지원금액: ${program.amountMin ? `${program.amountMin.toLocaleString()}원` : '정보없음'} ~ ${program.amountMax ? `${program.amountMax.toLocaleString()}원` : '정보없음'}
- 지원율: ${program.supportRate ? `${Math.round(program.supportRate * 100)}%` : '정보없음'}
- 지원 지역: ${program.region || '전국'}
- 마감일: ${program.deadline ? program.deadline.toLocaleDateString('ko-KR') : '상시모집'}
- 현재 매칭 점수: ${program.matchScore.toFixed(2)}

위 정보를 종합적으로 분석하여 이 기업과 지원사업의 매칭도를 평가해주세요.
`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async waitForVectorStoreReady(vectorStoreId: string): Promise<void> {
    const maxWaitTime = 300000; // 5분 최대 대기
    const checkInterval = 5000; // 5초마다 확인
    const startTime = Date.now();

    this.logger.log(`Vector Store 준비 상태 확인 시작: ${vectorStoreId}`);

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const vectorStore = await this.client.vectorStores.retrieve(vectorStoreId);

        this.logger.debug(`Vector Store 상태: ${vectorStore.status}, 파일 카운트: ${JSON.stringify(vectorStore.file_counts)}`);

        if (vectorStore.status === 'completed') {
          this.logger.log(`Vector Store 준비 완료: ${vectorStoreId}`);
          return;
        }

        if (vectorStore.status === 'expired') {
          throw new Error(`Vector Store가 만료되었습니다: ${vectorStoreId}`);
        }

        // 5초 대기 후 재확인
        await this.delay(checkInterval);

      } catch (error) {
        this.logger.error(`Vector Store 상태 확인 실패: ${error.message}`);
        throw error;
      }
    }

    throw new Error(`Vector Store 준비 시간 초과: ${vectorStoreId}`);
  }

  async uploadAndCreateVectorStore(filePath: string): Promise<VectorStoreInfo> {
    this.logger.log(`파일 업로드 및 Vector Store 생성 시작: ${filePath}`);

    try {
      // 1. 파일 업로드
      const file = await this.client.files.create({
        file: createReadStream(filePath),
        purpose: 'assistants'
      });

      this.logger.log(`파일 업로드 완료: ${file.id}`);

      // 2. Vector Store 생성
      const vectorStore = await this.client.vectorStores.create({
        name: '정부 지원사업 데이터베이스',
        file_ids: [file.id],
        metadata: {
          type: 'support_programs',
          created_at: new Date().toISOString()
        }
      });

      this.logger.log(`Vector Store 생성 완료: ${vectorStore.id}`);

      // 3. Vector Store가 완전히 처리될 때까지 대기
      await this.waitForVectorStoreReady(vectorStore.id);

      // 4. Assistant 생성/업데이트
      const assistantId = await this.createOrUpdateAssistant(vectorStore.id);

      // 현재 상태 업데이트
      this.currentVectorStoreId = vectorStore.id;
      this.currentAssistantId = assistantId;

      return {
        fileId: file.id,
        vectorStoreId: vectorStore.id,
        assistantId
      };

    } catch (error) {
      this.logger.error('파일 업로드 및 Vector Store 생성 실패:', error);
      throw error;
    }
  }

  async createOrUpdateAssistant(vectorStoreId: string): Promise<string> {
    const assistantConfig = {
      name: "정부 지원사업 매칭 전문가",
      instructions: "당신은 정부 지원사업 매칭 전문가입니다. 기업 정보와 지원사업을 분석하여 최적의 매칭을 제공해주세요.",
      model: "gpt-4o",
      tools: [{ type: "file_search" as const }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStoreId]
        }
      }
    };

    try {
      if (this.currentAssistantId) {
        // 기존 Assistant 업데이트
        const assistant = await this.client.beta.assistants.update(
          this.currentAssistantId,
          assistantConfig
        );
        this.logger.log(`Assistant 업데이트 완료: ${assistant.id}`);
        return assistant.id;
      } else {
        // 새 Assistant 생성
        const assistant = await this.client.beta.assistants.create(assistantConfig);
        this.logger.log(`Assistant 생성 완료: ${assistant.id}`);
        return assistant.id;
      }
    } catch (error) {
      this.logger.error('Assistant 생성/업데이트 실패:', error);
      throw error;
    }
  }

  async searchAndAnalyzeWithAssistant(requestData: MatchingRequestDto): Promise<MatchingAnalysis[]> {
    if (!this.currentAssistantId || !this.currentVectorStoreId) {
      throw new Error('Assistant 또는 Vector Store가 설정되지 않았습니다. 먼저 데이터를 업로드해주세요.');
    }

    this.logger.log('Assistant 기반 프로그램 검색 및 매칭 분석 시작');

    try {
      // 1. Thread 생성
      const thread = await this.client.beta.threads.create();
      this.logger.log(`Thread 생성 완료: ${thread.id}`);

      // 2. 검색 쿼리 생성
      const searchQuery = this.buildSearchQuery(requestData);

      // 3. 메시지 추가
      await this.client.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: searchQuery
      });

      // 4. Run 실행
      const run = await this.client.beta.threads.runs.create(thread.id, {
        assistant_id: this.currentAssistantId,
        instructions: '기업 정보와 가장 적합한 지원사업을 찾아 매칭 분석을 수행해주세요. 구체적인 매칭 점수와 이유를 제시해주세요.'
      });

      // 5. Run 완료 대기
      const completedRun = await this.waitForRunCompletion(thread.id, run.id);

      // 6. 응답 메시지 조회
      const messages = await this.client.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');

      if (!assistantMessage) {
        throw new Error('Assistant 응답을 찾을 수 없습니다.');
      }

      // 7. 응답 파싱 및 매칭 분석 결과 반환
      const analysisResult = this.parseAssistantResponse(assistantMessage);

      this.logger.log(`Assistant 분석 완료: ${analysisResult.length}개 결과`);

      return analysisResult;

    } catch (error) {
      this.logger.error('Assistant 기반 분석 실패:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5
      });

      return !!completion.choices[0]?.message?.content;
    } catch (error) {
      this.logger.error('OpenAI 연결 테스트 실패:', error);
      return false;
    }
  }

  getCurrentVectorStoreId(): string | null {
    return this.currentVectorStoreId;
  }

  getCurrentAssistantId(): string | null {
    return this.currentAssistantId;
  }

  setCurrentVectorStoreId(vectorStoreId: string): void {
    this.currentVectorStoreId = vectorStoreId;
  }

  setCurrentAssistantId(assistantId: string): void {
    this.currentAssistantId = assistantId;
  }

  isInitialized(): boolean {
    return !!(this.currentVectorStoreId && this.currentAssistantId);
  }

  getInitializationStatus(): {
    isInitialized: boolean;
    vectorStoreId: string | null;
    assistantId: string | null;
  } {
    return {
      isInitialized: this.isInitialized(),
      vectorStoreId: this.currentVectorStoreId,
      assistantId: this.currentAssistantId
    };
  }

  private buildSearchQuery(requestData: MatchingRequestDto): string {
    const establishedYear = parseInt(requestData.establishedYear);
    const companyAge = new Date().getFullYear() - establishedYear;

    return `
다음 기업 정보에 가장 적합한 정부 지원사업을 찾아 분석해주세요:

기업 정보:
- 회사명: ${requestData.companyName}
- 사업 목적: ${requestData.businessPurpose}
- 사업자 유형: ${requestData.businessType}
- 설립연도: ${requestData.establishedYear} (${companyAge}년차)
- 직원 수: ${requestData.employees}
- 연매출: ${requestData.annualRevenue}
- 소재지: ${requestData.region}
- 지원 시급성: ${requestData.urgency}
- 관심 분야: ${requestData.targetPrograms.join(', ')}

요청사항:
1. 위 기업 정보와 가장 적합한 지원사업 5-10개를 찾아주세요
2. 각 프로그램에 대해 매칭 점수(0.0-1.0)를 산정해주세요
3. 매칭 이유를 3-5개씩 구체적으로 제시해주세요
4. 분석 신뢰도도 함께 제공해주세요

응답 형식은 JSON 배열로 다음과 같이 제공해주세요:
[
  {
    "matchScore": 0.85,
    "matchReasons": ["이유1", "이유2", "이유3"],
    "confidence": 0.9
  }
]
`;
  }

  private async waitForRunCompletion(threadId: string, runId: string): Promise<any> {
    const maxWaitTime = 120000; // 2분 최대 대기
    const checkInterval = 2000; // 2초마다 확인
    const startTime = Date.now();

    this.logger.log(`Run 완료 대기 시작: ${runId}`);

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const run = await this.client.beta.threads.runs.retrieve(runId, {
          thread_id: threadId
        });

        this.logger.debug(`Run 상태: ${run.status}`);

        if (run.status === 'completed') {
          this.logger.log(`Run 완료: ${runId}`);
          return run;
        }

        if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
          throw new Error(`Run 실패: ${run.status} - ${run.last_error?.message || 'Unknown error'}`);
        }

        // 2초 대기 후 재확인
        await this.delay(checkInterval);

      } catch (error) {
        this.logger.error(`Run 상태 확인 실패: ${error.message}`);
        throw error;
      }
    }

    throw new Error(`Run 완료 시간 초과: ${runId}`);
  }

  private parseAssistantResponse(message: any): MatchingAnalysis[] {
    try {
      // 메시지 내용 추출
      const content = message.content[0]?.text?.value || '';

      // JSON 부분 추출 시도
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);

        // 데이터 검증 및 정규화
        return parsedData.map((item: any) => ({
          matchScore: Math.max(0, Math.min(1, item.matchScore || 0.5)),
          matchReasons: Array.isArray(item.matchReasons) ? item.matchReasons : ['분석 결과 파싱 실패'],
          confidence: Math.max(0, Math.min(1, item.confidence || 0.7))
        }));
      }

      // JSON 파싱 실패 시 기본값 반환
      this.logger.warn('Assistant 응답 JSON 파싱 실패, 기본값 반환');
      return [{
        matchScore: 0.7,
        matchReasons: ['Assistant 분석 완료 (응답 파싱 문제로 기본값 제공)'],
        confidence: 0.6
      }];

    } catch (error) {
      this.logger.error('Assistant 응답 파싱 실패:', error);
      return [{
        matchScore: 0.5,
        matchReasons: ['Assistant 응답 파싱 실패'],
        confidence: 0.3
      }];
    }
  }
}