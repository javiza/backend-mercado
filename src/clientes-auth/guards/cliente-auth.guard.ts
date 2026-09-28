import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ClienteAuthGuard extends AuthGuard('jwt-cliente') {
  handleRequest(err: any, user: any) {
    if (err || !user) throw new UnauthorizedException('Debes iniciar sesión como cliente');
    return user;
  }
}
