import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Venta, CanalVenta, EstadoVenta } from './entities/venta.entity';
import { VentaDetalle } from './entities/venta-detalle.entity';
import { Producto } from '../productos/entities/producto.entity';
import {
  MovimientoStock,
  TipoMovimientoStock,
} from '../inventario/entities/movimiento-stock.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { CacheService } from '../redis/cache.service';

interface CrearVentaOpts {
  canal: CanalVenta;
  clienteId?: number; // cliente logueado (ONLINE) o cliente elegido por el cajero (MOSTRADOR)
  usuarioId?: number; // cajero/admin que procesa (solo MOSTRADOR)
}

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cache: CacheService,
  ) {}

  // Venta online: el cliente arma el carrito en el frontend y solo al
  // confirmar el pedido se persiste acá, ya con el stock validado y
  // descontado. Si algún producto no tiene stock suficiente, se corta
  // TODA la venta (no se arma un pedido a medias).
  async crear(dto: CreateVentaDto, opts: CrearVentaOpts): Promise<Venta> {
    if (opts.canal === CanalVenta.ONLINE && !opts.clienteId) {
      throw new BadRequestException('La venta online requiere un cliente autenticado');
    }

    // Une líneas repetidas del mismo producto y las ordena por id: (1) el stock se valida sobre el total real y
    // (2) todas las transacciones bloquean filas en el mismo orden, lo que evita deadlocks entre ventas simultáneas.
    const porProducto = new Map<number, number>();
    for (const l of dto.detalles) porProducto.set(l.productoId, (porProducto.get(l.productoId) ?? 0) + l.cantidad);
    const lineas = [...porProducto.entries()].sort((a, b) => a[0] - b[0]).map(([productoId, cantidad]) => ({ productoId, cantidad }));

    const resultado = await this.dataSource.transaction(async (manager) => {
      const productoRepo = manager.getRepository(Producto);
      const ventaRepo = manager.getRepository(Venta);
      const detalleRepo = manager.getRepository(VentaDetalle);
      const movimientoRepo = manager.getRepository(MovimientoStock);

      let subtotalTotal = 0;
      const detallesConstruidos: VentaDetalle[] = [];
      const productosAfectados: { producto: Producto; cantidad: number }[] = [];

      // 1ª pasada: valida stock de todas las líneas antes de tocar nada.
      for (const linea of lineas) {
        // pessimistic_write = SELECT ... FOR UPDATE: mientras esta venta no termine, nadie más puede vender
        // este mismo producto con un stock ya desactualizado (evita vender 2 veces la última unidad).
        const producto = await productoRepo.findOne({
          where: { id: linea.productoId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!producto || !producto.activo) {
          throw new NotFoundException(
            `Producto ${linea.productoId} no disponible`,
          );
        }
        if (producto.stockActual < linea.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para "${producto.nombre}" (disponible: ${producto.stockActual})`,
          );
        }
        productosAfectados.push({ producto, cantidad: linea.cantidad });
      }

      const venta = ventaRepo.create({
        canal: opts.canal,
        // Tanto ONLINE como MOSTRADOR quedan PENDIENTE_PAGO al crearse: el
        // pago (efectivo, tarjeta, transferencia...) se registra aparte vía
        // PagosService.registrar, que es quien la pasa a PAGADA. Así toda
        // venta, sea cual sea el canal, queda con un Pago trazable y el
        // efectivo de mostrador sí entra al cuadre de caja.
        estado: EstadoVenta.PENDIENTE_PAGO,
        cliente: opts.clienteId ? ({ id: opts.clienteId } as any) : undefined,
        usuarioId: opts.usuarioId,
        direccionEntrega: dto.direccionEntrega,
        notas: dto.notas,
        subtotal: 0,
        total: 0,
      });
      const ventaGuardada = await ventaRepo.save(venta);

      // 2ª pasada: ya validado el stock de todas las líneas, recién ahí
      // se descuenta y se deja el detalle + el movimiento de auditoría.
      for (const { producto, cantidad } of productosAfectados) {
        const precioUnitario = Number(producto.precioVenta);
        const subtotal = precioUnitario * cantidad;
        subtotalTotal += subtotal;

        const detalle = detalleRepo.create({
          venta: ventaGuardada,
          producto,
          cantidad,
          precioUnitario,
          subtotal,
        });
        detallesConstruidos.push(await detalleRepo.save(detalle));

        producto.stockActual -= cantidad;
        await productoRepo.save(producto);

        await movimientoRepo.save(
          movimientoRepo.create({
            producto,
            tipo: TipoMovimientoStock.VENTA,
            cantidad: -cantidad,
            stockResultante: producto.stockActual,
            referencia: `venta:${ventaGuardada.id}`,
            usuarioId: opts.usuarioId,
          }),
        );
      }

      ventaGuardada.subtotal = subtotalTotal;
      ventaGuardada.total = subtotalTotal;
      ventaGuardada.detalles = detallesConstruidos;
      return ventaRepo.save(ventaGuardada);
    });
    await this.cache.bump('productos'); // el stock cambió: el catálogo cacheado ya no vale
    return resultado;
  }

  // limit/offset opcionales; por defecto 200 filas (máx. 500) para no cargar toda la tabla en memoria.
  findAll(filtros: { canal?: CanalVenta; estado?: EstadoVenta; limit?: number; offset?: number } = {}): Promise<Venta[]> {
    const { limit, offset, ...where } = filtros;
    return this.ventaRepository.find({
      where,
      take: Math.min(Math.max(limit ?? 200, 1), 500),
      skip: Math.max(offset ?? 0, 0),
      relations: { cliente: true, detalles: { producto: true } },
      order: { creadoEn: 'DESC' },
    });
  }

  misVentas(clienteId: number): Promise<Venta[]> {
    return this.ventaRepository.find({
      where: { cliente: { id: clienteId } },
      relations: { detalles: { producto: true } },
      order: { creadoEn: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Venta> {
    const venta = await this.ventaRepository.findOne({
      where: { id },
      relations: { cliente: true, detalles: { producto: true } },
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    return venta;
  }

  // Marca la venta online como pagada. En el módulo de Pagos esto se va a
  // llamar automáticamente al confirmar el pago (webhook o registro
  // manual de caja); acá queda expuesto también para uso directo mientras
  // ese módulo no existe.
  async marcarPagada(id: number): Promise<Venta> {
    const venta = await this.findOne(id);
    if (venta.estado !== EstadoVenta.PENDIENTE_PAGO) {
      throw new BadRequestException('Solo se puede pagar una venta pendiente de pago');
    }
    venta.estado = EstadoVenta.PAGADA;
    return this.ventaRepository.save(venta);
  }

  marcarEntregada(id: number): Promise<Venta> {
    return this.findOne(id).then((venta) => {
      if (venta.canal !== CanalVenta.ONLINE) {
        throw new BadRequestException('Solo las ventas online tienen estado de entrega');
      }
      if (venta.estado !== EstadoVenta.PAGADA) {
        throw new BadRequestException('Solo se puede entregar una venta ya pagada');
      }
      venta.estado = EstadoVenta.ENTREGADA;
      return this.ventaRepository.save(venta);
    });
  }

  // Anula la venta y devuelve el stock descontado. No se permite anular
  // una venta ya entregada (ver README: para eso se maneja como devolución,
  // que queda fuera de este módulo).
  async anular(id: number, usuarioId: number): Promise<Venta> {
    const resultado = await this.dataSource.transaction(async (manager) => {
      const ventaRepo = manager.getRepository(Venta);
      const productoRepo = manager.getRepository(Producto);
      const movimientoRepo = manager.getRepository(MovimientoStock);

      const venta = await ventaRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write', tables: ['ventas'] }, // dos anulaciones simultáneas no devuelven el stock dos veces
        relations: { detalles: { producto: true } },
      });
      if (!venta) throw new NotFoundException('Venta no encontrada');
      if (venta.estado === EstadoVenta.ANULADA) {
        throw new BadRequestException('La venta ya está anulada');
      }
      if (venta.estado === EstadoVenta.ENTREGADA) {
        throw new BadRequestException(
          'No se puede anular una venta ya entregada; gestiónala como devolución',
        );
      }

      for (const detalle of [...venta.detalles].sort((a, b) => a.producto.id - b.producto.id)) {
        const producto = await productoRepo.findOne({
          where: { id: detalle.producto.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!producto) continue; // producto eliminado; no hay a qué devolver stock
        producto.stockActual += detalle.cantidad;
        await productoRepo.save(producto);

        await movimientoRepo.save(
          movimientoRepo.create({
            producto,
            tipo: TipoMovimientoStock.ANULACION_VENTA,
            cantidad: detalle.cantidad,
            stockResultante: producto.stockActual,
            referencia: `venta:${venta.id}`,
            usuarioId,
          }),
        );
      }

      venta.estado = EstadoVenta.ANULADA;
      return ventaRepo.save(venta);
    });
    await this.cache.bump('productos');
    return resultado;
  }
}
