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

import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.enum';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  // Pública, la usa el catálogo de la tienda online (?soloVisibles=true).
  // El panel admin llama sin ese parámetro para ver también lo oculto/inactivo.
  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('soloVisibles') soloVisibles?: string,
    @Query('categoriaId') categoriaId?: string,
  ) {
    return this.productosService.findAll({
      q,
      soloVisibles: soloVisibles === 'true',
      categoriaId: categoriaId ? +categoriaId : undefined,
    });
  }

  @Get('stock-bajo')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BODEGA)
  stockBajo() {
    return this.productosService.stockBajo();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productosService.findOne(+id);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(@Body() dto: CreateProductoDto) {
    return this.productosService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateProductoDto) {
    return this.productosService.update(+id, dto);
  }

  @Patch(':id/deactivate')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  desactivar(@Param('id') id: string) {
    return this.productosService.desactivar(+id);
  }

  @Patch(':id/reactivate')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  reactivar(@Param('id') id: string) {
    return this.productosService.reactivar(+id);
  }
}
