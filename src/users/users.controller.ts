import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';

import { UsersService } from './users.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { Roles } from '../common/decorators/roles.decorator';

import { Role } from '../common/constants/roles.enum';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(
    @Body()
    dto: CreateUserDto,
  ) {
    return this.usersService.create(
      dto,
    );
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
   @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
  )
  findAll(@Query('q') q?: string) {
    return this.usersService.findAll(q);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
   @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
  )
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.usersService.findOne(
      +id,
    );
  }
  // Edición desde el panel admin: nombre, email, rol, rut y (opcional)
  // una password nueva. Solo SUPER_ADMIN, igual que crear/eliminar —
  // ADMIN puede ver la lista (findAll arriba) pero no tocar cuentas.
  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  update(
    @Param('id')
    id: string,
    @Body()
    dto: UpdateUserDto,
  ) {
    return this.usersService.update(+id, dto);
  }

  // Eliminación definitiva (a diferencia de deactivate, que solo apaga
  // la cuenta). Bloqueado que un SUPER_ADMIN se elimine a sí mismo, ver
  // UsersService.remove.
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  remove(
    @Param('id')
    id: string,
    @CurrentUser()
    solicitante: JwtPayload,
  ) {
    return this.usersService.remove(+id, solicitante.sub);
  }

  @Patch(':id/deactivate')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
deactivate(
  @Param('id')
  id: string,
) {
  return this.usersService.deactivate(
    +id,
  );
}

@Patch(':id/reactivate')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
reactivate(@Param('id') id: string) {
  return this.usersService.reactivate(+id);
}
}