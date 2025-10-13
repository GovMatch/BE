# 🗂️ 지원사업 데이터 → Vector Store 업로드 플로우

## 📋 전체 데이터 플로우 개요

```
PostgreSQL DB → JSON 파일 생성 → OpenAI 업로드 → Vector Store 생성 → Assistant 연동 → RAG 검색
```

---

## 🔄 단계별 상세 프로세스

### 1단계: 데이터베이스에서 활성 지원사업 추출

**파일**: `src/modules/programs/services/program-file.service.ts:135-169`

```typescript
// 마감되지 않은 활성 프로그램만 조회
const programs = await this.prisma.supportProgram.findMany({
  where: {
    OR: [
      { deadline: { gte: new Date() } },  // 마감일이 남은 것
      { deadline: null }                  // 상시모집
    ]
  },
  orderBy: [{ deadline: 'asc' }]
});
```

**추출 기준**:
- ✅ 마감일이 현재 날짜 이후인 프로그램
- ✅ 마감일이 null인 상시모집 프로그램
- ❌ 이미 마감된 프로그램은 제외

---

### 2단계: OpenAI 검색 최적화를 위한 JSON 변환

**파일**: `src/modules/programs/services/program-file.service.ts:175-223`

```typescript
const jsonData = programs.map(program => ({
  // 기본 정보
  id: program.id,
  title: program.title,
  description: program.description,
  category: program.categoryName,

  // 포맷팅된 정보
  amount_range: formatAmountRange(min, max),
  support_rate: `${Math.round(rate * 100)}%`,
  region: program.region || '전국',
  deadline: program.deadline ? new Date(program.deadline).toLocaleDateString('ko-KR') : '상시모집',

  // 🎯 핵심: 통합 검색 텍스트
  searchable_text: [
    program.title,
    program.description,
    program.categoryName,
    program.provider.name,
    program.region,
    program.target,
    ...program.tags
  ].filter(Boolean).join(' '),

  // 메타데이터
  metadata: {
    category_id: program.category,
    is_active: program.isActive,
    created_at: program.createdAt,
    updated_at: program.updatedAt
  }
}));
```

**최적화 포인트**:
- `searchable_text`: 모든 중요 정보를 하나의 검색 가능한 문자열로 통합
- `amount_range`: 사용자 친화적인 금액 범위 표시
- `support_rate`: 퍼센트로 변환된 지원율

---

### 3단계: 로컬 JSON 파일 생성

**파일**: `src/modules/programs/services/program-file.service.ts:217-222`

```typescript
// 날짜별 파일명 생성
const timestamp = new Date().toISOString().split('T')[0];
const filename = `support-programs-${timestamp}.json`;
const filePath = path.join(uploadsDir, filename);

// JSON 파일 저장
await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
```

**파일 관리**:
- 📂 저장 위치: `uploads/support-programs-YYYY-MM-DD.json`
- 🗂️ 최신 3개 파일만 유지 (자동 정리)
- 📝 JSON 포맷으로 가독성 있게 저장

---

### 4단계: OpenAI에 파일 업로드 및 Vector Store 생성

**파일**: `src/modules/programs/services/openai.service.ts:255-299`

```typescript
// 1️⃣ 파일을 OpenAI에 업로드
const file = await this.client.files.create({
  file: createReadStream(filePath),
  purpose: 'assistants'
});

// 2️⃣ Vector Store 생성
const vectorStore = await this.client.vectorStores.create({
  name: '정부 지원사업 데이터베이스',
  file_ids: [file.id],
  metadata: {
    type: 'support_programs',
    created_at: new Date().toISOString()
  }
});

// 3️⃣ 벡터화 완료까지 대기 (최대 5분)
await this.waitForVectorStoreReady(vectorStore.id);
```

**Vector Store 특징**:
- 🤖 OpenAI의 벡터 데이터베이스 사용
- 📊 텍스트를 고차원 벡터로 자동 변환
- 🔍 의미적 유사도 검색 지원

---

### 5단계: Assistant와 Vector Store 연동

**파일**: `src/modules/programs/services/openai.service.ts:301-333`

```typescript
const assistant = await this.client.beta.assistants.create({
  name: "정부 지원사업 매칭 전문가",
  instructions: "기업 정보와 지원사업을 분석하여 최적의 매칭을 제공해주세요.",
  model: "gpt-4o",
  tools: [{ type: "file_search" }],
  tool_resources: {
    file_search: {
      vector_store_ids: [vectorStoreId]  // 🔗 Vector Store 연결
    }
  }
});
```

**Assistant 역할**:
- 🧠 지원사업 매칭 전문가 페르소나
- 🔍 Vector Store에서 관련 문서 검색
- 📝 매칭 이유와 점수 생성

---

## 🎯 RAG 검색 메커니즘

### 검색 쿼리 생성

**파일**: `src/modules/programs/services/openai.service.ts:433-466`

```typescript
const searchQuery = `
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
`;
```

### Vector Store 검색 과정

1. **사용자 쿼리 입력** → Assistant에게 전달
2. **Vector Store 검색** → `searchable_text`에서 의미적 유사도 계산
3. **관련 문서 추출** → 가장 유사한 지원사업들 선별
4. **매칭 분석** → LLM이 기업 정보와 지원사업 비교 분석
5. **결과 생성** → 점수와 이유가 포함된 매칭 결과 반환

---

## 🔧 관리 및 운영

### API 엔드포인트

| 엔드포인트 | 설명 | 파일 위치 |
|------------|------|-----------|
| `POST /admin/programs/update` | 수동 데이터 업데이트 | program-admin.controller.ts:63-85 |
| `POST /admin/programs/initialize` | 초기 데이터 설정 | program-admin.controller.ts:194-226 |
| `GET /admin/programs/status` | 업데이트 상태 조회 | program-admin.controller.ts:87-149 |
| `GET /admin/programs/connection/test` | OpenAI 연결 테스트 | program-admin.controller.ts:151-192 |

### 자동화된 업데이트

- **스케줄러**: 정기적으로 DB → Vector Store 동기화
- **수동 트리거**: 관리자가 필요 시 즉시 업데이트
- **상태 모니터링**: 업데이트 성공/실패 로깅

### 에러 처리 및 안정성

```typescript
// Vector Store 준비 상태 확인
while (Date.now() - startTime < maxWaitTime) {
  const vectorStore = await this.client.vectorStores.retrieve(vectorStoreId);

  if (vectorStore.status === 'completed') {
    return; // ✅ 준비 완료
  }

  if (vectorStore.status === 'expired') {
    throw new Error('Vector Store 만료'); // ❌ 실패
  }

  await this.delay(5000); // ⏳ 5초 대기 후 재확인
}
```

**안정성 보장**:
- ⏱️ 최대 5분 대기 시간 설정
- 🔄 주기적 상태 확인 (5초 간격)
- 📝 상세한 로깅 및 에러 추적
- 🛡️ 폴백 메커니즘 구비

---

## 📊 성능 최적화

### 데이터 구조 최적화

1. **통합 검색 텍스트**: 모든 관련 정보를 하나의 필드로 결합
2. **메타데이터 분리**: 검색용 데이터와 관리용 데이터 구분
3. **포맷팅**: 사용자 친화적인 형태로 데이터 변환

### 파일 관리 최적화

1. **날짜별 버전 관리**: 파일명에 타임스탬프 포함
2. **자동 정리**: 오래된 파일 자동 삭제 (최신 3개만 유지)
3. **중복 방지**: 동일 날짜 업데이트 시 기존 파일 덮어쓰기

### Vector Store 최적화

1. **배치 처리**: 여러 문서를 한 번에 벡터화
2. **캐싱**: Vector Store ID와 Assistant ID 메모리 보관
3. **연결 재사용**: 기존 Assistant 업데이트로 리소스 절약

---

## 🔍 모니터링 및 디버깅

### 로그 추적

```typescript
this.logger.log('=== 지원사업 데이터 업데이트 및 OpenAI 동기화 시작 ===');
this.logger.log(`총 ${totalCount}개 중 ${programs.length}개 활성 프로그램 조회`);
this.logger.log(`파일 업로드 완료: ${file.id}`);
this.logger.log(`Vector Store 생성 완료: ${vectorStore.id}`);
this.logger.log(`Vector Store 준비 완료: ${vectorStoreId}`);
this.logger.log(`Assistant 생성/업데이트 완료: ${assistant.id}`);
```

### 상태 확인

- **초기화 상태**: `isInitialized()` - Vector Store와 Assistant 준비 여부
- **연결 상태**: `testConnection()` - OpenAI API 연결 확인
- **업데이트 상태**: `getUpdateStatus()` - 마지막 업데이트 시간 등

---

## 🚀 향후 개선 방향

### 1. 성능 향상
- **증분 업데이트**: 변경된 데이터만 선별적 업데이트
- **압축**: 대용량 데이터 압축 전송
- **병렬 처리**: 다중 Vector Store 동시 처리

### 2. 기능 확장
- **다국어 지원**: 영어/한국어 동시 지원
- **카테고리별 Vector Store**: 분야별 전문화된 검색
- **실시간 동기화**: DB 변경 시 즉시 반영

### 3. 안정성 강화
- **백업 시스템**: Vector Store 백업 및 복구
- **헬스 체크**: 정기적 시스템 상태 점검
- **알림 시스템**: 장애 발생 시 관리자 알림

---

*마지막 업데이트: 2025년 9월 22일*