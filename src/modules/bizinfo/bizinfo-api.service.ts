import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

export interface BizinfoApiResponse {
  jsonArray: BizinfoProgramData[];
}

export interface BizinfoProgramData {
  totCnt: number;
  inqireCo: number;
  pblancId: string;
  pblancNm: string;
  jrsdInsttNm: string;
  excInsttNm: string;
  trgetNm: string;
  pldirSportRealmLclasCodeNm: string;
  pldirSportRealmMlsfcCodeNm: string;
  bsnsSumryCn: string;
  reqstBeginEndDe: string;
  reqstMthPapersCn: string;
  refrncNm: string;
  hashtags: string;
  creatPnttm: string;
  rceptEngnHmpgUrl?: string;
  pblancUrl?: string;
  printFlpthNm?: string;
  printFileNm?: string;
  flpthNm?: string;
  fileNm?: string;
}

export interface BizinfoApiParams {
  searchCnt?: number;
  searchLclasId?: string;
  hashtags?: string;
  pageUnit?: number;
  pageIndex?: number;
}

@Injectable()
export class BizinfoApiService {
  private readonly logger = new Logger(BizinfoApiService.name);
  private readonly baseUrl = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do';
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BIZINFO_ACCESS_KEY');
    if (!this.apiKey) {
      throw new Error('BIZINFO_ACCESS_KEY is not configured');
    }
  }

  async fetchSupportPrograms(params: BizinfoApiParams = {}): Promise<BizinfoProgramData[]> {
    try {
      this.logger.log(`Fetching support programs with params: ${JSON.stringify(params)}`);
      
      const requestParams = {
        crtfcKey: this.apiKey,
        dataType: 'json',
        ...params,
      };

      const response: AxiosResponse<BizinfoApiResponse> = await axios.get(this.baseUrl, {
        params: requestParams,
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.data || !response.data.jsonArray) {
        this.logger.warn('No data received from API');
        return [];
      }

      this.logger.log(`Successfully fetched ${response.data.jsonArray.length} programs`);
      return response.data.jsonArray;
      
    } catch (error) {
      this.logger.error('Error fetching support programs:', error.message);
      if (axios.isAxiosError(error)) {
        this.logger.error('Response data:', error.response?.data);
        this.logger.error('Response status:', error.response?.status);
      }
      throw error;
    }
  }

  async fetchAllSupportPrograms(): Promise<BizinfoProgramData[]> {
    try {
      this.logger.log('Fetching all support programs');
      
      // 전체 데이터 가져오기 (searchCnt를 0으로 설정하면 전체 데이터 제공)
      const allPrograms = await this.fetchSupportPrograms({ searchCnt: 0 });
      
      this.logger.log(`Fetched total ${allPrograms.length} programs`);
      return allPrograms;
      
    } catch (error) {
      this.logger.error('Error fetching all support programs:', error.message);
      throw error;
    }
  }

  async fetchProgramsByCategory(categoryId: string): Promise<BizinfoProgramData[]> {
    try {
      this.logger.log(`Fetching programs by category: ${categoryId}`);
      
      const programs = await this.fetchSupportPrograms({ 
        searchLclasId: categoryId,
        searchCnt: 0 
      });
      
      this.logger.log(`Fetched ${programs.length} programs for category ${categoryId}`);
      return programs;
      
    } catch (error) {
      this.logger.error(`Error fetching programs by category ${categoryId}:`, error.message);
      throw error;
    }
  }

  async fetchProgramsByHashtags(hashtags: string[]): Promise<BizinfoProgramData[]> {
    try {
      const hashtagsParam = hashtags.join(',');
      this.logger.log(`Fetching programs by hashtags: ${hashtagsParam}`);
      
      const programs = await this.fetchSupportPrograms({ 
        hashtags: hashtagsParam,
        searchCnt: 0 
      });
      
      this.logger.log(`Fetched ${programs.length} programs for hashtags: ${hashtagsParam}`);
      return programs;
      
    } catch (error) {
      this.logger.error(`Error fetching programs by hashtags:`, error.message);
      throw error;
    }
  }
}