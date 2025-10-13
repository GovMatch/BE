import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../config/prisma.service";
import {
  ProgramQueryDto,
  ProgramResponseDto,
  ProgramListResponseDto,
  CategoryResponseDto,
} from "../dto";
import {
  SupportProgramCategory,
  SUPPORT_PROGRAM_CATEGORY_LABELS,
} from "../../../shared/enums/support-program-category.enum";
import { Prisma } from "@prisma/client";

/**
 * 지원사업 관련 비즈니스 로직을 처리하는 서비스
 *
 * 주요 책임:
 * - 지원사업 데이터 조회 및 필터링
 * - 페이지네이션 처리
 * - 카테고리별 통계 정보 제공
 * - 검색 및 정렬 기능
 * - 데이터 변환 (DB → DTO)
 */
@Injectable()
export class ProgramService {
  private readonly logger = new Logger(ProgramService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 지원사업 목록을 조회하는 메서드 (핵심 비즈니스 로직)
   *
   * 다양한 조건을 통해 지원사업을 조회하고 페이지네이션을 적용합니다.
   * 필터링 조건:
   * - activeOnly: 마감일이 지나지 않은 사업만 (기본값: true)
   * - category: 8개 분야 중 특정 분야만
   * - search: 제목 또는 설명에서 키워드 검색 (대소문자 무관)
   * - region: 지역명으로 필터링
   * - tags: 태그 배열로 필터링 (OR 조건)
   *
   * @param query - 조회 조건 (페이지, 필터, 정렬 등)
   * @returns 지원사업 목록과 페이지네이션 메타데이터
   */
  async findPrograms(query: ProgramQueryDto): Promise<ProgramListResponseDto> {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      region,
      sortBy = "deadline",
      sortOrder = "asc",
      tags,
      activeOnly = true,
    } = query;

    const skip = (page - 1) * limit;

    // 기본 where 조건 구성 - AND 배열로 모든 조건 관리
    const andConditions: Prisma.SupportProgramWhereInput[] = [];

    // 활성 사업만 조회 (마감일이 지나지 않은 것 또는 마감일이 없는 것)
    if (activeOnly) {
      andConditions.push({
        OR: [
          { deadline: { gte: new Date() } }, // 마감일이 현재 이후
          { deadline: null }, // 마감일이 없는 경우
        ],
      });
    }

    // 카테고리 필터
    if (category) {
      andConditions.push({ category });
    }

    // 검색어 필터 (제목 또는 설명에서 검색)
    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    // 지역 필터
    if (region) {
      andConditions.push({ region: { contains: region, mode: "insensitive" } });
    }

    // 태그 필터
    if (tags && tags.length > 0) {
      andConditions.push({ tags: { hasSome: tags } });
    }

    // 최종 where 조건 구성
    const where: Prisma.SupportProgramWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    // 정렬 조건
    const orderBy: Prisma.SupportProgramOrderByWithRelationInput = {};
    if (sortBy === "deadline") {
      orderBy.deadline = sortOrder;
    } else if (sortBy === "createdAt") {
      orderBy.id = sortOrder; // createdAt 대신 id로 정렬 (cuid는 시간순)
    } else if (sortBy === "title") {
      orderBy.title = sortOrder;
    }

    try {
      // 총 개수 조회
      const total = await this.prisma.supportProgram.count({ where });

      // 데이터 조회
      const programs = await this.prisma.supportProgram.findMany({
        where,
        include: {
          provider: true,
        },
        orderBy,
        skip,
        take: limit,
      });

      // DTO 변환
      const programDtos: ProgramResponseDto[] = programs.map((program) => ({
        id: program.id,
        title: program.title,
        description: program.description || "",
        category: this.mapStringToEnum(program.category),
        categoryLabel:
          SUPPORT_PROGRAM_CATEGORY_LABELS[
            this.mapStringToEnum(program.category)
          ],
        target: program.target || "전체",
        amountMin: program.amountMin,
        amountMax: program.amountMax,
        supportRate: program.supportRate,
        region: program.region,
        deadline: program.deadline,
        daysLeft: program.deadline
          ? this.calculateDaysLeft(program.deadline)
          : undefined,
        applicationUrl: program.applicationUrl,
        attachmentUrl: program.attachmentUrl,
        tags: program.tags,
        provider: {
          id: program.provider.id,
          name: program.provider.name,
          type: program.provider.type,
          contact: program.provider.contact,
          website: program.provider.website,
        },
        createdAt: new Date(), // Prisma schema에 createdAt이 없으므로 임시값
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        programs: programDtos,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (error) {
      this.logger.error("Error finding programs:", error);
      throw error;
    }
  }

  /**
   * 특정 지원사업의 상세 정보를 조회하는 메서드
   *
   * ID를 통해 단일 지원사업을 조회하고, 지원기관 정보와 함께 반환합니다.
   * 카테고리 코드를 Enum으로 변환하고 한글 라벨을 추가합니다.
   * 마감일까지 남은 일수도 계산하여 포함됩니다.
   *
   * @param id - 조회할 지원사업의 고유 ID
   * @returns 지원사업 상세 정보 또는 null (존재하지 않는 경우)
   */
  async findProgramById(id: string): Promise<ProgramResponseDto | null> {
    try {
      const program = await this.prisma.supportProgram.findUnique({
        where: { id },
        include: {
          provider: true,
        },
      });

      if (!program) {
        return null;
      }

      return {
        id: program.id,
        title: program.title,
        description: program.description || "",
        category: this.mapStringToEnum(program.category),
        categoryLabel:
          SUPPORT_PROGRAM_CATEGORY_LABELS[
            this.mapStringToEnum(program.category)
          ],
        target: program.target || "전체",
        amountMin: program.amountMin,
        amountMax: program.amountMax,
        supportRate: program.supportRate,
        region: program.region,
        deadline: program.deadline,
        daysLeft: program.deadline
          ? this.calculateDaysLeft(program.deadline)
          : undefined,
        applicationUrl: program.applicationUrl,
        attachmentUrl: program.attachmentUrl,
        tags: program.tags,
        provider: {
          id: program.provider.id,
          name: program.provider.name,
          type: program.provider.type,
          contact: program.provider.contact,
          website: program.provider.website,
        },
        createdAt: new Date(), // Prisma schema에 createdAt이 없으므로 임시값
      };
    } catch (error) {
      this.logger.error(`Error finding program by id ${id}:`, error);
      throw error;
    }
  }

  /**
   * 마감기한이 7일 이내인 지원사업 목록을 조회하는 메서드
   *
   * 현재 날짜로부터 7일 이내에 마감되는 지원사업들만 필터링하여 반환합니다.
   * 마감일 순으로 오름차순 정렬하여 가장 급한 것부터 표시됩니다.
   * 페이지네이션을 지원합니다.
   *
   * @param query - 페이지네이션 조건을 담은 쿼리 파라미터
   * @returns 마감임박 지원사업 목록
   */
  async findUrgentPrograms(query: ProgramQueryDto = {}): Promise<ProgramListResponseDto> {
    try {
      const { page = 1, limit = 20 } = query;
      const skip = (page - 1) * limit;

      const now = new Date();
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(now.getDate() + 7);

      const where: Prisma.SupportProgramWhereInput = {
        deadline: {
          gte: now, // 현재 이후
          lte: sevenDaysLater, // 7일 이내
        },
      };

      // 총 개수 조회
      const total = await this.prisma.supportProgram.count({ where });

      // 데이터 조회 (마감일 순 오름차순)
      const programs = await this.prisma.supportProgram.findMany({
        where,
        include: {
          provider: true,
        },
        orderBy: {
          deadline: "asc",
        },
        skip,
        take: limit,
      });

      // DTO 변환
      const programDtos: ProgramResponseDto[] = programs.map((program) => ({
        id: program.id,
        title: program.title,
        description: program.description || "",
        category: this.mapStringToEnum(program.category),
        categoryLabel:
          SUPPORT_PROGRAM_CATEGORY_LABELS[
            this.mapStringToEnum(program.category)
          ],
        target: program.target || "전체",
        amountMin: program.amountMin,
        amountMax: program.amountMax,
        supportRate: program.supportRate,
        region: program.region,
        deadline: program.deadline,
        daysLeft: program.deadline
          ? this.calculateDaysLeft(program.deadline)
          : undefined,
        applicationUrl: program.applicationUrl,
        attachmentUrl: program.attachmentUrl,
        tags: program.tags,
        provider: {
          id: program.provider.id,
          name: program.provider.name,
          type: program.provider.type,
          contact: program.provider.contact,
          website: program.provider.website,
        },
        createdAt: new Date(),
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        programs: programDtos,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (error) {
      this.logger.error("Error finding urgent programs:", error);
      throw error;
    }
  }

  /**
   * 지원사업 분야(카테고리) 목록과 각 분야별 통계를 조회하는 메서드
   *
   * 8개 지원사업 분야의 정보를 반환합니다:
   * - 분야 코드 (01~09)
   * - 분야 한글명 (금융, 기술, 인력 등)
   * - 각 분야에 속한 활성 지원사업 개수
   *
   * 활성 사업(마감일이 지나지 않은 사업)만 카운트하며,
   * 개수가 많은 순으로 정렬하여 반환합니다.
   *
   * @returns 분야 목록과 각 분야별 지원사업 개수
   */
  async getCategories(): Promise<CategoryResponseDto[]> {
    try {
      // 각 카테고리별 활성 지원사업 개수 조회
      const categoryCounts = await this.prisma.supportProgram.groupBy({
        by: ["category"],
        _count: {
          id: true,
        },
        where: {
          deadline: {
            gte: new Date(), // 활성 사업만
          },
        },
      });

      const categories: CategoryResponseDto[] = Object.values(
        SupportProgramCategory
      ).map((category) => {
        const count =
          categoryCounts.find((c) => c.category === category)?._count.id || 0;
        return {
          code: category,
          label: SUPPORT_PROGRAM_CATEGORY_LABELS[category],
          count,
        };
      });

      return categories.sort((a, b) => b.count - a.count); // 개수 순으로 정렬
    } catch (error) {
      this.logger.error("Error getting categories:", error);
      throw error;
    }
  }

  /**
   * 마감일까지 남은 일수를 계산하는 헬퍼 메서드
   *
   * 현재 날짜와 마감일 사이의 차이를 일 단위로 계산합니다.
   * 음수가 나올 경우 0을 반환하여 이미 마감된 사업임을 표시합니다.
   *
   * @param deadline - 마감일
   * @returns 남은 일수 (최소 0)
   */
  private calculateDaysLeft(deadline: Date): number {
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * 데이터베이스의 카테고리 문자열을 Enum으로 변환하는 헬퍼 메서드
   *
   * DB에 저장된 카테고리 코드(문자열)를 TypeScript Enum으로 안전하게 변환합니다.
   * 매칭되지 않는 값이 있을 경우 OTHER로 기본값 처리합니다.
   *
   * @param categoryString - DB에 저장된 카테고리 문자열
   * @returns 해당하는 SupportProgramCategory Enum 값
   */
  private mapStringToEnum(
    categoryString: string | null
  ): SupportProgramCategory {
    if (!categoryString) return SupportProgramCategory.OTHER;

    // Enum 값과 일치하는지 확인
    const enumValues = Object.values(SupportProgramCategory);
    const matchedEnum = enumValues.find(
      (enumValue) => enumValue === categoryString
    );

    return matchedEnum || SupportProgramCategory.OTHER;
  }
}
