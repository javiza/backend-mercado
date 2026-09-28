import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';

import { Producto } from './entities/producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { CacheService } from '../redis/cache.service';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateProductoDto): Promise<Producto> {
    if (dto.sku) {
      const existe = await this.productoRepository.findOne({
        where: { sku: dto.sku },
      });
      if (existe) throw new ConflictException('Ya existe un producto con ese SKU');
    }
    const producto = this.productoRepository.create({
      ...dto,
      categoria: dto.categoriaId ? ({ id: dto.categoriaId } as any) : undefined,
    });
    const guardado = await this.productoRepository.save(producto);
    await this.cache.bump('productos');
    return guardado;
  }

  // q busca por nombre, sku o código de barra (coincidencia parcial).
  // soloVisibles filtra a lo que debe verse en la tienda online (activo +
  // visibleTienda) — lo usa el catálogo público, no el panel admin.
  // Los listados sin texto de búsqueda (catálogo, panel) se cachean 30 s en Redis y se invalidan al cambiar
  // productos o stock. Las búsquedas con texto van directo a la BD (índices trigram).
  findAll(opts: { q?: string; soloVisibles?: boolean; categoriaId?: number } = {}) {
    if (opts.q) return this.consultar(opts);
    return this.cache.wrap('productos', `lista:${opts.soloVisibles ? 1 : 0}:${opts.categoriaId ?? 'all'}`, 30, () => this.consultar(opts));
  }

  private consultar(opts: { q?: string; soloVisibles?: boolean; categoriaId?: number }) {
    const { q, soloVisibles, categoriaId } = opts;
    const where: any = {};
    if (soloVisibles) {
      where.activo = true;
      where.visibleTienda = true;
    }
    if (categoriaId) where.categoria = { id: categoriaId };
    if (q) {
      return this.productoRepository.find({
        where: [
          { ...where, nombre: ILike(`%${q}%`) },
          { ...where, sku: ILike(`%${q}%`) },
          { ...where, codigoBarra: ILike(`%${q}%`) },
        ],
        relations: { categoria: true },
        order: { nombre: 'ASC' },
      });
    }
    return this.productoRepository.find({
      where,
      relations: { categoria: true },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Producto> {
    const producto = await this.productoRepository.findOne({
      where: { id },
      relations: { categoria: true },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  async update(id: number, dto: UpdateProductoDto): Promise<Producto> {
    const producto = await this.findOne(id);
    const { categoriaId, ...resto } = dto;
    Object.assign(producto, resto);
    if (categoriaId !== undefined) {
      producto.categoria = categoriaId ? ({ id: categoriaId } as any) : undefined;
    }
    const guardado = await this.productoRepository.save(producto);
    await this.cache.bump('productos');
    return guardado;
  }

  async desactivar(id: number): Promise<Producto> {
    const producto = await this.findOne(id);
    producto.activo = false;
    const guardado = await this.productoRepository.save(producto);
    await this.cache.bump('productos');
    return guardado;
  }

  async reactivar(id: number): Promise<Producto> {
    const producto = await this.findOne(id);
    producto.activo = true;
    const guardado = await this.productoRepository.save(producto);
    await this.cache.bump('productos');
    return guardado;
  }

  // Productos con stock por debajo del mínimo — para la alerta del panel
  // de bodega/administración.
  stockBajo(): Promise<Producto[]> {
    return this.productoRepository
      .createQueryBuilder('producto')
      .where('producto.activo = true')
      .andWhere('producto.stock_actual <= producto.stock_minimo')
      .orderBy('producto.stock_actual', 'ASC')
      .getMany();
  }
}
