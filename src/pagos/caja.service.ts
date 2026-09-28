import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Caja, EstadoCaja } from './entities/caja.entity';
import { Pago, MedioPago, EstadoPago } from './entities/pago.entity';
import { AbrirCajaDto, CerrarCajaDto } from './dto/caja.dto';

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(Caja)
    private readonly cajaRepository: Repository<Caja>,
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
  ) {}

  async abrir(usuarioId: number, dto: AbrirCajaDto): Promise<Caja> {
    const yaAbierta = await this.cajaRepository.findOne({
      where: { usuarioId, estado: EstadoCaja.ABIERTA },
    });
    if (yaAbierta) {
      throw new BadRequestException(
        'Ya tienes una caja abierta; ciérrala antes de abrir otra',
      );
    }
    const caja = this.cajaRepository.create({
      usuarioId,
      montoApertura: dto.montoApertura,
      estado: EstadoCaja.ABIERTA,
    });
    return this.cajaRepository.save(caja);
  }

  cajaAbiertaDe(usuarioId: number): Promise<Caja | null> {
    return this.cajaRepository.findOne({
      where: { usuarioId, estado: EstadoCaja.ABIERTA },
    });
  }

  async findOne(id: number): Promise<Caja> {
    const caja = await this.cajaRepository.findOne({ where: { id } });
    if (!caja) throw new NotFoundException('Caja no encontrada');
    return caja;
  }

  findAll(usuarioId?: number): Promise<Caja[]> {
    return this.cajaRepository.find({
      where: usuarioId ? { usuarioId } : {},
      order: { abiertaEn: 'DESC' },
    });
  }

  // solicitanteId/esAdmin: un cajero solo puede cerrar SU propia caja; un
  // ADMIN/SUPER_ADMIN puede cerrar la de cualquiera (ej: turno que el
  // cajero olvidó cerrar).
  async cerrar(
    id: number,
    dto: CerrarCajaDto,
    solicitanteId: number,
    esAdmin: boolean,
  ): Promise<Caja> {
    const caja = await this.findOne(id);
    if (caja.estado === EstadoCaja.CERRADA) {
      throw new BadRequestException('Esta caja ya está cerrada');
    }
    if (!esAdmin && caja.usuarioId !== solicitanteId) {
      throw new ForbiddenException('No puedes cerrar la caja de otro usuario');
    }

    const pagosEfectivo = await this.pagoRepository.find({
      where: { caja: { id: caja.id }, medio: MedioPago.EFECTIVO, estado: EstadoPago.CONFIRMADO },
    });
    const totalEfectivo = pagosEfectivo.reduce((acc, p) => acc + Number(p.monto), 0);
    const montoEsperado = Number(caja.montoApertura) + totalEfectivo;

    caja.montoEsperado = montoEsperado;
    caja.montoCierreDeclarado = dto.montoCierreDeclarado;
    caja.diferencia = dto.montoCierreDeclarado - montoEsperado;
    caja.observaciones = dto.observaciones;
    caja.estado = EstadoCaja.CERRADA;
    caja.cerradaEn = new Date();

    return this.cajaRepository.save(caja);
  }
}
