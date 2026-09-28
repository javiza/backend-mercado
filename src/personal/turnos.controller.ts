import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { TurnosService } from './turnos.service';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('turnos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  // Calendario propio del empleado logueado (para que vea su semana desde
  // su propia sesión, sin permisos de admin).
  @Get('mios')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CAJERO, Role.BODEGA)
  misTurnos(
    @CurrentUser() usuario: JwtPayload,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.turnosService.misTurnos(usuario.sub, desde, hasta);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  findAll(
    @Query('empleadoId') empleadoId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.turnosService.findAll({
      empleadoId: empleadoId ? +empleadoId : undefined,
      desde,
      hasta,
    });
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.turnosService.findOne(+id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(@Body() dto: CreateTurnoDto) {
    return this.turnosService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTurnoDto) {
    return this.turnosService.update(+id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.turnosService.remove(+id);
  }
}
