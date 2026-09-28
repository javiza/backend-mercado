import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Venta } from '../../ventas/entities/venta.entity';
import { Caja } from './caja.entity';

export enum MedioPago {
  EFECTIVO = 'EFECTIVO',
  DEBITO = 'DEBITO',
  CREDITO = 'CREDITO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  WEBPAY = 'WEBPAY', // pasarela online — integración real queda pendiente, ver README
}

export enum EstadoPago {
  CONFIRMADO = 'CONFIRMADO',
  RECHAZADO = 'RECHAZADO',
  REEMBOLSADO = 'REEMBOLSADO',
}

// Una venta puede tener más de un pago (pago dividido: parte efectivo,
// parte tarjeta). VentasService.marcarPagada() se dispara solo cuando la
// suma de pagos CONFIRMADO alcanza el total de la venta.
@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Venta, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  // Solo se completa cuando medio = EFECTIVO y lo cobra un cajero con
  // turno abierto; sirve para el cuadre de caja al cerrar el turno.
  @ManyToOne(() => Caja, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'caja_id' })
  caja?: Caja;

  @Column({ type: 'enum', enum: MedioPago })
  medio: MedioPago;

  @Column({ type: 'enum', enum: EstadoPago, default: EstadoPago.CONFIRMADO })
  estado: EstadoPago;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  // N° de operación/voucher de la tarjeta, id de transacción de la
  // pasarela, etc. Libre porque cada medio de pago identifica distinto.
  @Column({ length: 150, nullable: true })
  referencia?: string;

  // Cajero/admin que registró el pago. Null en pagos que en el futuro
  // vengan confirmados automáticamente por una pasarela online.
  @Column({ type: 'int', nullable: true, name: 'usuario_id' })
  usuarioId?: number;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
