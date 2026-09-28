import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { ClientesService } from './clientes.service';
import { UpdateClienteAdminDto } from './dto/update-cliente-admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.enum';

/**
 * Gestión de clientes desde el panel admin. El registro/login del propio
 * cliente vive en ClientesAuthModule (rutas /clientes-auth/*), separado a
 * propósito de este controller: acá solo entra un admin autenticado.
 */
@Controller('clientes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  // ?q= busca por nombre, email o RUT (coincidencia parcial). Sin el
  // parámetro, devuelve todos los clientes ordenados por más reciente.
  @Get()
  findAll(@Query('q') q?: string) {
    return this.clientesService.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientesService.findOne(+id);
  }

  // Edición puntual desde el panel admin (típicamente para completar el
  // RUT de un cliente que se registró sin cargarlo).
  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: UpdateClienteAdminDto) {
    return this.clientesService.actualizar(+id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.clientesService.deactivate(+id);
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.clientesService.reactivate(+id);
  }

  // Eliminación definitiva (a diferencia de deactivate, que solo apaga
  // la cuenta). Solo SUPER_ADMIN, a diferencia del resto de este
  // controller que también permite ADMIN — ver ClientesService.eliminar
  // para qué pasa con sus reservas/cotizaciones al borrarlo.
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(204)
  eliminar(@Param('id') id: string) {
    return this.clientesService.eliminar(+id);
  }
}
