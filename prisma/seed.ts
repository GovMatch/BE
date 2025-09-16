import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('시드 데이터 삽입 시작...');

  // 1. 회사 데이터 생성
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        name: '테크 스타트업',
        bizRegNo: '123-45-67890',
        size: '소기업',
        industry: 'IT/소프트웨어',
        region: '서울',
        foundedAt: new Date('2020-01-01'),
        employees: 15,
      },
    }),
    prisma.company.create({
      data: {
        name: '제조업체',
        bizRegNo: '234-56-78901',
        size: '중기업',
        industry: '제조업',
        region: '경기',
        foundedAt: new Date('2015-05-15'),
        employees: 120,
      },
    }),
  ]);

  // 2. 사용자 데이터 생성
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: '시스템 관리자',
        role: Role.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        email: 'user1@techstartup.com',
        name: '김개발',
        role: Role.USER,
        companyId: companies[0].id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'user2@manufacturing.com',
        name: '이제조',
        role: Role.USER,
        companyId: companies[1].id,
      },
    }),
  ]);

  // 3. 지원기관 데이터 생성
  const providers = await Promise.all([
    prisma.provider.create({
      data: {
        name: '중소벤처기업부',
        type: '정부기관',
        contact: '044-204-7000',
        website: 'https://www.mss.go.kr',
        address: '세종특별자치시 한누리대로 402',
      },
    }),
    prisma.provider.create({
      data: {
        name: '산업통상자원부',
        type: '정부기관',
        contact: '044-203-4000',
        website: 'https://www.motie.go.kr',
        address: '세종특별자치시 한누리대로 402',
      },
    }),
    prisma.provider.create({
      data: {
        name: '농림축산식품부',
        type: '정부기관',
        contact: '044-201-2000',
        website: 'https://www.mafra.go.kr',
        address: '세종특별자치시 다솜2로 94',
      },
    }),
  ]);

  // 4. 지원사업 데이터 생성
  const supportPrograms = await Promise.all([
    prisma.supportProgram.create({
      data: {
        title: '청년창업지원사업',
        providerId: providers[0].id,
        category: '06',
        target: '청년창업자',
        amountMin: 10000000,
        amountMax: 50000000,
        supportRate: 80.0,
        region: '전국',
        deadline: new Date('2024-12-31'),
        applicationUrl: 'https://www.k-startup.go.kr',
        tags: ['창업', '청년', '자금지원'],
        description: '청년층 대상 창업 초기 자금 지원 프로그램',
      },
    }),
    prisma.supportProgram.create({
      data: {
        title: '중소기업 R&D 지원',
        providerId: providers[1].id,
        category: '02',
        target: '중소기업',
        amountMin: 50000000,
        amountMax: 200000000,
        supportRate: 75.0,
        region: '전국',
        deadline: new Date('2024-11-30'),
        applicationUrl: 'https://www.smtech.go.kr',
        tags: ['R&D', '기술개발', '중소기업'],
        description: '중소기업 대상 연구개발 자금 지원',
      },
    }),
    prisma.supportProgram.create({
      data: {
        title: '농업인 소득증대 지원',
        providerId: providers[2].id,
        category: '09',
        target: '농업인',
        amountMin: 5000000,
        amountMax: 30000000,
        supportRate: 70.0,
        region: '전국',
        deadline: new Date('2024-10-31'),
        applicationUrl: 'https://www.rda.go.kr',
        tags: ['농업', '소득증대', '농업인'],
        description: '농업인 대상 소득증대 프로그램 지원',
      },
    }),
  ]);

  // 5. 바우처 데이터 생성
  const vouchers = await Promise.all([
    prisma.voucher.create({
      data: {
        name: '디지털 바우처',
        category: 'IT/디지털',
        budget: 20000000,
        supportRate: 80.0,
        difficulty: '하',
        providerId: providers[0].id,
        period: '12개월',
      },
    }),
    prisma.voucher.create({
      data: {
        name: '컨설팅 바우처',
        category: '경영컨설팅',
        budget: 10000000,
        supportRate: 70.0,
        difficulty: '중',
        providerId: providers[1].id,
        period: '6개월',
      },
    }),
  ]);

  // 6. 매칭 데이터 생성
  const matchings = await Promise.all([
    prisma.matching.create({
      data: {
        userId: users[1].id,
        itemType: 'program',
        itemId: supportPrograms[0].id,
        fitScore: 85.5,
        reasons: ['청년 창업자 조건 만족', 'IT 업종 일치', '소기업 규모 적합'],
      },
    }),
    prisma.matching.create({
      data: {
        userId: users[2].id,
        itemType: 'program',
        itemId: supportPrograms[1].id,
        fitScore: 78.2,
        reasons: ['중기업 규모 적합', '제조업 업종 일치', 'R&D 필요성 높음'],
      },
    }),
    prisma.matching.create({
      data: {
        userId: users[1].id,
        itemType: 'voucher',
        itemId: vouchers[0].id,
        fitScore: 92.0,
        reasons: ['IT 업종 완벽 일치', '디지털 전환 필요', '예산 범위 적합'],
      },
    }),
  ]);

  console.log('생성된 데이터:');
  console.log(`- 회사: ${companies.length}개`);
  console.log(`- 사용자: ${users.length}명`);
  console.log(`- 지원기관: ${providers.length}개`);
  console.log(`- 지원사업: ${supportPrograms.length}개`);
  console.log(`- 바우처: ${vouchers.length}개`);
  console.log(`- 매칭: ${matchings.length}개`);
  
  console.log('시드 데이터 삽입 완료!');
}

main()
  .catch((e) => {
    console.error('시드 데이터 삽입 중 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });