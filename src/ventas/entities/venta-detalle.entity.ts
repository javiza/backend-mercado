import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Venta } from './venta.entity';
import { Producto } from '../../productos/entities/producto.entity';

@Entity('ventas_detalle')
export class VentaDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Venta, (v) => v.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  @ManyToOne(() => Producto, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'int' })
  cantidad: number;

  // Se copia el precio de venta del producto al momento de la compra, para
  // que un cambio de precio futuro no altere ventas ya hechas.
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'precio_unitario' })
  precioUnitario: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;
}
