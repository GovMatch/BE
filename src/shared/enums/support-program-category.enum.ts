export enum SupportProgramCategory {
  FINANCE = '01',      // 금융
  TECH = '02',         // 기술
  HR = '03',           // 인력
  EXPORT = '04',       // 수출
  DOMESTIC = '05',     // 내수
  STARTUP = '06',      // 창업
  MANAGEMENT = '07',   // 경영
  OTHER = '09'         // 기타
}

export const SUPPORT_PROGRAM_CATEGORY_LABELS = {
  [SupportProgramCategory.FINANCE]: '금융',
  [SupportProgramCategory.TECH]: '기술',
  [SupportProgramCategory.HR]: '인력',
  [SupportProgramCategory.EXPORT]: '수출',
  [SupportProgramCategory.DOMESTIC]: '내수',
  [SupportProgramCategory.STARTUP]: '창업',
  [SupportProgramCategory.MANAGEMENT]: '경영',
  [SupportProgramCategory.OTHER]: '기타'
} as const;

export type SupportProgramCategoryType = keyof typeof SUPPORT_PROGRAM_CATEGORY_LABELS;