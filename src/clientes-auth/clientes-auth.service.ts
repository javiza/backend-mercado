import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ClientesService } from '../clientes/clientes.service';
import { Cliente } from '../clientes/entities/cliente.entity';
import { RegistroClienteDto } from './dto/registro-cliente.dto';
import { clienteSecret } from './cliente-jwt.strategy';
import { tokenMatches } from '../common/utils/token-hash';

@Injectable()
export class ClientesAuthService {
  constructor(private clientes: ClientesService, private jwt: JwtService) {}

  perfil(c: Cliente) {
    const { password, hashedRefreshToken, resetPasswordToken, resetPasswordExpires, ...pub } = c;
    return pub;
  }

  private async emitir(c: Cliente) {
    const payload = { sub: c.id, email: c.email, tipo: 'cliente' };
    const accessToken = await this.jwt.signAsync(payload, { secret: clienteSecret(), expiresIn: '12h' });
    const refreshToken = await this.jwt.signAsync(payload, { secret: process.env.JWT_REFRESH_SECRET + ':cliente', expiresIn: '30d' });
    await this.clientes.updateRefreshToken(c.id, refreshToken);
    return { accessToken, refreshToken, user: this.perfil(c) };
  }

  async registro(dto: RegistroClienteDto) {
    const c = await this.clientes.registrar({ ...dto, email: dto.email.toLowerCase().trim() });
    return this.emitir(c);
  }

  async login(email: string, password: string) {
    const c = await this.clientes.findByEmail(email.toLowerCase().trim());
    if (!c || !c.activo || !(await bcrypt.compare(password, c.password))) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }
    return this.emitir(c);
  }

  async refresh(refreshToken: string) {
    try {
      const p = await this.jwt.verifyAsync(refreshToken, { secret: process.env.JWT_REFRESH_SECRET + ':cliente' });
      const c = await this.clientes.findOne(p.sub);
      if (!c.activo || !c.hashedRefreshToken || !tokenMatches(refreshToken, c.hashedRefreshToken)) throw new Error();
      return this.emitir(c);
    } catch {
      throw new UnauthorizedException('Sesión vencida');
    }
  }

  async me(id: number) { return this.perfil(await this.clientes.findOne(id)); }
  logout(id: number) { return this.clientes.clearRefreshToken(id); }
}
