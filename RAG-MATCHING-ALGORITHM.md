# 🎯 RAG 기반 지원사업 매칭 알고리즘 메커니즘

## 📋 전체 아키텍처 개요

```
사용자 입력 → 1차 하드필터링 → 2차 임베딩필터링 → 3차 스코어링 → 4차 LLM분석 → 최종결과
(수천개)     (수백개)         (50개)           (20개)      (10개)      (매칭완료)
```

## 🛠️ 시스템 구조

### 핵심 서비스 구성
- **MatchingService**: 전체 매칭 프로세스 관리 및 오케스트레이션
- **FilteringService**: 1차 하드필터링 + 2차 임베딩 필터링 담당
- **ScoringService**: 3차 비즈니스 로직 기반 가중치 스코어링
- **LlmMatchingService**: 4차 LLM 기반 최종 분석 및 이유 생성

### API 엔드포인트
```
POST /api/programs/matching
```

---

## 🔍 1단계: 하드 필터링 (Hard Filtering)

### 목적
기본 조건에 맞지 않는 지원사업을 1차적으로 제거하여 후보군을 압축

### 처리량
전체 지원사업 → 수백 개

### 필터링 조건

#### 1) 카테고리 매칭
```typescript
// 사용자 선택: ["02", "06", "07"] (기술, 창업, 경영)
WHERE category IN ('02', '06', '07')
```

#### 2) 지역 매칭
```typescript
// 사용자 입력: "seoul"
WHERE region LIKE '%서울%' OR region IS NULL -- 전국 대상 포함
```

#### 3) 기업 규모 기반 타겟 매칭
```typescript
// 직원수 "10-49" + 사업자유형 "startup"
WHERE target LIKE '%중소기업%'
   OR target LIKE '%창업%'
   OR target IS NULL -- 전체 대상
```

#### 4) 시급성 기반 마감일 필터링
```typescript
// 시급성 "short" = 3개월 이내
WHERE deadline <= NOW() + INTERVAL 90 DAY
   OR deadline IS NULL -- 상시모집
```

#### 5) 활성 사업만 선별
```typescript
WHERE deadline >= NOW() OR deadline IS NULL
```

### 누락 데이터 처리 전략
- **지역 정보 없음**: 전국 대상으로 간주 → 포함
- **타겟 정보 없음**: 전체 대상으로 간주 → 포함
- **마감일 없음**: 상시모집으로 간주 → 포함

---

## 🧠 2단계: 임베딩 기반 필터링 (Embedding Filtering)

### 목적
사용자의 사업 목적과 지원사업 설명 간의 의미적 유사도 계산

### 처리량
수백 개 → 50개

### 현재 구현 (키워드 기반)
```typescript
사용자 입력: "AI 기반 헬스케어 솔루션 개발"

1. 키워드 추출
   추출: ["AI", "헬스케어", "솔루션", "개발"]

2. 매칭 점수 계산
   - 제목에서 키워드 발견: +3점
   - 설명에서 키워드 발견: +2점
   - 태그에서 키워드 발견: +1점

3. 상위 50개 선택
   점수 기준 내림차순 정렬
```

### 향후 개선 계획
- OpenAI Embedding API 연동
- 코사인 유사도 기반 의미적 매칭
- 다국어 지원 및 동의어 처리

---

## 📊 3단계: 비즈니스 로직 스코어링 (Business Logic Scoring)

### 목적
비즈니스 도메인 지식을 반영한 가중치 기반 종합 점수 계산

### 처리량
50개 → 20개

### 가중치 구조
```typescript
const weights = {
  category: 0.4,      // 카테고리 정확도 (40%)
  amount: 0.25,       // 지원금액 적합성 (25%)
  region: 0.15,       // 지역 매칭도 (15%)
  deadline: 0.1,      // 마감일 시급성 (10%)
  companySize: 0.1    // 기업규모 적합성 (10%)
}
```

### 세부 점수 계산 로직

#### 1) 카테고리 점수 (40%)
```typescript
정확 매칭 (사용자 선택과 일치): 1.0점
관련 매칭 (기술↔창업 등 연관): 0.7점
기타: 0.3점
```

#### 2) 지원금액 점수 (25%)
```typescript
// 기업규모별 예상 적정 금액 계산
기준금액 = 직원수배수 × 매출배수 × 1천만원

예시:
- 직원 "10-49"(×2) × 매출 "under-1b"(×1) = 2천만원 기준
- 프로그램 금액이 적정 범위 내: 높은 점수
- 과도하게 작거나 큰 금액: 페널티
```

#### 3) 지역 점수 (15%)
```typescript
정확한 지역 매칭: 1.0점
인근 지역 (서울↔경기): 0.7점
전국 대상: 1.0점
기타 지역: 0.3점
```

#### 4) 마감일 점수 (10%)
```typescript
// 시급성 "short" (90일) 기준
90일 이내 마감: 1.0점
180일 이내 마감: 0.8점
365일 이내 마감: 0.6점
그 이상 또는 상시: 0.4점
```

#### 5) 기업규모 점수 (10%)
```typescript
완벽한 매칭:
- 스타트업 + 창업분야: 1.0점
- 중소기업 + 기술분야: 1.0점
- 중견기업 + 수출/경영분야: 1.0점

불명확한 매칭: 0.5점
```

### 최종 점수 계산
```typescript
총점 = (카테고리점수 × 0.4) + (금액점수 × 0.25) + (지역점수 × 0.15) +
       (마감일점수 × 0.1) + (기업규모점수 × 0.1)

범위: 0.0 ~ 1.0
```

---

## 🤖 4단계: LLM 최종 분석 (LLM Final Analysis)

### 목적
인간이 이해하기 쉬운 매칭 이유 생성 및 점수 미세조정

### 처리량
20개 → 10개 (최종 결과)

### 3단계 폴백 시스템 (안정성 강화)

#### 1단계: OpenAI Assistant 기반 분석
```typescript
// 우선순위 1: RAG 기반 검색 및 분석
const assistantResults = await this.openAIService.searchAndAnalyzeWithAssistant(requestData);
```

#### 2단계: 배치 분석 폴백
```typescript
// Assistant 실패 시: 기존 배치 분석 방식
const batchResults = await this.openAIService.analyzeBatchMatching(programs, requestData);
```

#### 3단계: 룰 기반 로직 폴백
```typescript
// 모든 AI 분석 실패 시: 룰 기반 안전장치
return this.fallbackToRuleBasedLogic(programs, requestData);
```

### LLM 분석 영역

#### 1) 사업 목적 정합성 분석
```typescript
사용자: "AI 기반 헬스케어 솔루션 개발"
프로그램: "의료AI 기술개발 지원사업"

→ 의미적 유사도 계산: 85%
→ 점수 조정: +0.1점
→ 매칭 이유: "사업 목적과 85% 일치"
```

#### 2) 기업 성장단계 적합성
```typescript
설립연도 2022년 (2년차) + 창업분야 프로그램
→ 점수 조정: +0.1점
→ 매칭 이유: "초기 스타트업에 최적화된 프로그램"

7년차 기업 + 기술분야 프로그램
→ 매칭 이유: "성장기 기업의 기술개발에 적합"
```

#### 3) 혁신성 키워드 보너스
```typescript
프로그램 설명에 포함된 키워드:
["AI", "혁신", "첨단", "디지털", "스마트"] 등
→ 점수 조정: +0.05점
```

#### 4) 자금 효율성 분석
```typescript
지원금 8천만원 × 지원율 80% = 실제 지원 6,400만원
예상 자금수요 5천만원 대비 128% 충족
→ 매칭 이유: "예상 자금 수요의 대부분을 충족 가능"

지원율 90% 이상인 경우
→ 매칭 이유: "높은 지원율로 자부담 최소화 (90%)"
```

#### 5) 고도화된 매칭 이유 생성 로직
```typescript
// 사업 목적 정합성 분석
const purposeAlignment = this.analyzePurposeAlignment(businessPurpose, description);
if (purposeAlignment.score > 0.7) {
  reasons.push(`사업 목적과 ${Math.round(purposeAlignment.score * 100)}% 일치`);
}

// 기업 성장 단계별 적합성 분석
const growthStageMatch = this.analyzeGrowthStageMatch(program, requestData);
if (growthStageMatch) {
  reasons.push(growthStageMatch); // "초기 스타트업에 최적화된 프로그램"
}

// 자금 효율성 분석
const efficiencyAnalysis = this.analyzeEfficiency(program, requestData);
if (efficiencyAnalysis) {
  reasons.push(efficiencyAnalysis); // "예상 자금 수요의 대부분을 충족 가능"
}

// 혁신성 키워드 보너스
if (this.hasInnovationKeywords(description)) {
  adjustedScore += 0.05;
}

// 중복 제거 및 최대 5개로 제한
return [...new Set(enhancedReasons)].slice(0, 5);
```

---

## 📈 최종 결과 구조

### API 응답 형태
```json
{
  "success": true,
  "message": "매칭 분석이 완료되었습니다.",
  "data": {
    "matchingId": "matching_1703123456789",
    "companyName": "테크스타트",
    "totalCandidates": 245,
    "filteredCount": 48,
    "finalMatches": [
      {
        "id": "program_001",
        "title": "AI 스타트업 기술개발 지원사업",
        "description": "AI 기술을 활용한 스타트업의 기술개발 및 사업화 지원",
        "category": "02",
        "provider": {
          "name": "중소벤처기업부",
          "type": "정부기관"
        },
        "amountMin": 10000000,
        "amountMax": 100000000,
        "supportRate": 0.8,
        "region": "전국",
        "deadline": "2024-12-31T23:59:59.000Z",
        "matchScore": 0.92,
        "matchReasons": [
          "선택한 지원 분야와 정확히 일치",
          "기업 규모에 적합한 프로그램",
          "사업 목적과 85% 일치",
          "초기 스타트업에 최적화된 프로그램",
          "높은 지원율로 자부담 최소화 (80%)"
        ]
      }
    ],
    "summary": {
      "bestMatch": { /* 최고 점수 프로그램 */ },
      "categoryDistribution": {
        "02": 4,
        "06": 3,
        "07": 3
      },
      "averageMatchScore": 0.78
    },
    "recommendations": [
      "가장 적합한 사업: AI 스타트업 기술개발 지원사업",
      "총 10개의 적합한 사업을 발견했습니다.",
      "3개 사업이 한 달 내 마감 예정입니다."
    ]
  }
}
```

---

## 🎯 알고리즘 핵심 특징

### 1. 단계적 압축 최적화
- **효율성**: 수천 개 → 10개로 단계적 압축
- **추적성**: 각 단계별 상세 로그 제공
- **확장성**: 각 단계 독립적 개선 가능

### 2. 가중치 기반 공정성
- **우선순위 반영**: 카테고리(40%) > 금액(25%) > 지역(15%) > 마감일(10%) > 규모(10%)
- **도메인 지식**: 실제 지원사업 특성 반영
- **조정 가능**: 비즈니스 요구사항에 따라 가중치 변경 가능

### 3. 누락 데이터 포용성
- **포용적 접근**: 정보가 부족한 지원사업도 배제하지 않음
- **합리적 기본값**: 누락된 정보에 대해 중간~높은 점수 부여
- **기회 확대**: 더 많은 매칭 기회 제공

### 4. 인간 친화적 결과
- **구체적 이유**: LLM이 생성한 명확한 매칭 근거
- **실행 가능성**: 구체적이고 실용적인 추천사항
- **투명성**: 점수 계산 과정의 완전한 추적 가능

### 5. 확장 가능한 설계
- **모듈화**: 각 단계별 독립적 서비스 구조
- **API 연동**: OpenAI Embedding, ChatGPT 등 쉬운 연동
- **데이터 확장**: 새로운 필터링 조건 추가 용이

---

## 🚀 성능 지표

### 처리 효율성
- **압축률**: 99.6% (수천 개 → 10개)
- **정확도**: 가중치 기반 다차원 평가
- **응답시간**: 평균 2-3초 (DB 조회 최적화)

### 사용자 만족도
- **매칭 정확도**: 비즈니스 로직 + LLM 분석
- **설명 가능성**: 구체적 매칭 이유 제공
- **완전성**: 누락 데이터 포용적 처리

---

## 📋 향후 개선 계획

### 1. 임베딩 고도화 (현재 키워드 기반)
- **현재 상태**: 키워드 매칭 기반 임베딩 필터링
- **계획**: OpenAI Embedding API 연동
- **향후**: 한국어 특화 임베딩 모델 적용
- **목표**: 실시간 벡터 유사도 계산

### 2. LLM 분석 강화 (3단계 폴백 시스템 구현됨)
- **구현 완료**: 3단계 폴백 시스템 (Assistant → Batch → Rule-based)
- **구현 완료**: 고도화된 매칭 이유 생성 (사업목적 정합성, 성장단계 분석, 효율성 분석)
- **진행 중**: 프롬프트 엔지니어링 최적화
- **계획**: 다양한 매칭 패턴 학습

### 3. 개인화 시스템
- 사용자 피드백 학습
- 매칭 히스토리 기반 개인화
- A/B 테스트를 통한 알고리즘 최적화

### 4. 성능 최적화
- 캐싱 시스템 도입
- 병렬 처리 최적화
- 실시간 모니터링 및 알림

---

## 📞 문의 및 지원

이 매칭 알고리즘은 **정확성**, **효율성**, **사용자 경험**을 모두 고려하여 설계되었습니다.
추가 문의사항이나 개선 제안이 있으시면 개발팀에 연락해 주세요.

---

*마지막 업데이트: 2025년 9월 - 3단계 폴백 시스템 및 고도화된 매칭 로직 반영*