import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { ProveedorMercaderia } from '../../proveedores-mercaderia/entities/proveedor-mercaderia.entity';
import { IngresoMercaderiaDetalle } from './ingreso-mercaderia-detalle.entity';

@Entity('ingresos_mercaderia')
export class IngresoMercaderia {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ProveedorMercaderia, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'proveedor_id' })
  proveedor?: ProveedorMercaderia;

  @Column({ length: 50, nullable: true, name: 'numero_documento' })
  numeroDocumento?: string; // N° de factura o guía de despacho del proveedor

  @Column({ type: 'text', nullable: true })
  observacion?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  // Quién cargó el ingreso (usuario del panel, típicamente rol BODEGA).
  @Column({ type: 'int', name: 'usuario_id' })
  usuarioId: number;

  @OneToMany(() => IngresoMercaderiaDetalle, (d) => d.ingreso, {
    cascade: true,
  })
  detalles: IngresoMercaderiaDetalle[];

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
