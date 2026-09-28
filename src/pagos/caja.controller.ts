import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { CajaService } from './caja.service';
import { AbrirCajaDto, CerrarCajaDto } from './dto/caja.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('caja')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CAJERO)
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Post('abrir')
  abrir(@Body() dto: AbrirCajaDto, @CurrentUser() usuario: JwtPayload) {
    return this.cajaService.abrir(usuario.sub, dto);
  }

  // La caja abierta del cajero que está haciendo la consulta — la usa el
  // frontend para saber si mostrar "Abrir caja" o "Cerrar caja" y para
  // bloquear el cobro en efectivo si no hay turno abierto.
  @Get('actual')
  actual(@CurrentUser() usuario: JwtPayload) {
    return this.cajaService.cajaAbiertaDe(usuario.sub);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  findAll(@Query('usuarioId') usuarioId?: string) {
    return this.cajaService.findAll(usuarioId ? +usuarioId : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cajaService.findOne(+id);
  }

  @Patch(':id/cerrar')
  cerrar(
    @Param('id') id: string,
    @Body() dto: CerrarCajaDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    const esAdmin = usuario.rol === Role.SUPER_ADMIN || usuario.rol === Role.ADMIN;
    return this.cajaService.cerrar(+id, dto, usuario.sub, esAdmin);
  }
}
