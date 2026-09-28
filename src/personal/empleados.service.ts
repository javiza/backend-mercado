import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Empleado } from './entities/empleado.entity';
import { User } from '../users/entities/user.entity';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';

@Injectable()
export class EmpleadosService {
  constructor(
    @InjectRepository(Empleado)
    private readonly empleadoRepository: Repository<Empleado>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateEmpleadoDto): Promise<Empleado> {
    const usuario = await this.userRepository.findOne({
      where: { id: dto.usuarioId },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const existente = await this.empleadoRepository.findOne({
      where: { usuario: { id: dto.usuarioId } },
    });
    if (existente) {
      throw new ConflictException('Ese usuario ya tiene una ficha de empleado');
    }

    const empleado = this.empleadoRepository.create({ ...dto, usuario });
    return this.empleadoRepository.save(empleado);
  }

  findAll(soloActivos = false): Promise<Empleado[]> {
    return this.empleadoRepository.find({
      where: soloActivos ? { activo: true } : {},
      relations: { usuario: true },
      order: { creadoEn: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Empleado> {
    const empleado = await this.empleadoRepository.findOne({
      where: { id },
      relations: { usuario: true },
    });
    if (!empleado) throw new NotFoundException('Empleado no encontrado');
    return empleado;
  }

  async porUsuario(usuarioId: number): Promise<Empleado> {
    const empleado = await this.empleadoRepository.findOne({
      where: { usuario: { id: usuarioId } },
      relations: { usuario: true },
    });
    if (!empleado) throw new NotFoundException('No tienes una ficha de empleado');
    return empleado;
  }

  async update(id: number, dto: UpdateEmpleadoDto): Promise<Empleado> {
    const empleado = await this.findOne(id);
    Object.assign(empleado, dto);
    return this.empleadoRepository.save(empleado);
  }

  async desactivar(id: number): Promise<Empleado> {
    const empleado = await this.findOne(id);
    empleado.activo = false;
    return this.empleadoRepository.save(empleado);
  }

  async reactivar(id: number): Promise<Empleado> {
    const empleado = await this.findOne(id);
    empleado.activo = true;
    return this.empleadoRepository.save(empleado);
  }
}
