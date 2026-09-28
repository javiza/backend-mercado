import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Pago, MedioPago, EstadoPago } from './entities/pago.entity';
import { CreatePagoDto } from './dto/create-pago.dto';
import { CajaService } from './caja.service';
import { VentasService } from '../ventas/ventas.service';
import { Venta, EstadoVenta } from '../ventas/entities/venta.entity';

interface RegistrarPagoOpts {
  usuarioId?: number; // cajero/admin que cobra (mostrador); undefined en pagos online
}

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    private readonly cajaService: CajaService,
    private readonly ventasService: VentasService,
  ) {}

  async registrar(
    ventaId: number,
    dto: CreatePagoDto,
    opts: RegistrarPagoOpts = {},
  ): Promise<Pago> {
    const venta = await this.ventasService.findOne(ventaId);

    if (venta.estado === EstadoVenta.ANULADA) {
      throw new BadRequestException('La venta está anulada, no se le pueden registrar pagos');
    }
    if (venta.estado !== EstadoVenta.PENDIENTE_PAGO) {
      throw new BadRequestException('Esta venta ya no está pendiente de pago');
    }

    const yaPagado = await this.totalPagadoConfirmado(ventaId);
    const restante = Number(venta.total) - yaPagado;
    if (dto.monto > restante) {
      throw new BadRequestException(
        `El monto excede lo pendiente de la venta (faltan ${restante})`,
      );
    }

    let cajaId: number | undefined;
    if (dto.medio === MedioPago.EFECTIVO) {
      if (!opts.usuarioId) {
        throw new BadRequestException('Un pago en efectivo debe registrarlo un cajero');
      }
      const caja = await this.cajaService.cajaAbiertaDe(opts.usuarioId);
      if (!caja) {
        throw new BadRequestException(
          'Debes abrir tu caja antes de recibir pagos en efectivo',
        );
      }
      cajaId = caja.id;
    }

    const pago = this.pagoRepository.create({
      venta: { id: ventaId } as Venta,
      caja: cajaId ? ({ id: cajaId } as any) : undefined,
      medio: dto.medio,
      monto: dto.monto,
      referencia: dto.referencia,
      usuarioId: opts.usuarioId,
      estado: EstadoPago.CONFIRMADO,
    });
    const pagoGuardado = await this.pagoRepository.save(pago);

    const totalPagadoAhora = yaPagado + dto.monto;
    if (totalPagadoAhora >= Number(venta.total)) {
      await this.ventasService.marcarPagada(ventaId);
    }

    return pagoGuardado;
  }

  async totalPagadoConfirmado(ventaId: number): Promise<number> {
    const pagos = await this.pagoRepository.find({
      where: { venta: { id: ventaId }, estado: EstadoPago.CONFIRMADO },
    });
    return pagos.reduce((acc, p) => acc + Number(p.monto), 0);
  }

  porVenta(ventaId: number): Promise<Pago[]> {
    return this.pagoRepository.find({
      where: { venta: { id: ventaId } },
      order: { creadoEn: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Pago> {
    const pago = await this.pagoRepository.findOne({
      where: { id },
      relations: { venta: true, caja: true },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    return pago;
  }

  // Reembolso simple: marca el pago como REEMBOLSADO. No reabre la venta ni
  // toca stock — si además hay que devolver mercadería, eso pasa por
  // VentasService.anular (que sí devuelve stock) como paso aparte.
  async reembolsar(id: number): Promise<Pago> {
    const pago = await this.findOne(id);
    if (pago.estado !== EstadoPago.CONFIRMADO) {
      throw new BadRequestException('Solo se puede reembolsar un pago confirmado');
    }
    pago.estado = EstadoPago.REEMBOLSADO;
    return this.pagoRepository.save(pago);
  }
}
