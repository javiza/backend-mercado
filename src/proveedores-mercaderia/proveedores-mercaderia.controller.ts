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

import { ProveedoresMercaderiaService } from './proveedores-mercaderia.service';
import { CreateProveedorMercaderiaDto } from './dto/create-proveedor-mercaderia.dto';
import { UpdateProveedorMercaderiaDto } from './dto/update-proveedor-mercaderia.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.enum';

// Todo este módulo es interno (nunca lo ve un cliente de la tienda), por
// eso va guardado completo a diferencia de Productos/Categorías.
@Controller('proveedores-mercaderia')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BODEGA)
export class ProveedoresMercaderiaController {
  constructor(private readonly proveedoresService: ProveedoresMercaderiaService) {}

  @Get()
  findAll(@Query('q') q?: string) {
    return this.proveedoresService.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proveedoresService.findOne(+id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(@Body() dto: CreateProveedorMercaderiaDto) {
    return this.proveedoresService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateProveedorMercaderiaDto) {
    return this.proveedoresService.update(+id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  desactivar(@Param('id') id: string) {
    return this.proveedoresService.desactivar(+id);
  }

  @Patch(':id/reactivate')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  reactivar(@Param('id') id: string) {
    return this.proveedoresService.reactivar(+id);
  }
}
