import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Empleado } from './entities/empleado.entity';
import { Turno } from './entities/turno.entity';
import { User } from '../users/entities/user.entity';
import { EmpleadosService } from './empleados.service';
import { EmpleadosController } from './empleados.controller';
import { TurnosService } from './turnos.service';
import { TurnosController } from './turnos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Empleado, Turno, User])],
  controllers: [EmpleadosController, TurnosController],
  providers: [EmpleadosService, TurnosService],
  exports: [EmpleadosService, TurnosService],
})
export class PersonalModule {}
