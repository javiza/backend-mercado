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

import { EmpleadosService } from './empleados.service';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('empleados')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmpleadosController {
  constructor(private readonly empleadosService: EmpleadosService) {}

  // Cualquier miembro del equipo puede ver su propia ficha (sueldo,
  // contrato, contacto de emergencia) sin necesitar permisos de admin.
  @Get('mi-ficha')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CAJERO, Role.BODEGA)
  miFicha(@CurrentUser() usuario: JwtPayload) {
    return this.empleadosService.porUsuario(usuario.sub);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  findAll(@Query('soloActivos') soloActivos?: string) {
    return this.empleadosService.findAll(soloActivos === 'true');
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.empleadosService.findOne(+id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(@Body() dto: CreateEmpleadoDto) {
    return this.empleadosService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateEmpleadoDto) {
    return this.empleadosService.update(+id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  desactivar(@Param('id') id: string) {
    return this.empleadosService.desactivar(+id);
  }

  @Patch(':id/reactivate')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  reactivar(@Param('id') id: string) {
    return this.empleadosService.reactivar(+id);
  }
}
