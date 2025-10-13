import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from '../services';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../dto';
import {
  GoogleOAuthGuard,
  NaverOAuthGuard,
  KakaoOAuthGuard,
  JwtAuthGuard,
} from '../guards';
import { CurrentUser, Public } from '../decorators';
import { User } from '@prisma/client';

/**
 * 인증 관련 API 컨트롤러
 * JWT 기반 인증 및 OAuth 소셜 로그인을 제공합니다.
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 회원가입
   * @param registerDto 회원가입 정보 (이메일, 비밀번호, 이름, 연락처)
   * @returns 액세스 토큰 및 리프레시 토큰
   */
  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * 로그인
   * @param loginDto 로그인 정보 (이메일, 비밀번호)
   * @returns 액세스 토큰 및 리프레시 토큰
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * 구글 OAuth 로그인 시작
   * 구글 로그인 페이지로 리다이렉트됩니다.
   */
  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleAuth() {
    // Guard가 구글 OAuth 페이지로 자동 리다이렉트
  }

  /**
   * 구글 OAuth 콜백 처리
   * 구글 인증 완료 후 호출되는 엔드포인트
   * @returns 프론트엔드로 토큰과 함께 리다이렉트
   */
  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleAuthCallback(@Req() req, @Res() res: Response) {
    const tokens = await this.authService.oauthLogin(req.user);

    // 프론트엔드로 리다이렉트하면서 토큰 전달
    // 실제 프로덕션에서는 쿠키나 다른 안전한 방법 사용 권장
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  /**
   * 네이버 OAuth 로그인 시작
   * 네이버 로그인 페이지로 리다이렉트됩니다.
   */
  @Public()
  @Get('naver')
  @UseGuards(NaverOAuthGuard)
  async naverAuth() {
    // Guard가 네이버 OAuth 페이지로 자동 리다이렉트
  }

  /**
   * 네이버 OAuth 콜백 처리
   * 네이버 인증 완료 후 호출되는 엔드포인트
   * @returns 프론트엔드로 토큰과 함께 리다이렉트
   */
  @Public()
  @Get('naver/callback')
  @UseGuards(NaverOAuthGuard)
  async naverAuthCallback(@Req() req, @Res() res: Response) {
    const tokens = await this.authService.oauthLogin(req.user);

    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  /**
   * 카카오 OAuth 로그인 시작
   * 카카오 로그인 페이지로 리다이렉트됩니다.
   */
  @Public()
  @Get('kakao')
  @UseGuards(KakaoOAuthGuard)
  async kakaoAuth() {
    // Guard가 카카오 OAuth 페이지로 자동 리다이렉트
  }

  /**
   * 카카오 OAuth 콜백 처리
   * 카카오 인증 완료 후 호출되는 엔드포인트
   * @returns 프론트엔드로 토큰과 함께 리다이렉트
   */
  @Public()
  @Get('kakao/callback')
  @UseGuards(KakaoOAuthGuard)
  async kakaoAuthCallback(@Req() req, @Res() res: Response) {
    const tokens = await this.authService.oauthLogin(req.user);

    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  /**
   * 토큰 갱신
   * 리프레시 토큰을 사용하여 새로운 액세스 토큰과 리프레시 토큰을 발급받습니다.
   * @param refreshTokenDto 리프레시 토큰
   * @returns 새로운 액세스 토큰 및 리프레시 토큰
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  /**
   * 로그아웃
   * 서버에 저장된 리프레시 토큰을 무효화합니다.
   * @param user 현재 로그인한 사용자
   * @returns 로그아웃 성공 메시지
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: User) {
    await this.authService.logout(user.id);
    return { message: 'Logged out successfully' };
  }

  /**
   * 현재 로그인한 사용자 정보 조회
   * JWT 토큰에서 사용자 정보를 추출하여 반환합니다.
   * @param user 현재 로그인한 사용자
   * @returns 사용자 정보 (민감한 정보 제외)
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...userWithoutSensitiveData } = user as any;
    return userWithoutSensitiveData;
  }
}
