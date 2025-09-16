# Product Requirements Document (PRD)
## 정부지원사업 매칭 에이전트

---

## 1. Introduction/Overview

**정부지원사업 매칭 에이전트**는 스타트업과 소상공인이 실시간 데이터 기반으로 맞춤형 정부지원사업을 찾고, 신청서까지 자동 생성받을 수 있는 원스톱 서비스입니다.

### 핵심 문제 해결
- 정부지원사업 정보의 분산성과 복잡성
- 기업에 맞는 사업 발굴의 어려움
- 신청서 작성 프로세스의 복잡성과 시간 소요

### 차별화 포인트
- **실시간 API 연동**: 마감임박, 신규등록 사업 자동 우선순위 매칭
- **기업 맞춤 분석**: 사업자등록번호 기반 구체적 강점/약점 분석
- **신청서 자동생성**: 기업정보가 미리 입력된 신청서 초안 제공

---

## 2. Goals

1. **매칭 정확도 70% 이상**: 사용자가 실제 클릭한 추천 사업 비율
2. **신청서 생성률 50% 이상**: 매칭 결과에서 신청서 생성까지 전환율
3. **시간 절약 80%**: 기존 수동 방식 대비 사업 발굴 및 신청서 작성 시간 단축
4. **재방문률 30% 이상**: 회원가입 후 서비스 재사용률
5. **MVP 5주 완성**: 바이브코딩 친화적 구현으로 빠른 출시

---

## 3. User Stories

### 3.1 신규 창업자 (1차 타겟)
- **As a** 정부지원사업을 처음 신청하는 소상공인
- **I want to** 3단계 간단 질문으로 맞춤 사업을 추천받고
- **So that** 복잡한 검색 과정 없이 빠르게 적합한 지원을 받을 수 있다

### 3.2 스타트업 대표 (2차 타겟)
- **As a** 빠른 자금 지원이 필요한 스타트업 대표
- **I want to** 마감임박 사업을 우선순위로 추천받고 신청서까지 자동생성하여
- **So that** 최소한의 시간으로 최대한의 지원 기회를 확보할 수 있다

### 3.3 기존 사업자 (확장 타겟)
- **As a** 지속적인 정부지원을 받고자 하는 기존 사업자
- **I want to** 회원가입 후 내 진행상황을 추적하고 새로운 기회를 알림받아
- **So that** 놓치는 기회 없이 체계적으로 지원사업을 관리할 수 있다

---

## 4. Functional Requirements

### 4.1 AI 상담 시스템
1. **3단계 간단 플로우 제공**
   - 1단계: 필요한 지원 유형 선택 (자금/기술/판로/인력)
   - 2단계: 필요 시기 선택 (1개월/3개월/6개월/상시)
   - 3단계: 기업 기본정보 입력 (사업자번호, 업종 등)

2. **직관적인 UI/UX 제공**
   - 버튼 기반 선택지 제공
   - 진행률 표시
   - 이전 단계 수정 가능

### 4.2 실시간 매칭 시스템
3. **우선순위 기반 매칭 알고리즘**
   - 마감임박 사업 우선 노출
   - 자격요건 부합도 검증
   - 매칭 점수 기반 정렬

4. **맞춤형 추천 결과 제공**
   - 추천 이유 명시 (자격 조건, 니즈 일치도)
   - 마감일 D-day 표시
   - 지원 금액 및 조건 요약

### 4.3 기업정보 자동분석
5. **사업자번호 기반 기업정보 조회**
   - 공공API 연동으로 기업명, 업종, 설립연도 자동 조회
   - 기업 규모 및 특성 자동 분류

6. **맞춤 분석 제공**
   - 청년기업, 소상공인 등 특성 자동 판별
   - 강점/약점 간단 분석
   - 추천 카테고리 제안

### 4.4 신청서 자동생성
7. **템플릿 기반 신청서 생성**
   - 기업정보 자동 입력 (수정 가능)
   - 프로젝트명 자동 제안
   - 예산 템플릿 제공

8. **AI 작성 가이드 제공**
   - 성공 키워드 제안
   - 예산 배분 가이드
   - 흔한 실수 방지 팁

### 4.5 회원 관리 시스템
9. **간단한 회원가입/로그인**
   - 이메일 기반 인증
   - 사업자번호를 고유 식별자로 활용

10. **신청 현황 추적**
    - 신청한 사업 목록 관리
    - 진행 상태 업데이트 (작성중/제출완료/선정/탈락)
    - 마감일 D-day 알림

### 4.6 알림 시스템
11. **이메일 알림 기능**
    - 마감 3일 전 자동 알림
    - 신규 매칭 사업 알림
    - 진행 상황 변경 알림

---

## 5. Non-Goals (Out of Scope)

### MVP에서 제외되는 기능
- **복잡한 실시간 알림**: 이메일 기반 배치 알림만 구현
- **고도화된 AI 분석**: 룰 베이스 분석으로 시작
- **전체 신청서 자동 작성**: 템플릿 기반 초안 제공에 한정
- **결과 추적**: 선정/탈락 결과는 사용자 직접 입력
- **모바일 앱**: 웹 기반으로만 제공
- **결제 시스템**: 무료 서비스로 시작
- **상세 통계/분석**: 기본 대시보드만 제공

---

## 6. Technical Considerations

### 6.1 Backend Architecture (NestJS)
```typescript
// 모듈 구조
src/
  ├── modules/
  │   ├── auth/          # 사용자 인증
  │   ├── company/       # 기업정보 관리
  │   ├── program/       # 지원사업 관리
  │   ├── matching/      # 매칭 알고리즘
  │   ├── application/   # 신청서 관리
  │   └── notification/  # 알림 시스템
  ├── common/
  │   ├── guards/        # 인증 가드
  │   ├── interceptors/  # 로깅, 변환
  │   └── dto/          # 데이터 검증
  └── external/
      ├── bizinfo-api/   # 정부지원사업 API
      └── company-api/   # 기업정보 API
```

### 6.2 Database Schema (Prisma)
```prisma
model User {
  id             String    @id @default(cuid())
  email          String    @unique
  businessNumber String    @unique
  company        Company?
  applications   Application[]
  createdAt      DateTime  @default(now())
}

model Company {
  id           String  @id @default(cuid())
  name         String
  industry     String
  foundedYear  Int
  employeeCount Int?
  user         User    @relation(fields: [userId], references: [id])
  userId       String  @unique
}

model SupportProgram {
  id           String    @id @default(cuid())
  title        String
  organization String
  category     String
  maxAmount    Int
  deadline     DateTime
  eligibility  Json      # 자격요건 JSON
  template     String?   # 신청서 템플릿
  applications Application[]
  isActive     Boolean   @default(true)
}

model Application {
  id        String         @id @default(cuid())
  status    ApplicationStatus @default(DRAFT)
  content   Json?          # 신청서 내용
  user      User           @relation(fields: [userId], references: [id])
  userId    String
  program   SupportProgram @relation(fields: [programId], references: [id])
  programId String
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
}

enum ApplicationStatus {
  DRAFT
  SUBMITTED
  SELECTED
  REJECTED
}
```

### 6.3 API Design
```typescript
// 핵심 API 엔드포인트
POST /api/matching          # 매칭 실행
GET  /api/company/:businessNumber  # 기업정보 조회
POST /api/applications/generate    # 신청서 생성
GET  /api/applications            # 내 신청 현황
POST /api/auth/register           # 회원가입
```

### 6.4 External API Integration
- **Bizinfo API**: 정부지원사업 정보 수집
- **금융위원회 API**: 기업정보 조회
- **OpenAI API**: 신청서 작성 가이드 생성 (선택적)

### 6.5 Performance Considerations
- **캐싱**: Redis를 활용한 매칭 결과 캐싱
- **배치 처리**: 매일 새로운 지원사업 데이터 동기화
- **인덱싱**: 자주 조회되는 필드에 DB 인덱스 설정

---

## 7. Success Metrics

### 7.1 핵심 지표 (KPI)
- **매칭 정확도**: 70% 이상 (사용자 클릭률 기준)
- **신청서 생성률**: 50% 이상 (매칭→생성 전환율)
- **재방문률**: 30% 이상 (회원가입 후 7일 내)
- **완료율**: 80% 이상 (3단계 플로우 완주율)

### 7.2 사용성 지표
- **평균 매칭 시간**: 3분 이내
- **신청서 생성 시간**: 5분 이내
- **오류율**: 5% 미만

### 7.3 비즈니스 지표
- **일일 활성 사용자**: 100명 (1개월 후)
- **누적 회원가입**: 500명 (3개월 후)
- **생성된 신청서**: 200건 (3개월 후)

---

## 8. Open Questions

### 8.1 기술적 질문
1. 외부 API 응답 속도가 느릴 경우 타임아웃 처리 방안?
2. 대용량 지원사업 데이터 실시간 동기화 전략?
3. 신청서 템플릿 버전 관리 방안?

### 8.2 비즈니스 질문
1. 프리미엄 기능 도입 시점 및 가격 정책?
2. 정부기관과의 파트너십 가능성?
3. 지방자치단체 지원사업 확장 우선순위?

### 8.3 사용자 경험 질문
1. 신청서 자동저장 주기 설정?
2. 매칭 결과 개인화 수준 조정?
3. 모바일 최적화 우선순위?

---

## 9. Development Timeline

### Phase 1: 핵심 매칭 (2주)
- AI 상담 플로우 구현
- 기업정보 입력 시스템
- 기본 매칭 알고리즘
- 결과 표시 화면

### Phase 2: 자동생성 (2주)
- 신청서 템플릿 시스템
- 기업정보 자동 입력
- AI 가이드 기능
- 저장/수정 기능

### Phase 3: 회원 + 추적 (1주)
- 회원가입/로그인
- 신청 현황 관리
- 이메일 알림 시스템

**총 개발기간**: 5주