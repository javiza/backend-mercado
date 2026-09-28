import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import { Turno } from './entities/turno.entity';
import { Empleado } from './entities/empleado.entity';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';
import { EmpleadosService } from './empleados.service';

@Injectable()
export class TurnosService {
  constructor(
    @InjectRepository(Turno)
    private readonly turnoRepository: Repository<Turno>,
    private readonly empleadosService: EmpleadosService,
  ) {}

  async create(dto: CreateTurnoDto): Promise<Turno> {
    const empleado = await this.empleadosService.findOne(dto.empleadoId);
    const turno = this.turnoRepository.create({
      empleado,
      fecha: dto.fecha,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      notas: dto.notas,
    });
    return this.turnoRepository.save(turno);
  }

  // Sin filtros trae los turnos futuros/todos ordenados; con
  // empleadoId/desde/hasta arma el calendario semanal o mensual que pida
  // el frontend.
  findAll(filtros: { empleadoId?: number; desde?: string; hasta?: string } = {}) {
    const { empleadoId, desde, hasta } = filtros;
    const where: any = {};
    if (empleadoId) where.empleado = { id: empleadoId };
    if (desde && hasta) where.fecha = Between(desde, hasta);

    return this.turnoRepository.find({
      where,
      relations: { empleado: { usuario: true } },
      order: { fecha: 'ASC', horaInicio: 'ASC' },
    });
  }

  async misTurnos(
    usuarioId: number,
    desde?: string,
    hasta?: string,
  ): Promise<Turno[]> {
    const empleado = await this.empleadosService.porUsuario(usuarioId);
    return this.findAll({ empleadoId: empleado.id, desde, hasta });
  }

  async findOne(id: number): Promise<Turno> {
    const turno = await this.turnoRepository.findOne({
      where: { id },
      relations: { empleado: { usuario: true } },
    });
    if (!turno) throw new NotFoundException('Turno no encontrado');
    return turno;
  }

  async update(id: number, dto: UpdateTurnoDto): Promise<Turno> {
    const turno = await this.findOne(id);
    Object.assign(turno, dto);
    return this.turnoRepository.save(turno);
  }

  async remove(id: number): Promise<void> {
    const turno = await this.findOne(id);
    await this.turnoRepository.remove(turno);
  }
}
