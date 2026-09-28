import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CambiarPasswordDto, LoginDto, RefreshDto } from './dto/auth.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private users: UsersService) {}

  @Post('login') @HttpCode(200)
  login(@Body() dto: LoginDto) { return this.auth.login(dto.email, dto.password); }

  @Post('refresh') @HttpCode(200)
  refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }

  @Post('logout') @HttpCode(204) @ApiBearerAuth('JWT-auth') @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() u: JwtPayload) { return this.auth.logout(u.sub); }

  @Get('me') @ApiBearerAuth('JWT-auth') @UseGuards(JwtAuthGuard)
  me(@CurrentUser() u: JwtPayload) { return this.auth.me(u.sub); }

  @Patch('password') @HttpCode(204) @ApiBearerAuth('JWT-auth') @UseGuards(JwtAuthGuard)
  password(@CurrentUser() u: JwtPayload, @Body() dto: CambiarPasswordDto) {
    return this.users.cambiarPassword(u.sub, dto.passwordActual, dto.passwordNueva);
  }
}
