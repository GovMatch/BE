## Product Requirements Document

---

## 1. 제품 개요

### 1.1 제품 목적

스타트업과 소상공인이 **ChatGPT/Claude와 달리** 실시간 데이터 기반으로 맞춤형 정부지원사업을 찾고, 신청서까지 자동 생성받을 수 있는 원스톱 서비스

### 1.2 핵심 차별화 포인트

1. **실시간 API 연동**: 마감임박, 신규등록 사업 자동 우선순위 매칭
2. **기업 맞춤 분석**: 사업자등록번호 기반 구체적 강점/약점 분석
3. **신청서 자동생성**: 기업정보가 미리 입력된 신청서 초안 제공
4. **진행상황 추적**: 회원가입 후 신청현황 자동 알림 (MVP 적용 가능)

### 1.3 타겟 사용자

- 정부지원사업을 처음 신청하는 소상공인
- 빠른 자금 지원이 필요한 스타트업

---

## 2. 핵심 기능 (바이브코딩 친화적)

### 2.1 AI 상담 + 실시간 매칭 시스템

### A. 간단한 AI 플로우

```jsx
// 3단계 간단 플로우
const aiFlow = {
  step1: "현재 가장 필요한 지원? (자금/기술/판로/인력)",
  step2: "언제까지 필요? (1개월/3개월/6개월/상시)",
  step3: "기업 기본정보 입력"
}

```

### B. 실시간 우선순위 매칭

```jsx
// 바이브코딩으로 구현 가능한 간단한 우선순위 로직
function prioritizePrograms(programs, userProfile) {
  return programs
    .filter(p => p.deadline > new Date()) // 마감 안 지난 것
    .filter(p => checkEligibility(p, userProfile)) // 자격 요건 부합
    .sort((a, b) => {
      // 마감임박 우선
      if (getDaysLeft(a.deadline) < getDaysLeft(b.deadline)) return -1;
      // 매칭도 점수 우선
      if (a.matchScore > b.matchScore) return -1;
      return 1;
    });
}

```

### 2.2 기업정보 자동분석 (심플 버전)

### A. 사업자번호 기반 자동조회

```jsx
// 공공API 1개만 사용 (복잡하지 않게)
async function getCompanyInfo(businessNumber) {
  const response = await fetch(`/api/company/${businessNumber}`);
  return {
    companyName: response.companyName,
    industry: response.industry,
    foundedYear: response.foundedYear,
    // 3-4개 핵심 정보만
  };
}

```

### B. 간단한 맞춤 분석

```jsx
// 복잡한 ML 없이 룰 베이스로
const analysis = {
  isYouthCompany: (foundedYear > 2020 && ceoAge < 35),
  isSmallBusiness: (employeeCount < 10),
  urgentNeed: userSelectedCategory,
  recommendations: getSimpleRecommendations(companyData)
};

```

### 2.3 신청서 자동생성 시스템

### A. 템플릿 기반 자동생성

```jsx
// 바이브코딩으로 쉽게 구현 가능
function generateApplicationForm(program, companyData) {
  const template = getTemplate(program.id);
  return {
    companyName: companyData.companyName, // 자동입력
    businessNumber: companyData.businessNumber, // 자동입력
    industry: companyData.industry, // 자동입력
    projectTitle: `${companyData.companyName} ${program.category} 프로젝트`, // 자동생성
    // 사용자가 채워야 할 부분은 placeholder로
    projectDescription: "[여기에 사업 내용을 구체적으로 작성해주세요]",
    budget: generateBudgetTemplate(program.maxAmount)
  };
}

```

### B. 선정사례 기반 가이드

```jsx
// 간단한 성공사례 DB
const successCases = {
  "청년창업사관학교": {
    keywords: ["혁신적", "차별화된", "시장성이 높은"],
    budgetTips: "인건비 60%, 개발비 30%, 마케팅비 10%",
    commonMistakes: ["너무 추상적인 계획", "과도한 예산 책정"]
  }
};

```

### 2.4 회원가입 + 진행상황 추적 (MVP 버전)

### A. 간단한 회원 시스템

```jsx
// 바이브코딩 기본 auth 활용
const userSchema = {
  email: String,
  businessNumber: String, // 고유 식별자
  companyName: String,
  applications: [
    {
      programId: String,
      status: "draft" | "submitted" | "selected" | "rejected",
      submittedAt: Date,
      deadline: Date
    }
  ]
};

```

### B. 간단한 알림 시스템

```jsx
// 매일 1회 체크 (복잡한 실시간 X)
function checkUserApplications(userId) {
  const user = getUser(userId);
  const alerts = [];

  user.applications.forEach(app => {
    const daysLeft = getDaysLeft(app.deadline);
    if (daysLeft <= 3) {
      alerts.push(`${app.programName} 마감 ${daysLeft}일 전!`);
    }
  });

  if (alerts.length > 0) {
    sendEmail(user.email, alerts); // 이메일 알림
  }
}

```

---

## 3. 데이터 구조 (바이브코딩 친화적)

### 3.1 사용자 데이터 (심플)

```jsx
// 복잡하지 않게 필수 정보만
const User = {
  id: "string",
  email: "string",
  businessNumber: "string",
  companyInfo: {
    name: "string",
    industry: "string",
    employeeCount: "number",
    foundedYear: "number"
  },
  preferences: {
    urgentNeed: "funding" | "tech" | "marketing" | "hr",
    timeline: "1month" | "3months" | "6months"
  }
};

```

### 3.2 지원사업 데이터 (심플)

```jsx
const SupportProgram = {
  id: "string",
  title: "string",
  organization: "string",
  category: "string",
  maxAmount: "number",
  deadline: "Date",
  eligibility: {
    minEmployees: "number",
    maxEmployees: "number",
    industries: ["string"],
    specialConditions: ["청년기업", "여성기업"]
  },
  applicationTemplate: "string" // 신청서 템플릿
};

```

---

## 4. 화면 구성 (심플)

### 4.1 메인 플로우 (3단계)

```
1. AI 간단 질문 (3개) → 2. 기업정보 입력 → 3. 매칭 결과 + 신청서 생성

```

### 4.2 핵심 화면

### A. AI 상담 화면 (심플)

```html
<div class="ai-chat">
  <h2>🤖 3가지만 알려주세요!</h2>

  <!-- 질문 1 -->
  <div class="question">
    <p>Q1. 지금 가장 필요한 지원은?</p>
    <button onclick="selectNeed('funding')">💰 자금</button>
    <button onclick="selectNeed('tech')">🔬 기술개발</button>
    <button onclick="selectNeed('marketing')">📈 마케팅</button>
  </div>

  <!-- 질문 2 -->
  <div class="question">
    <p>Q2. 언제까지 필요하신가요?</p>
    <button onclick="selectTimeline('1month')">1개월 내</button>
    <button onclick="selectTimeline('3months')">3개월 내</button>
    <button onclick="selectTimeline('6months')">6개월 내</button>
  </div>
</div>

```

### B. 매칭 결과 화면

```html
<div class="results">
  <h2>🎯 맞춤 추천 결과</h2>

  <div class="program-card urgent">
    <span class="badge">🔥 마감임박</span>
    <h3>청년창업 사관학교</h3>
    <p>최대 1억원 | 마감: 3일 후</p>
    <div class="match-reason">
      ✅ 청년기업 조건 부합<br>
      ✅ 자금 니즈 완벽 일치<br>
      ✅ 업종 제한 없음
    </div>
    <button onclick="generateApplication()">📝 신청서 자동생성</button>
  </div>
</div>

```

### C. 신청서 자동생성 화면

```html
<div class="auto-form">
  <h2>📝 신청서가 자동으로 생성되었습니다!</h2>

  <form>
    <!-- 자동 입력된 부분 (수정 가능) -->
    <label>회사명: <input value="{{companyName}}" /></label>
    <label>사업자번호: <input value="{{businessNumber}}" readonly /></label>

    <!-- 사용자가 작성할 부분 -->
    <label>프로젝트 제목:
      <input placeholder="{{companyName}} 혁신 기술 개발 프로젝트" />
    </label>

    <div class="ai-tips">
      <h4>🎯 AI 작성 가이드</h4>
      <ul>
        <li>키워드: "혁신적", "차별화된", "시장성" 포함</li>
        <li>예산: 인건비 60%, 개발비 30%, 마케팅 10%</li>
        <li>주의: 추상적 표현보다 구체적 수치 기재</li>
      </ul>
    </div>

    <button type="submit">신청서 제출하기</button>
  </form>
</div>

```

---

## 5. 기술 스택 (바이브코딩 최적화)

### 5.1 프론트엔드

- **바이브코딩 기본 스택 활용**
- **추가 라이브러리**: Chart.js (간단한 통계용)

### 5.2 백엔드

- **바이브코딩 기본 구조**
- **외부 API**:
    - Bizinfo API (정부지원사업)
    - 금융위원회 API (기업정보 조회)
    - OpenAI API (간단한 텍스트 생성)

### 5.3 데이터베이스

- **바이브코딩 기본 DB 구조 활용**
- **추가 테이블**:
    - users, support_programs, applications, templates

---

## 6. MVP 개발 우선순위

### Phase 1: 핵심 매칭 (2주)

1. AI 간단 질문 (3개)
2. 기업정보 입력
3. 실시간 매칭 결과

### Phase 2: 자동생성 (2주)

1. 신청서 템플릿 시스템
2. 기업정보 자동 입력
3. AI 작성 가이드

### Phase 3: 회원 + 추적 (1주)

1. 간단한 회원가입
2. 신청 현황 저장
3. 이메일 알림

**총 개발기간**: 5주

---

## 7. 성공 지표 (MVP)

### 7.1 핵심 지표

- **매칭 정확도**: 사용자가 실제 클릭한 비율 70% 이상
- **신청서 생성률**: 매칭 결과에서 신청서 생성까지 50% 이상
- **재방문률**: 30% 이상 (회원가입 후)

### 7.2 차별화 지표

- **시간 절약**: 기존 방식 대비 80% 시간 단축
- **완성도**: 자동생성 신청서 완성도 70% 이상

---

## 8. 관리자 페이지 (MVP 버전)

### 8.1 간단한 대시보드

```html
<div class="admin-simple">
  <h2>📊 사용 현황</h2>

  <div class="stats">
    <div>총 사용자: {{totalUsers}}</div>
    <div>오늘 매칭: {{todayMatches}}</div>
    <div>신청서 생성: {{generatedForms}}</div>
  </div>

  <div class="user-list">
    <h3>최근 사용자</h3>
    <table>
      <tr v-for="user in recentUsers">
        <td>{{user.companyName}}</td>
        <td>{{user.industry}}</td>
        <td>{{user.matchCount}}</td>
      </tr>
    </table>
  </div>
</div>

```

### 8.2 템플릿 관리 (심플)

```html
<div class="template-manager">
  <h3>신청서 템플릿 편집</h3>
  <select v-model="selectedProgram">
    <option v-for="program in programs">{{program.title}}</option>
  </select>

  <textarea v-model="template" rows="10">
    회사명: {{companyName}}
    사업자번호: {{businessNumber}}
    프로젝트명: [사용자 입력]
    ...
  </textarea>

  <button @click="saveTemplate">저장</button>
</div>

```

---

## 9. 바이브코딩 구현 팁

### 9.1 핵심 컴포넌트 구조

```
/components
  /AIChat.vue          # 3단계 질문
  /CompanyForm.vue     # 기업정보 입력
  /MatchingResults.vue # 매칭 결과
  /AutoForm.vue        # 신청서 자동생성
  /UserDashboard.vue   # 회원 대시보드

/api
  /matching.js         # 매칭 로직
  /company.js         # 기업정보 조회
  /form-generator.js  # 신청서 생성

```

### 9.2 API 설계 (심플)

```jsx
// 3개 핵심 API만
POST /api/match        # 매칭 실행
GET  /api/company/:bn  # 기업정보 조회
POST /api/generate     # 신청서 생성

```