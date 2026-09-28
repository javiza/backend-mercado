import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IngresoMercaderia } from './ingreso-mercaderia.entity';
import { Producto } from '../../productos/entities/producto.entity';

@Entity('ingresos_mercaderia_detalle')
export class IngresoMercaderiaDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => IngresoMercaderia, (i) => i.detalles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ingreso_id' })
  ingreso: IngresoMercaderia;

  @ManyToOne(() => Producto, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'costo_unitario' })
  costoUnitario: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;
}
