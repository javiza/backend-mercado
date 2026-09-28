import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ClientesAuthService } from './clientes-auth.service';
import { ClientesService } from '../clientes/clientes.service';
import { ClienteAuthGuard } from './guards/cliente-auth.guard';
import { CurrentCliente } from './decorators/current-cliente.decorator';
import { RegistroClienteDto } from './dto/registro-cliente.dto';
import { UpdatePerfilClienteDto } from './dto/update-perfil-cliente.dto';
import { LoginDto, RefreshDto, CambiarPasswordDto } from '../auth/dto/auth.dto';
import type { ClienteJwtPayload } from './interfaces/cliente-jwt-payload.interface';

@Controller('clientes-auth')
export class ClientesAuthController {
  constructor(private auth: ClientesAuthService, private clientes: ClientesService) {}

  @Post('registro') registro(@Body() dto: RegistroClienteDto) { return this.auth.registro(dto); }
  @Post('login') @HttpCode(200) login(@Body() dto: LoginDto) { return this.auth.login(dto.email, dto.password); }
  @Post('refresh') @HttpCode(200) refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }

  @Post('logout') @HttpCode(204) @ApiBearerAuth('JWT-auth') @UseGuards(ClienteAuthGuard)
  logout(@CurrentCliente() c: ClienteJwtPayload) { return this.auth.logout(c.sub); }

  @Get('me') @ApiBearerAuth('JWT-auth') @UseGuards(ClienteAuthGuard)
  me(@CurrentCliente() c: ClienteJwtPayload) { return this.auth.me(c.sub); }

  @Patch('perfil') @ApiBearerAuth('JWT-auth') @UseGuards(ClienteAuthGuard)
  async perfil(@CurrentCliente() c: ClienteJwtPayload, @Body() dto: UpdatePerfilClienteDto) {
    return this.auth.perfil(await this.clientes.actualizar(c.sub, dto));
  }

  @Patch('password') @HttpCode(204) @ApiBearerAuth('JWT-auth') @UseGuards(ClienteAuthGuard)
  password(@CurrentCliente() c: ClienteJwtPayload, @Body() dto: CambiarPasswordDto) {
    return this.clientes.cambiarPassword(c.sub, dto.passwordActual, dto.passwordNueva);
  }
}
