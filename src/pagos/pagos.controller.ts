import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

// Registro manual de pagos (mostrador, transferencia verificada a mano,
// etc.). Una integración real con una pasarela online (Webpay/Transbank,
// Mercado Pago...) reemplazaría/complementaría esto con un webhook que
// llame a `pagosService.registrar` automáticamente — queda fuera de este
// módulo, ver nota en el README.
@Controller('ventas/:ventaId/pagos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CAJERO)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Get()
  porVenta(@Param('ventaId') ventaId: string) {
    return this.pagosService.porVenta(+ventaId);
  }

  @Post()
  registrar(
    @Param('ventaId') ventaId: string,
    @Body() dto: CreatePagoDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.pagosService.registrar(+ventaId, dto, { usuarioId: usuario.sub });
  }

  @Patch(':pagoId/reembolsar')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  reembolsar(@Param('pagoId') pagoId: string) {
    return this.pagosService.reembolsar(+pagoId);
  }
}
