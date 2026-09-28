import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Categoria } from './entities/categoria.entity';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
  ) {}

  async create(dto: CreateCategoriaDto): Promise<Categoria> {
    const existe = await this.categoriaRepository.findOne({
      where: { nombre: dto.nombre },
    });
    if (existe) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }
    const categoria = this.categoriaRepository.create(dto);
    return this.categoriaRepository.save(categoria);
  }

  findAll(soloActivas = false): Promise<Categoria[]> {
    return this.categoriaRepository.find({
      where: soloActivas ? { activo: true } : {},
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Categoria> {
    const categoria = await this.categoriaRepository.findOne({
      where: { id },
    });
    if (!categoria) throw new NotFoundException('Categoría no encontrada');
    return categoria;
  }

  async update(id: number, dto: UpdateCategoriaDto): Promise<Categoria> {
    const categoria = await this.findOne(id);
    Object.assign(categoria, dto);
    return this.categoriaRepository.save(categoria);
  }

  async desactivar(id: number): Promise<Categoria> {
    const categoria = await this.findOne(id);
    categoria.activo = false;
    return this.categoriaRepository.save(categoria);
  }

  async reactivar(id: number): Promise<Categoria> {
    const categoria = await this.findOne(id);
    categoria.activo = true;
    return this.categoriaRepository.save(categoria);
  }
}
