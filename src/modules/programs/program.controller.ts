import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { ProgramService } from "./program.service";
import {
  ProgramQueryDto,
  ProgramResponseDto,
  ProgramListResponseDto,
  CategoryResponseDto,
} from "./dto";
import { SupportProgramCategory } from "../../shared/enums/support-program-category.enum";

/**
 * 지원사업 관련 REST API 컨트롤러
 *
 * 이 컨트롤러는 정부지원사업 데이터에 대한 다음 기능들을 제공합니다:
 * - 지원사업 목록 조회 (페이지네이션, 필터링, 검색 지원)
 * - 지원사업 상세 정보 조회
 * - 지원사업 분야(카테고리) 목록 조회
 * - 지원사업 검색 기능
 */
@ApiTags("Programs")
@Controller("api/programs")
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  /**
   * 지원사업 목록을 조회하는 메서드
   *
   * 주요 기능:
   * - 페이지네이션 지원 (page, limit)
   * - 분야별 필터링 (category)
   * - 키워드 검색 (search - 제목, 설명에서 검색)
   * - 지역별 필터링 (region)
   * - 태그별 필터링 (tags)
   * - 정렬 기능 (sortBy, sortOrder)
   * - 활성 사업만 조회 옵션 (activeOnly - 마감일 지나지 않은 것만)
   *
   * @param query - 조회 조건을 담은 쿼리 파라미터
   * @returns 지원사업 목록과 페이지네이션 정보
   */
  @Get()
  @ApiOperation({
    summary: "지원사업 목록 조회",
    description:
      "페이지네이션, 필터링, 검색, 정렬을 지원하는 지원사업 목록 조회",
  })
  @ApiResponse({
    status: 200,
    description: "지원사업 목록 조회 성공",
    type: ProgramListResponseDto,
  })
  @ApiQuery({
    name: "page",
    required: false,
    description: "페이지 번호 (기본값: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "페이지당 항목 수 (기본값: 20, 최대: 100)",
  })
  @ApiQuery({
    name: "category",
    required: false,
    enum: SupportProgramCategory,
    description: "지원사업 분야",
  })
  @ApiQuery({
    name: "search",
    required: false,
    description: "검색어 (제목, 설명 검색)",
  })
  @ApiQuery({ name: "region", required: false, description: "지역 필터" })
  @ApiQuery({
    name: "sortBy",
    required: false,
    enum: ["deadline", "createdAt", "title"],
    description: "정렬 기준",
  })
  @ApiQuery({
    name: "sortOrder",
    required: false,
    enum: ["asc", "desc"],
    description: "정렬 방향",
  })
  @ApiQuery({
    name: "tags",
    required: false,
    type: [String],
    description: "태그 필터",
  })
  @ApiQuery({
    name: "activeOnly",
    required: false,
    type: Boolean,
    description: "마감일이 지나지 않은 사업만 조회",
  })
  async getPrograms(
    @Query() query: ProgramQueryDto
  ): Promise<ProgramListResponseDto> {
    return this.programService.findPrograms(query);
  }

  /**
   * 지원사업 분야(카테고리) 목록을 조회하는 메서드
   *
   * 8개 분야(금융, 기술, 인력, 수출, 내수, 창업, 경영, 기타)의
   * 코드, 한글명, 각 분야별 활성 지원사업 개수를 반환합니다.
   * 프론트엔드에서 필터링 UI를 구성할 때 사용됩니다.
   *
   * @returns 분야 목록과 각 분야별 지원사업 개수
   */
  @Get("categories")
  @ApiOperation({
    summary: "지원사업 분야 목록 조회",
    description: "각 분야별 지원사업 개수와 함께 분야 목록을 조회합니다",
  })
  @ApiResponse({
    status: 200,
    description: "분야 목록 조회 성공",
    type: [CategoryResponseDto],
  })
  async getCategories(): Promise<CategoryResponseDto[]> {
    return this.programService.getCategories();
  }

  /**
   * 지원사업 검색 메서드 (별칭 엔드포인트)
   *
   * GET /api/programs와 동일한 기능을 제공하는 별칭 엔드포인트입니다.
   * RESTful API 관습에 따라 검색 기능을 별도 URL로 제공합니다.
   * 실제로는 getPrograms()와 동일한 로직을 사용합니다.
   *
   * @param query - 검색 조건을 담은 쿼리 파라미터
   * @returns 검색된 지원사업 목록과 페이지네이션 정보
   */
  @Get("search")
  @ApiOperation({
    summary: "지원사업 검색",
    description:
      "검색어와 필터를 사용한 지원사업 검색 (GET /api/programs와 동일한 기능)",
  })
  @ApiResponse({
    status: 200,
    description: "검색 결과 조회 성공",
    type: ProgramListResponseDto,
  })
  async searchPrograms(
    @Query() query: ProgramQueryDto
  ): Promise<ProgramListResponseDto> {
    return this.programService.findPrograms(query);
  }

  /**
   * 특정 지원사업의 상세 정보를 조회하는 메서드
   *
   * 지원사업 ID를 받아서 해당 지원사업의 모든 상세 정보를 반환합니다.
   * 지원기관 정보, 마감일까지 남은 일수, 카테고리 라벨 등이 포함됩니다.
   * 존재하지 않는 ID인 경우 404 에러를 반환합니다.
   *
   * @param id - 조회할 지원사업의 고유 ID
   * @returns 지원사업 상세 정보
   * @throws NotFoundException - 해당 ID의 지원사업이 존재하지 않을 때
   */
  @Get(":id")
  @ApiOperation({
    summary: "지원사업 상세 조회",
    description: "ID로 특정 지원사업의 상세 정보를 조회합니다",
  })
  @ApiParam({
    name: "id",
    description: "지원사업 ID",
    example: "prog_123456789",
  })
  @ApiResponse({
    status: 200,
    description: "지원사업 상세 조회 성공",
    type: ProgramResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "지원사업을 찾을 수 없음",
  })
  async getProgramById(@Param("id") id: string): Promise<ProgramResponseDto> {
    const program = await this.programService.findProgramById(id);

    if (!program) {
      throw new NotFoundException(`지원사업을 찾을 수 없습니다. ID: ${id}`);
    }

    return program;
  }
}
