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

import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { CanalVenta, EstadoVenta } from './entities/venta.entity';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

// OJO: para las rutas de cliente (checkout online y "mis pedidos") asumí
// que existe un guard de sesión de cliente separado del de admin/staff,
// tal como indica el comentario de ClientesController ("el registro/login
// del propio cliente vive en ClientesAuthModule"). No vino ese archivo en
// lo que subiste, así que dejé el import apuntando a la ruta más probable
// (`clientes-auth/guards/cliente-auth.guard`) — ajústalo al nombre real
// del guard y del decorador que devuelve el cliente logueado.
import { ClienteAuthGuard } from '../clientes-auth/guards/cliente-auth.guard';
import { CurrentCliente } from '../clientes-auth/decorators/current-cliente.decorator';
import type { ClienteJwtPayload } from '../clientes-auth/interfaces/cliente-jwt-payload.interface';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  // --- Canal ONLINE: lo usa el cliente logueado desde la tienda ---

  @Post('online')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClienteAuthGuard)
  crearVentaOnline(
    @Body() dto: CreateVentaDto,
    @CurrentCliente() cliente: ClienteJwtPayload,
  ) {
    return this.ventasService.crear(dto, {
      canal: CanalVenta.ONLINE,
      clienteId: cliente.sub,
    });
  }

  @Get('mias')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClienteAuthGuard)
  misVentas(@CurrentCliente() cliente: ClienteJwtPayload) {
    return this.ventasService.misVentas(cliente.sub);
  }

  // --- Canal MOSTRADOR: lo usa el cajero desde el panel interno ---

  @Post('mostrador')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CAJERO)
  crearVentaMostrador(
    @Body() dto: CreateVentaDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.ventasService.crear(dto, {
      canal: CanalVenta.MOSTRADOR,
      clienteId: dto.clienteId,
      usuarioId: usuario.sub,
    });
  }

  // --- Panel interno: ver y administrar cualquier venta ---

  @Get()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CAJERO)
  findAll(@Query('canal') canal?: CanalVenta, @Query('estado') estado?: EstadoVenta) {
    return this.ventasService.findAll({ canal, estado });
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CAJERO)
  findOne(@Param('id') id: string) {
    return this.ventasService.findOne(+id);
  }

  @Patch(':id/pagar')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CAJERO)
  marcarPagada(@Param('id') id: string) {
    return this.ventasService.marcarPagada(+id);
  }

  @Patch(':id/entregar')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CAJERO)
  marcarEntregada(@Param('id') id: string) {
    return this.ventasService.marcarEntregada(+id);
  }

  @Patch(':id/anular')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  anular(@Param('id') id: string, @CurrentUser() usuario: JwtPayload) {
    return this.ventasService.anular(+id, usuario.sub);
  }
}
