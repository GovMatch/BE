import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { AuthProvider } from '@prisma/client';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class TokenDto {
  accessToken: string;
  refreshToken: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class OAuthUserDto {
  email: string;
  name: string;
  provider: AuthProvider;
  providerId: string;
}
