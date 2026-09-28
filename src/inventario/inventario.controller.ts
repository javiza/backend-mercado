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
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

import { InventarioService } from './inventario.service';
import { CreateIngresoDto } from './dto/create-ingreso.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

class AjustarStockDto {
  @IsInt()
  delta: number;

  @IsString()
  @IsNotEmpty()
  motivo: string;
}

@Controller('inventario')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BODEGA)
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get('ingresos')
  findAll() {
    return this.inventarioService.findAll();
  }

  @Get('ingresos/:id')
  findOne(@Param('id') id: string) {
    return this.inventarioService.findOne(+id);
  }

  @Post('ingresos')
  crearIngreso(
    @Body() dto: CreateIngresoDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.inventarioService.crearIngreso(dto, usuario.sub);
  }

  @Get('productos/:productoId/movimientos')
  historialProducto(@Param('productoId') productoId: string) {
    return this.inventarioService.historialProducto(+productoId);
  }

  @Patch('productos/:productoId/ajuste')
  ajustarStock(
    @Param('productoId') productoId: string,
    @Body() dto: AjustarStockDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.inventarioService.ajustarStock(
      +productoId,
      dto.delta,
      dto.motivo,
      usuario.sub,
    );
  }
}
