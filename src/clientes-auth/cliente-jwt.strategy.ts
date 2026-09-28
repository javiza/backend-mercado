import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from '../clientes/entities/cliente.entity';
import type { ClienteJwtPayload } from './interfaces/cliente-jwt-payload.interface';

export const clienteSecret = () => `${process.env.JWT_SECRET}:cliente`;

@Injectable()
export class ClienteJwtStrategy extends PassportStrategy(Strategy, 'jwt-cliente') {
  constructor(@InjectRepository(Cliente) private readonly clientes: Repository<Cliente>) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: clienteSecret() });
  }
  async validate(p: ClienteJwtPayload) {
    if (p.tipo !== 'cliente') throw new UnauthorizedException();
    const c = await this.clientes.findOne({ where: { id: p.sub } });
    if (!c || !c.activo) throw new UnauthorizedException();
    return p;
  }
}
