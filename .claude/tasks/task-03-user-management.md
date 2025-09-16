# Task 3: 회원 관리 + 추적 시스템

## 목적
사용자 회원가입/로그인 기능을 구현하고, 신청한 지원사업의 진행상황을 추적하여 지속적인 서비스 이용을 지원합니다.

## 범위
- 간단한 회원가입/로그인 시스템
- 신청 현황 관리 대시보드
- 이메일 알림 시스템

## 개발 기간
1주 (Phase 3)

## 선행 조건
- Task 1 (핵심 매칭 시스템) 완료
- Task 2 (신청서 자동생성) 완료
- 매칭 및 신청서 데이터 활용

---

## 서브태스크

### 1. 회원가입/로그인 시스템
- [ ] User 인증 모듈 구현
- [ ] 이메일 기반 회원가입 API
  - [ ] 이메일 중복 검증
  - [ ] 비밀번호 암호화 저장
  - [ ] 사업자번호 연동 검증
- [ ] 로그인/로그아웃 API 구현
- [ ] JWT 토큰 기반 인증 시스템
- [ ] 비밀번호 재설정 기능

### 2. 사용자 프로필 관리
- [ ] 사용자 프로필 조회/수정 API
- [ ] 기업정보 연동 및 업데이트
- [ ] 알림 설정 관리
- [ ] 계정 삭제 기능

### 3. 신청 현황 관리 대시보드
- [ ] 내 신청 현황 조회 API
- [ ] 신청 상태별 필터링 기능
  - [ ] 작성중/완료/제출/선정/탈락 상태 관리
- [ ] 마감일 기준 정렬 및 D-day 표시
- [ ] 신청서 상세 조회 및 수정 링크
- [ ] 신청 통계 대시보드 (총 신청 수, 선정률 등)

### 4. 이메일 알림 시스템
- [ ] 이메일 서비스 모듈 구현
- [ ] 알림 스케줄러 구현 (매일 배치 실행)
- [ ] 알림 유형별 템플릿 관리
  - [ ] 마감 임박 알림 (3일 전)
  - [ ] 신규 매칭 사업 알림
  - [ ] 진행 상태 변경 알림
- [ ] 알림 설정 관리 (수신 여부, 주기 설정)
- [ ] 이메일 발송 로그 및 실패 처리

### 5. 사용자 대시보드 API
- [ ] 대시보드 메인 화면 API
- [ ] 최근 활동 내역 조회
- [ ] 추천 지원사업 알림
- [ ] 개인화된 통계 정보 제공

### 6. 테스트 및 검증
- [ ] 인증 시스템 보안 테스트
- [ ] 알림 시스템 정확성 테스트
- [ ] 대시보드 성능 테스트
- [ ] 개인정보 보호 검증

---

## 기술적 요구사항

### API 엔드포인트
```typescript
// 인증 관련
POST /api/auth/register           # 회원가입
POST /api/auth/login             # 로그인
POST /api/auth/logout            # 로그아웃
POST /api/auth/refresh           # 토큰 갱신
POST /api/auth/forgot-password   # 비밀번호 재설정

// 사용자 관리
GET  /api/users/profile          # 프로필 조회
PUT  /api/users/profile          # 프로필 수정
GET  /api/users/dashboard        # 대시보드 데이터
PUT  /api/users/notification-settings # 알림 설정

// 신청 현황 관리
GET  /api/users/applications     # 내 신청 현황
GET  /api/users/applications/:id # 신청서 상세
PUT  /api/users/applications/:id/status # 상태 업데이트
GET  /api/users/statistics       # 개인 통계
```

### 데이터베이스 스키마
```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  password          String    # 암호화된 비밀번호
  businessNumber    String    @unique
  isEmailVerified   Boolean   @default(false)
  notificationSettings Json   @default("{\"deadline\": true, \"newPrograms\": true, \"statusUpdate\": true}")

  company           Company?
  applications      Application[]
  consultationSessions ConsultationSession[]
  notifications     Notification[]

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  lastLoginAt       DateTime?
}

model Notification {
  id        String            @id @default(cuid())
  type      NotificationType
  title     String
  content   String
  isRead    Boolean           @default(false)
  isSent    Boolean           @default(false)
  scheduledAt DateTime?
  sentAt    DateTime?

  user      User              @relation(fields: [userId], references: [id])
  userId    String

  createdAt DateTime          @default(now())
}

model UserActivity {
  id        String       @id @default(cuid())
  action    String       # login, match, generate, apply
  details   Json?        # 추가 정보
  ipAddress String?
  userAgent String?

  user      User         @relation(fields: [userId], references: [id])
  userId    String

  createdAt DateTime     @default(now())
}

enum NotificationType {
  DEADLINE_ALERT    # 마감 임박
  NEW_MATCH        # 신규 매칭
  STATUS_UPDATE    # 상태 변경
  WEEKLY_DIGEST    # 주간 요약
}
```

### 인증 시스템
```typescript
interface AuthTokens {
  accessToken: string;   # 15분 유효
  refreshToken: string;  # 7일 유효
}

interface UserSession {
  userId: string;
  email: string;
  businessNumber: string;
  permissions: string[];
}

// JWT Payload
interface JWTPayload {
  sub: string;           # userId
  email: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}
```

### 알림 시스템
```typescript
interface NotificationScheduler {
  checkDeadlineAlerts(): Promise<void>;    # 매일 오전 9시 실행
  sendWeeklyDigest(): Promise<void>;       # 매주 월요일 실행
  processNewMatches(): Promise<void>;      # 신규 매칭 즉시 알림
}

interface EmailTemplate {
  type: NotificationType;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: Record<string, any>;
}
```

---

## 완료 기준

### 1. 기능적 완료
- [ ] 회원가입/로그인 기능 정상 작동
- [ ] 사용자별 신청 현황 정확히 표시
- [ ] 이메일 알림이 정해진 시간에 발송
- [ ] 대시보드에서 개인화된 정보 제공
- [ ] 보안 요구사항 충족

### 2. 성능 기준
- [ ] 로그인 응답 시간 2초 이내
- [ ] 대시보드 로딩 시간 3초 이내
- [ ] 이메일 발송 성공률 95% 이상
- [ ] 동시 접속 100명 처리 가능

### 3. 사용성 기준
- [ ] 회원가입 완료율 80% 이상
- [ ] 재방문률 30% 이상 달성
- [ ] 알림 클릭률 20% 이상

---

## 보안 고려사항

### 1. 인증 보안
- [ ] 비밀번호 복잡성 검증
- [ ] 브루트포스 공격 방지 (로그인 시도 제한)
- [ ] JWT 토큰 보안 설정
- [ ] HTTPS 통신 강제

### 2. 개인정보 보호
- [ ] 개인정보 암호화 저장
- [ ] 데이터 접근 로그 기록
- [ ] 계정 삭제 시 완전 삭제
- [ ] GDPR 준수 (데이터 다운로드/삭제 권리)

### 3. API 보안
- [ ] Rate Limiting 적용
- [ ] CORS 설정
- [ ] 입력값 검증 및 Sanitization
- [ ] SQL Injection 방지

---

## 알림 시나리오

### 1. 마감 임박 알림 (3일 전)
```
제목: [정부지원사업] 청년창업사관학교 마감 3일 전!
내용:
- 신청하신 청년창업사관학교가 3일 후 마감됩니다.
- 신청서 작성 현황: 80% 완료
- 미완성 항목: 사업계획서, 예산계획
- [신청서 완성하기] 버튼
```

### 2. 신규 매칭 알림
```
제목: 새로운 지원사업이 매칭되었습니다!
내용:
- K-스타트업 글로벌 챌린지가 새로 등록되었습니다.
- 매칭도: 85% (기술개발 니즈 일치)
- 지원금액: 최대 5천만원
- 마감일: 2024년 12월 15일
- [상세보기] 버튼
```

### 3. 주간 요약 알림
```
제목: 이번 주 활동 요약
내용:
- 신규 매칭: 3건
- 작성중인 신청서: 2건
- 이번 주 마감 예정: 1건
- 추천 신규 사업: 5건
```

---

## 다음 단계 연결점
이 태스크 완료로 MVP의 모든 핵심 기능이 구현되며, 이후 다음과 같은 확장이 가능합니다:

### 향후 확장 계획
- 관리자 페이지 구현
- 모바일 앱 개발
- 고급 AI 분석 기능
- 결제 시스템 도입
- 파트너사 연동

---

## 성공 지표
- 회원가입률: 매칭 서비스 이용자 중 30% 이상 회원가입
- 재방문률: 회원가입 후 7일 내 30% 이상 재방문
- 알림 효과: 마감 알림 후 신청서 완성률 50% 증가
- 사용자 만족도: 대시보드 사용성 평가 4점 이상 (5점 만점)

## 주의사항
- MVP 단계이므로 복잡한 기능보다는 핵심 기능에 집중
- 개인정보 보호법 준수 필수
- 이메일 스팸 방지를 위한 발송 빈도 조절
- 사용자 피드백 수집 채널 구축