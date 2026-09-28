import { IsEmail, IsString, MinLength } from 'class-validator';
export class LoginDto { @IsEmail() email: string; @IsString() password: string; }
export class RefreshDto { @IsString() refreshToken: string; }
export class CambiarPasswordDto {
  @IsString() passwordActual: string;
  @IsString() @MinLength(8) passwordNueva: string;
}
