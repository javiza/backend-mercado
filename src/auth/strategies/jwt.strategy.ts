import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: process.env.JWT_SECRET });
  }
  async validate(p: JwtPayload) {
    // Se relee el usuario: si lo desactivan o le cambian el rol, el efecto es inmediato.
    const u = await this.users.findOne({ where: { id: p.sub } });
    if (!u || !u.activo) throw new UnauthorizedException();
    return { sub: u.id, email: u.email, rol: u.rol } as JwtPayload;
  }
}
