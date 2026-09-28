import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { IngresoMercaderia } from './entities/ingreso-mercaderia.entity';
import { IngresoMercaderiaDetalle } from './entities/ingreso-mercaderia-detalle.entity';
import {
  MovimientoStock,
  TipoMovimientoStock,
} from './entities/movimiento-stock.entity';
import { Producto } from '../productos/entities/producto.entity';
import { CreateIngresoDto } from './dto/create-ingreso.dto';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(IngresoMercaderia)
    private readonly ingresoRepository: Repository<IngresoMercaderia>,
    @InjectRepository(MovimientoStock)
    private readonly movimientoRepository: Repository<MovimientoStock>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // Todo el ingreso se procesa en una sola transacción: se crea el
  // encabezado + detalle, se suma stockActual a cada producto y se deja
  // el registro en movimientos_stock. Si algo falla a mitad de camino,
  // no queda stock sumado a medias.
  async crearIngreso(
    dto: CreateIngresoDto,
    usuarioId: number,
  ): Promise<IngresoMercaderia> {
    return this.dataSource.transaction(async (manager) => {
      const productoRepo = manager.getRepository(Producto);
      const detalleRepo = manager.getRepository(IngresoMercaderiaDetalle);
      const movimientoRepo = manager.getRepository(MovimientoStock);
      const ingresoRepo = manager.getRepository(IngresoMercaderia);

      let total = 0;
      const detallesConstruidos: IngresoMercaderiaDetalle[] = [];

      const ingreso = ingresoRepo.create({
        proveedor: dto.proveedorId ? ({ id: dto.proveedorId } as any) : undefined,
        numeroDocumento: dto.numeroDocumento,
        observacion: dto.observacion,
        usuarioId,
      });
      const ingresoGuardado = await ingresoRepo.save(ingreso);

      for (const linea of dto.detalles) {
        const producto = await productoRepo.findOne({
          where: { id: linea.productoId },
        });
        if (!producto) {
          throw new NotFoundException(
            `Producto ${linea.productoId} no encontrado`,
          );
        }

        const subtotal = linea.cantidad * linea.costoUnitario;
        total += subtotal;

        const detalle = detalleRepo.create({
          ingreso: ingresoGuardado,
          producto,
          cantidad: linea.cantidad,
          costoUnitario: linea.costoUnitario,
          subtotal,
        });
        detallesConstruidos.push(await detalleRepo.save(detalle));

        producto.stockActual += linea.cantidad;
        await productoRepo.save(producto);

        await movimientoRepo.save(
          movimientoRepo.create({
            producto,
            tipo: TipoMovimientoStock.INGRESO,
            cantidad: linea.cantidad,
            stockResultante: producto.stockActual,
            referencia: `ingreso:${ingresoGuardado.id}`,
            usuarioId,
          }),
        );
      }

      ingresoGuardado.total = total;
      ingresoGuardado.detalles = detallesConstruidos;
      return ingresoRepo.save(ingresoGuardado);
    });
  }

  findAll(): Promise<IngresoMercaderia[]> {
    return this.ingresoRepository.find({
      relations: { proveedor: true, detalles: { producto: true } },
      order: { creadoEn: 'DESC' },
    });
  }

  async findOne(id: number): Promise<IngresoMercaderia> {
    const ingreso = await this.ingresoRepository.findOne({
      where: { id },
      relations: { proveedor: true, detalles: { producto: true } },
    });
    if (!ingreso) throw new NotFoundException('Ingreso no encontrado');
    return ingreso;
  }

  // Ajuste manual de stock (ej: conteo físico de bodega encuentra una
  // diferencia, o una merma por vencimiento/rotura). delta puede ser
  // positivo o negativo; el stock resultante nunca puede quedar bajo 0.
  async ajustarStock(
    productoId: number,
    delta: number,
    motivo: string,
    usuarioId: number,
  ): Promise<Producto> {
    return this.dataSource.transaction(async (manager) => {
      const productoRepo = manager.getRepository(Producto);
      const movimientoRepo = manager.getRepository(MovimientoStock);

      const producto = await productoRepo.findOne({ where: { id: productoId } });
      if (!producto) throw new NotFoundException('Producto no encontrado');

      const nuevoStock = producto.stockActual + delta;
      if (nuevoStock < 0) {
        throw new BadRequestException('El ajuste dejaría el stock en negativo');
      }

      producto.stockActual = nuevoStock;
      await productoRepo.save(producto);

      await movimientoRepo.save(
        movimientoRepo.create({
          producto,
          tipo: delta < 0 ? TipoMovimientoStock.MERMA : TipoMovimientoStock.AJUSTE,
          cantidad: delta,
          stockResultante: nuevoStock,
          referencia: motivo,
          usuarioId,
        }),
      );

      return producto;
    });
  }

  historialProducto(productoId: number): Promise<MovimientoStock[]> {
    return this.movimientoRepository.find({
      where: { producto: { id: productoId } },
      order: { creadoEn: 'DESC' },
    });
  }
}
