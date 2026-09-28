import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { tokenMatches } from '../common/utils/token-hash';

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService) {}

  private perfil(u: User) {
    const { password, hashedRefreshToken, resetPasswordToken, resetPasswordExpires, ...pub } = u;
    return pub;
  }

  private async emitir(u: User) {
    const payload = { sub: u.id, email: u.email, rol: u.rol };
    const accessToken = await this.jwt.signAsync(payload, { secret: process.env.JWT_SECRET, expiresIn: '12h' });
    const refreshToken = await this.jwt.signAsync(payload, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' });
    await this.users.updateRefreshToken(u.id, refreshToken);
    return { accessToken, refreshToken, user: this.perfil(u) };
  }

  async login(email: string, password: string) {
    const u = await this.users.findByEmail(email.toLowerCase().trim());
    if (!u || !u.activo || !(await bcrypt.compare(password, u.password))) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }
    return this.emitir(u);
  }

  async refresh(refreshToken: string) {
    try {
      const p = await this.jwt.verifyAsync(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
      const u = await this.users.findOne(p.sub);
      if (!u.activo || !u.hashedRefreshToken || !tokenMatches(refreshToken, u.hashedRefreshToken)) throw new Error();
      return this.emitir(u);
    } catch {
      throw new UnauthorizedException('Sesión vencida');
    }
  }

  async me(id: number) { return this.perfil(await this.users.findOne(id)); }
  logout(id: number) { return this.users.clearRefreshToken(id); }
}
