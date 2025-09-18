# Task 1: 핵심 매칭 시스템 구현

## 목적

정부지원사업 매칭 에이전트의 핵심 기능인 AI 상담 플로우와 매칭 알고리즘을 구현하여 사용자가 3단계 질문을 통해 맞춤형 지원사업을 추천받을 수 있도록 합니다.

## 범위

- 프로젝트 기본 설정 및 환경 구성
- AI 상담 3단계 플로우 구현
- 기업정보 입력 시스템 구현
- 기본 매칭 알고리즘 개발
- 매칭 결과 표시 화면 구현

## 개발 기간

2주 (Phase 1)

---

## 서브태스크

### 1. 프로젝트 기본 설정

- [x] Prisma 스키마 설계 및 초기 마이그레이션
- [x] 기본 NestJS 모듈 구조 생성 (auth, company, program, matching)
- [x] 환경변수 설정 (.env 파일 구성)
- [x] 기본 API 라우팅 설정

### 2. AI 상담 플로우 구현

- [x] AI 상담 DTO 정의 (필요한 지원 유형, 시기, 기업정보)
- [ ] 3단계 질문 컨트롤러 구현
  - [ ] Step 1: 지원 유형 선택 API (자금/기술/판로/인력)
  - [ ] Step 2: 필요 시기 선택 API (1개월/3개월/6개월/상시)
  - [ ] Step 3: 기업 기본정보 입력 API
- [ ] 상담 세션 관리 로직 구현
- [ ] 입력 데이터 검증 및 에러 처리

### 3. 기업정보 입력 시스템

- [x] Company 엔티티 및 서비스 구현
- [x] 사업자번호 기반 기업정보 조회 API 연동
  - [x] 외부 API 연동 서비스 구현
  - [x] 기업정보 자동 매핑 로직
- [ ] 기업정보 저장 및 업데이트 기능
- [ ] 기업 특성 자동 분류 로직 (청년기업, 소상공인 등)

### 4. 기본 매칭 알고리즘

- [x] SupportProgram 엔티티 및 서비스 구현
- [x] 정부지원사업 데이터 수집 시스템 구현
- [x] 데이터 매핑 및 변환 로직 구현
- [x] 스케줄러를 통한 자동 동기화 시스템
- [ ] 매칭 알고리즘 핵심 로직 개발
  - [ ] 자격요건 검증 로직
  - [ ] 마감임박 우선순위 계산
  - [ ] 매칭 점수 계산 알고리즘
- [ ] 우선순위 정렬 및 필터링 기능
- [ ] 매칭 결과 캐싱 구현

### 5. FE용 지원사업 조회 API

- [ ] 지원사업 리스트 조회 API (GET /api/programs)
- [ ] 지원사업 상세 조회 API (GET /api/programs/:id)
- [ ] 지원사업 검색/필터링 API (GET /api/programs/search)
- [ ] 카테고리 목록 조회 API (GET /api/programs/categories)
- [ ] 페이지네이션 및 정렬 기능
- [ ] 응답 데이터 최적화 (필요한 필드만 선택)

### 6. 매칭 결과 표시 화면

- [ ] 매칭 결과 API 응답 DTO 설계
- [ ] 매칭 결과 조회 컨트롤러 구현
- [ ] 추천 이유 생성 로직
- [ ] 마감일 D-day 계산 기능
- [ ] 페이지네이션 구현

### 7. 테스트 및 검증

- [ ] 단위 테스트 작성 (서비스 레이어)
- [ ] 통합 테스트 작성 (API 엔드포인트)
- [ ] 매칭 알고리즘 정확도 테스트
- [ ] 성능 테스트 (응답 시간 3분 이내)

---

## 기술적 요구사항

### API 엔드포인트

```typescript
// AI 상담 및 매칭
POST /api/consultation/step1    # 지원 유형 선택
POST /api/consultation/step2    # 필요 시기 선택
POST /api/consultation/step3    # 기업정보 입력
POST /api/matching             # 매칭 실행
GET  /api/matching/results     # 매칭 결과 조회

// FE용 지원사업 조회
GET  /api/programs             # 지원사업 리스트 조회
GET  /api/programs/:id         # 지원사업 상세 조회
GET  /api/programs/search      # 검색/필터링
GET  /api/programs/categories  # 카테고리 목록

// 관리자용 (기존)
POST /admin/sync/manual        # 수동 동기화
GET  /admin/sync/status        # 동기화 상태
```

### 데이터베이스 스키마

```prisma
model ConsultationSession {
  id          String   @id @default(cuid())
  supportType String   # 자금/기술/판로/인력
  timeline    String   # 1month/3months/6months
  companyInfo Json     # 기업정보
  results     Json?    # 매칭 결과
  createdAt   DateTime @default(now())
}

model Company {
  id            String @id @default(cuid())
  businessNumber String @unique
  name          String
  industry      String
  foundedYear   Int
  employeeCount Int?
  isYouthCompany Boolean @default(false)
  isSmallBusiness Boolean @default(false)
}

model SupportProgram {
  id           String   @id @default(cuid())
  title        String
  organization String
  category     String
  maxAmount    Int
  deadline     DateTime
  eligibility  Json     # 자격요건
  isActive     Boolean  @default(true)
}
```

### 매칭 알고리즘 로직

```typescript
interface MatchingCriteria {
  supportType: "funding" | "tech" | "marketing" | "hr";
  timeline: "1month" | "3months" | "6months";
  companyProfile: CompanyProfile;
}

interface MatchingResult {
  programId: string;
  matchScore: number;
  daysLeft: number;
  reasons: string[];
  eligibilityChecks: Record<string, boolean>;
}
```

---

## 완료 기준

1. **기능적 완료**

   - [ ] 3단계 AI 상담 플로우가 정상 작동
   - [ ] 기업정보 자동 조회 및 저장 기능 완료
   - [ ] 매칭 알고리즘이 정확한 결과 반환
   - [ ] 매칭 결과가 우선순위대로 정렬되어 표시

2. **성능 기준**

   - [ ] 매칭 결과 응답 시간 3분 이내
   - [ ] 동시 접속 100명 처리 가능
   - [ ] 매칭 정확도 테스트 통과

3. **코드 품질**
   - [ ] TypeScript 타입 안전성 확보
   - [ ] 에러 처리 및 로깅 구현
   - [ ] 코드 리뷰 완료

---

## 다음 태스크와의 연결점

이 태스크 완료 후 **Task 2: 신청서 자동생성**에서 매칭 결과를 활용하여 신청서를 자동 생성하는 기능을 구현합니다.

### 전달되는 데이터

- 매칭된 지원사업 정보
- 사용자 기업정보
- 매칭 세션 데이터

---

## 주의사항

- MVP 단계이므로 복잡한 AI 분석보다는 룰 기반 매칭에 집중
- 외부 API 연동 시 타임아웃 및 에러 처리 필수
- 캐싱을 통한 성능 최적화 고려
- 실제 정부지원사업 데이터 연동 전까지는 목업 데이터 사용
