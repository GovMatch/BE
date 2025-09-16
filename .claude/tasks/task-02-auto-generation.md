# Task 2: 신청서 자동생성 시스템

## 목적
매칭된 정부지원사업에 대해 기업정보가 미리 입력된 신청서 초안을 자동 생성하고, AI 가이드를 통해 사용자가 쉽게 완성할 수 있도록 지원합니다.

## 범위
- 신청서 템플릿 시스템 구축
- 기업정보 자동 입력 기능
- AI 기반 작성 가이드 제공
- 신청서 저장/수정 기능

## 개발 기간
2주 (Phase 2)

## 선행 조건
- Task 1 (핵심 매칭 시스템) 완료 필요
- 매칭된 지원사업 정보 및 기업정보 데이터 활용

---

## 서브태스크

### 1. 신청서 템플릿 시스템
- [ ] ApplicationTemplate 엔티티 설계 및 구현
- [ ] 템플릿 관리 서비스 구현
  - [ ] 템플릿 생성/수정/삭제 기능
  - [ ] 지원사업별 템플릿 매핑
- [ ] 템플릿 버전 관리 시스템
- [ ] 기본 템플릿 데이터 시드 구현

### 2. 기업정보 자동 입력
- [ ] 신청서 자동생성 서비스 구현
- [ ] 기업정보 매핑 로직 개발
  - [ ] 회사명, 사업자번호 자동 입력
  - [ ] 업종, 설립연도 자동 매핑
  - [ ] 대표자 정보 자동 입력 (가능한 경우)
- [ ] 프로젝트명 자동 제안 알고리즘
- [ ] 예산 템플릿 자동 생성 기능

### 3. AI 작성 가이드 기능
- [ ] 지원사업별 성공 키워드 데이터베이스 구축
- [ ] AI 가이드 생성 서비스 구현
  - [ ] 키워드 추천 로직
  - [ ] 예산 배분 가이드 생성
  - [ ] 흔한 실수 방지 팁 제공
- [ ] 선정사례 기반 가이드 시스템
- [ ] 실시간 작성 도움말 API

### 4. 저장/수정 기능
- [ ] Application 엔티티 및 서비스 구현
- [ ] 신청서 임시저장 기능
  - [ ] 자동저장 (30초 간격)
  - [ ] 수동저장 기능
- [ ] 신청서 수정 및 버전 관리
- [ ] 신청서 상태 관리 (작성중/완료/제출)

### 5. 신청서 생성 API
- [ ] 신청서 생성 컨트롤러 구현
- [ ] 신청서 조회/수정 API
- [ ] 신청서 미리보기 기능
- [ ] PDF/Word 다운로드 기능 (선택사항)

### 6. 테스트 및 검증
- [ ] 신청서 생성 로직 단위 테스트
- [ ] 템플릿 시스템 통합 테스트
- [ ] AI 가이드 정확성 테스트
- [ ] 자동저장 기능 테스트

---

## 기술적 요구사항

### API 엔드포인트
```typescript
POST /api/applications/generate    # 신청서 자동생성
GET  /api/applications/:id         # 신청서 조회
PUT  /api/applications/:id         # 신청서 수정
POST /api/applications/:id/save    # 임시저장
GET  /api/applications/:id/guide   # AI 가이드 조회
GET  /api/templates/:programId     # 템플릿 조회
POST /api/applications/:id/export  # 다운로드
```

### 데이터베이스 스키마
```prisma
model ApplicationTemplate {
  id          String   @id @default(cuid())
  programId   String
  title       String
  fields      Json     # 필드 정의
  structure   Json     # 템플릿 구조
  version     String   @default("1.0")
  isActive    Boolean  @default(true)
  program     SupportProgram @relation(fields: [programId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Application {
  id          String            @id @default(cuid())
  status      ApplicationStatus @default(DRAFT)
  content     Json              # 신청서 내용
  autoSaveData Json?            # 자동저장 데이터
  templateId  String
  companyId   String
  programId   String
  template    ApplicationTemplate @relation(fields: [templateId], references: [id])
  company     Company           @relation(fields: [companyId], references: [id])
  program     SupportProgram    @relation(fields: [programId], references: [id])
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

model AIGuide {
  id          String   @id @default(cuid())
  programId   String
  category    String   # keywords/budget/tips
  content     Json     # 가이드 내용
  program     SupportProgram @relation(fields: [programId], references: [id])
}

enum ApplicationStatus {
  DRAFT       # 작성중
  COMPLETED   # 작성완료
  SUBMITTED   # 제출완료
  SELECTED    # 선정
  REJECTED    # 탈락
}
```

### 신청서 생성 로직
```typescript
interface ApplicationGenerationRequest {
  programId: string;
  companyId: string;
  matchingSessionId: string;
}

interface GeneratedApplication {
  id: string;
  templateId: string;
  prefilledData: {
    companyName: string;
    businessNumber: string;
    industry: string;
    projectTitle: string;
    budgetTemplate: BudgetBreakdown;
  };
  placeholders: {
    projectDescription: string;
    expectedOutcome: string;
    implementation: string;
  };
  aiGuide: {
    keywords: string[];
    budgetTips: string[];
    commonMistakes: string[];
  };
}
```

### AI 가이드 시스템
```typescript
interface AIGuideData {
  successKeywords: string[];      # "혁신적", "차별화된", "시장성"
  budgetGuidelines: {
    personnel: number;            # 인건비 비율
    development: number;          # 개발비 비율
    marketing: number;            # 마케팅비 비율
    equipment: number;            # 장비비 비율
  };
  writingTips: string[];
  commonMistakes: string[];
  successCases: SuccessCase[];
}
```

---

## 완료 기준

### 1. 기능적 완료
- [ ] 매칭 결과에서 신청서 자동생성 기능 정상 작동
- [ ] 기업정보가 정확히 자동 입력됨
- [ ] AI 가이드가 적절한 조언 제공
- [ ] 임시저장 및 수정 기능 완료
- [ ] 신청서 완성도 70% 이상 달성

### 2. 성능 기준
- [ ] 신청서 생성 시간 5분 이내
- [ ] 자동저장 30초 간격 정상 작동
- [ ] 동시 편집 충돌 방지

### 3. 사용성 기준
- [ ] 사용자가 추가 작성해야 할 부분 명확히 표시
- [ ] AI 가이드 활용도 50% 이상
- [ ] 신청서 생성률 목표 50% 달성

---

## 다음 태스크와의 연결점
이 태스크 완료 후 **Task 3: 회원 관리 시스템**에서 생성된 신청서를 사용자별로 관리하고 진행상황을 추적하는 기능을 구현합니다.

### 전달되는 데이터
- 생성된 신청서 정보
- 신청서 상태 및 진행도
- 사용자별 신청 현황

---

## 주의사항
- 개인정보 보호를 위한 데이터 암호화 고려
- 신청서 템플릿의 유연성 확보 (다양한 지원사업 대응)
- 자동저장 기능의 데이터 손실 방지
- AI 가이드의 정확성과 최신성 유지
- 신청서 다운로드 시 포맷 호환성 확인

## 추가 고려사항
- 신청서 작성 진행률 표시 기능
- 필수/선택 필드 구분 및 검증
- 첨부파일 업로드 기능 (향후 확장)
- 신청서 공유 기능 (팀 내 검토용)

---

## 성공 지표
- 신청서 생성률: 매칭 결과 → 신청서 생성 50% 이상
- 완성도: 자동생성 신청서 완성도 70% 이상
- 사용자 만족도: AI 가이드 유용성 평가 4점 이상 (5점 만점)