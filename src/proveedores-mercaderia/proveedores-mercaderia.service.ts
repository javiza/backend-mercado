import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { ProveedorMercaderia } from './entities/proveedor-mercaderia.entity';
import { CreateProveedorMercaderiaDto } from './dto/create-proveedor-mercaderia.dto';
import { UpdateProveedorMercaderiaDto } from './dto/update-proveedor-mercaderia.dto';

@Injectable()
export class ProveedoresMercaderiaService {
  constructor(
    @InjectRepository(ProveedorMercaderia)
    private readonly proveedorRepository: Repository<ProveedorMercaderia>,
  ) {}

  create(dto: CreateProveedorMercaderiaDto): Promise<ProveedorMercaderia> {
    const proveedor = this.proveedorRepository.create(dto);
    return this.proveedorRepository.save(proveedor);
  }

  findAll(q?: string): Promise<ProveedorMercaderia[]> {
    return this.proveedorRepository.find({
      where: q ? { nombre: ILike(`%${q}%`) } : {},
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<ProveedorMercaderia> {
    const proveedor = await this.proveedorRepository.findOne({ where: { id } });
    if (!proveedor) throw new NotFoundException('ProveedorMercaderia no encontrado');
    return proveedor;
  }

  async update(id: number, dto: UpdateProveedorMercaderiaDto): Promise<ProveedorMercaderia> {
    const proveedor = await this.findOne(id);
    Object.assign(proveedor, dto);
    return this.proveedorRepository.save(proveedor);
  }

  async desactivar(id: number): Promise<ProveedorMercaderia> {
    const proveedor = await this.findOne(id);
    proveedor.activo = false;
    return this.proveedorRepository.save(proveedor);
  }

  async reactivar(id: number): Promise<ProveedorMercaderia> {
    const proveedor = await this.findOne(id);
    proveedor.activo = true;
    return this.proveedorRepository.save(proveedor);
  }
}
