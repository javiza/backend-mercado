import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ClientesModule } from '../clientes/clientes.module';
import { ClientesAuthService } from './clientes-auth.service';
import { ClientesAuthController } from './clientes-auth.controller';
import { ClienteJwtStrategy } from './cliente-jwt.strategy';

@Module({
  imports: [ClientesModule, PassportModule, JwtModule.register({})],
  controllers: [ClientesAuthController],
  providers: [ClientesAuthService, ClienteJwtStrategy],
})
export class ClientesAuthModule {}
