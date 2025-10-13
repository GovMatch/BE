import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../config/prisma.service';
import { TokenService } from './token.service';
import { LoginDto, RegisterDto, OAuthUserDto, TokenDto } from '../dto';
import * as bcrypt from 'bcrypt';
import { AuthProvider } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
  ) {}

  async register(registerDto: RegisterDto): Promise<TokenDto> {
    const { email, password, name, phone } = registerDto;

    // 이메일 중복 체크
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        provider: AuthProvider.LOCAL,
      },
    });

    // 토큰 생성
    const tokens = await this.tokenService.generateTokens(user);

    // 리프레시 토큰 저장
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async login(loginDto: LoginDto): Promise<TokenDto> {
    const { email, password } = loginDto;

    // 사용자 찾기
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.provider !== AuthProvider.LOCAL) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 토큰 생성
    const tokens = await this.tokenService.generateTokens(user);

    // 리프레시 토큰 저장
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async oauthLogin(oauthUser: OAuthUserDto): Promise<TokenDto> {
    const { email, name, provider, providerId } = oauthUser;

    // 기존 사용자 찾기
    let user = await this.prisma.user.findFirst({
      where: {
        provider,
        providerId,
      },
    });

    // 사용자가 없으면 생성
    if (!user) {
      // 이메일로 다른 제공자로 가입한 사용자가 있는지 확인
      const existingUserWithEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUserWithEmail) {
        throw new ConflictException(
          `Email already registered with ${existingUserWithEmail.provider}`,
        );
      }

      user = await this.prisma.user.create({
        data: {
          email,
          name,
          provider,
          providerId,
        },
      });
    }

    // 토큰 생성
    const tokens = await this.tokenService.generateTokens(user);

    // 리프레시 토큰 저장
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async refreshTokens(refreshToken: string): Promise<TokenDto> {
    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // 저장된 리프레시 토큰과 비교
      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // 새 토큰 생성
      const tokens = await this.tokenService.generateTokens(user);

      // 새 리프레시 토큰 저장
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });
  }
}
