import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VentaDetalle } from './venta-detalle.entity';
import { Cliente } from '../../clientes/entities/cliente.entity';

export enum CanalVenta {
  ONLINE = 'ONLINE',
  MOSTRADOR = 'MOSTRADOR',
}

export enum EstadoVenta {
  PENDIENTE_PAGO = 'PENDIENTE_PAGO', // venta online recién creada, esperando pago
  PAGADA = 'PAGADA',
  ENTREGADA = 'ENTREGADA', // solo tiene sentido para ONLINE (delivery/retiro)
  ANULADA = 'ANULADA',
}

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: CanalVenta })
  canal: CanalVenta;

  @Column({ type: 'enum', enum: EstadoVenta, default: EstadoVenta.PENDIENTE_PAGO })
  estado: EstadoVenta;

  // Cliente registrado, si la venta quedó asociada a una cuenta (siempre
  // en ONLINE; en MOSTRADOR es opcional, puede ser un cliente anónimo).
  @ManyToOne(() => Cliente, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cliente_id' })
  cliente?: Cliente;

  // Cajero/admin que procesó la venta de mostrador. Null en ventas online
  // hechas por el propio cliente sin intervención de un cajero.
  @Column({ type: 'int', nullable: true, name: 'usuario_id' })
  usuarioId?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  // Reservado para futuros descuentos/despacho; por ahora igual a subtotal.
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'text', nullable: true, name: 'direccion_entrega' })
  direccionEntrega?: string;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @OneToMany(() => VentaDetalle, (d) => d.venta, { cascade: true })
  detalles: VentaDetalle[];

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
