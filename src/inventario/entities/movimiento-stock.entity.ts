import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';

export enum TipoMovimientoStock {
  INGRESO = 'INGRESO',
  VENTA = 'VENTA',
  AJUSTE = 'AJUSTE',
  MERMA = 'MERMA',
  ANULACION_VENTA = 'ANULACION_VENTA', // devuelve stock al anular una venta
}

// Registro de auditoría: cada vez que stockActual de un producto cambia,
// queda una fila acá con el porqué. Nunca se edita ni se borra.
@Entity('movimientos_stock')
export class MovimientoStock {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Producto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'enum', enum: TipoMovimientoStock })
  tipo: TipoMovimientoStock;

  // Positivo para ingresos/ajustes hacia arriba, negativo para
  // ventas/mermas/ajustes hacia abajo.
  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'int', name: 'stock_resultante' })
  stockResultante: number;

  // Referencia libre al documento de origen, ej. "ingreso:14", "venta:87".
  @Column({ length: 100, nullable: true })
  referencia?: string;

  @Column({ type: 'int', nullable: true, name: 'usuario_id' })
  usuarioId?: number;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
