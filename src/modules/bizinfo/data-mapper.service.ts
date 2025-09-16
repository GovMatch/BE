import { Injectable, Logger } from '@nestjs/common';
import { BizinfoProgramData } from './bizinfo-api.service';
import { SupportProgramCategory } from '../../shared/enums/support-program-category.enum';

export interface MappedProgramData {
  externalId: string;
  title: string;
  category: string;
  target: string;
  description: string;
  deadline: Date | null;
  applicationUrl: string | null;
  attachmentUrl: string | null;
  tags: string[];
  provider: {
    name: string;
    type: string;
    contact: string | null;
  };
}

@Injectable()
export class DataMapperService {
  private readonly logger = new Logger(DataMapperService.name);

  mapBizinfoDataToProgram(data: BizinfoProgramData): MappedProgramData {
    try {
      return {
        externalId: data.pblancId,
        title: this.cleanText(data.pblancNm),
        category: this.mapToSupportProgramCategoryCode(data.pldirSportRealmLclasCodeNm),
        target: data.trgetNm || '전체',
        description: this.cleanHtmlContent(data.bsnsSumryCn),
        deadline: this.parseDeadline(data.reqstBeginEndDe),
        applicationUrl: this.extractApplicationUrl(data),
        attachmentUrl: this.extractAttachmentUrl(data.flpthNm),
        tags: this.parseHashtags(data.hashtags),
        provider: {
          name: data.excInsttNm || data.jrsdInsttNm || '정부기관',
          type: this.determineProviderType(data.jrsdInsttNm),
          contact: this.cleanText(data.refrncNm),
        },
      };
    } catch (error) {
      this.logger.error(`Error mapping data for program ${data.pblancId}:`, error.message);
      throw error;
    }
  }

  private cleanText(text: string | null | undefined): string {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
  }

  private cleanHtmlContent(htmlContent: string | null | undefined): string {
    if (!htmlContent) return '';
    
    // HTML 태그 제거
    let cleaned = htmlContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // 연속된 공백 및 줄바꿈 정리
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    // 너무 긴 설명은 잘라내기 (1000자 제한)
    if (cleaned.length > 1000) {
      cleaned = cleaned.substring(0, 997) + '...';
    }
    
    return cleaned;
  }

  private parseDeadline(dateRange: string | null | undefined): Date | null {
    if (!dateRange) return null;
    
    try {
      // "20250910 ~ 20250917" 형태에서 마감일(끝날짜) 추출
      const endDateMatch = dateRange.match(/(\d{8})\s*$/);
      if (endDateMatch) {
        const dateStr = endDateMatch[1];
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1; // 0-based month
        const day = parseInt(dateStr.substring(6, 8));
        
        const deadline = new Date(year, month, day);
        
        // 유효한 날짜인지 확인
        if (isNaN(deadline.getTime())) {
          this.logger.warn(`Invalid deadline format: ${dateRange}`);
          return null;
        }
        
        return deadline;
      }
      
      // "예산 소진시까지" 같은 경우 null 반환
      if (dateRange.includes('예산') || dateRange.includes('소진')) {
        return null;
      }
      
      this.logger.warn(`Unable to parse deadline: ${dateRange}`);
      return null;
      
    } catch (error) {
      this.logger.warn(`Error parsing deadline "${dateRange}":`, error.message);
      return null;
    }
  }

  private extractApplicationUrl(data: BizinfoProgramData): string | null {
    // 우선순위: pblancUrl > rceptEngnHmpgUrl (공고 상세 페이지를 우선으로)
    if (data.pblancUrl) {
      // 상대 URL인 경우 절대 URL로 변환
      if (data.pblancUrl.startsWith('/')) {
        return `https://www.bizinfo.go.kr${data.pblancUrl}`;
      }
      return data.pblancUrl;
    }
    
    if (data.rceptEngnHmpgUrl) {
      return data.rceptEngnHmpgUrl;
    }
    
    return null;
  }

  private parseHashtags(hashtags: string | null | undefined): string[] {
    if (!hashtags) return [];
    
    try {
      return hashtags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .slice(0, 20); // 최대 20개 태그로 제한
    } catch (error) {
      this.logger.warn(`Error parsing hashtags "${hashtags}":`, error.message);
      return [];
    }
  }

  private extractAttachmentUrl(flpthNm: string | null | undefined): string | null {
    if (!flpthNm) return null;
    
    // 상대 URL인 경우 절대 URL로 변환
    if (flpthNm.startsWith('/')) {
      return `https://www.bizinfo.go.kr${flpthNm}`;
    }
    
    return flpthNm;
  }

  private determineProviderType(jrsdInsttNm: string | null | undefined): string {
    if (!jrsdInsttNm) return '기타';
    
    const instituteName = jrsdInsttNm.toLowerCase();
    
    if (instituteName.includes('부') || instituteName.includes('청')) {
      return '정부기관';
    }
    
    if (instituteName.includes('시') || instituteName.includes('도')) {
      return '지방자치단체';
    }
    
    if (instituteName.includes('공단') || instituteName.includes('진흥원')) {
      return '공공기관';
    }
    
    if (instituteName.includes('협회') || instituteName.includes('조합')) {
      return '협회/단체';
    }
    
    return '기타';
  }

  private mapToSupportProgramCategoryCode(categoryName: string | null | undefined): string {
    if (!categoryName) return SupportProgramCategory.OTHER;

    const category = categoryName.toLowerCase().trim();

    // 금융 관련 키워드
    if (category.includes('금융') || category.includes('자금') || category.includes('투자') ||
        category.includes('융자') || category.includes('대출') || category.includes('보증')) {
      return SupportProgramCategory.FINANCE;
    }

    // 기술 관련 키워드
    if (category.includes('기술') || category.includes('연구') || category.includes('개발') ||
        category.includes('r&d') || category.includes('특허') || category.includes('혁신')) {
      return SupportProgramCategory.TECH;
    }

    // 인력 관련 키워드
    if (category.includes('인력') || category.includes('교육') || category.includes('훈련') ||
        category.includes('채용') || category.includes('고용') || category.includes('인재')) {
      return SupportProgramCategory.HR;
    }

    // 수출 관련 키워드
    if (category.includes('수출') || category.includes('해외') || category.includes('글로벌') ||
        category.includes('국제') || category.includes('무역')) {
      return SupportProgramCategory.EXPORT;
    }

    // 내수 관련 키워드
    if (category.includes('내수') || category.includes('국내') || category.includes('마케팅') ||
        category.includes('판매') || category.includes('홍보')) {
      return SupportProgramCategory.DOMESTIC;
    }

    // 창업 관련 키워드
    if (category.includes('창업') || category.includes('스타트업') || category.includes('예비창업') ||
        category.includes('청년창업')) {
      return SupportProgramCategory.STARTUP;
    }

    // 경영 관련 키워드
    if (category.includes('경영') || category.includes('컨설팅') || category.includes('진단') ||
        category.includes('개선') || category.includes('운영')) {
      return SupportProgramCategory.MANAGEMENT;
    }

    // 기본값: 기타
    return SupportProgramCategory.OTHER;
  }

  mapMultipleProgramsData(dataList: BizinfoProgramData[]): MappedProgramData[] {
    this.logger.log(`Mapping ${dataList.length} programs`);
    
    const mappedData: MappedProgramData[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const data of dataList) {
      try {
        const mapped = this.mapBizinfoDataToProgram(data);
        mappedData.push(mapped);
        successCount++;
      } catch (error) {
        errorCount++;
        this.logger.error(`Failed to map program ${data.pblancId}:`, error.message);
        // 에러가 발생해도 전체 처리를 중단하지 않음
      }
    }
    
    this.logger.log(`Mapping completed: ${successCount} success, ${errorCount} errors`);
    return mappedData;
  }
}