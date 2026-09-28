import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Categoria } from './categoria.entity';

// stockActual se actualiza SOLO desde InventarioService (ingresos de
// mercadería) y desde VentasService (al confirmar una venta) — nunca se
// edita a mano desde el CRUD de productos, para que el historial de
// movimientos_stock siempre cuadre con el número que queda acá.
@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ length: 50, unique: true, nullable: true })
  sku?: string;

  @Column({ length: 50, nullable: true, name: 'codigo_barra' })
  codigoBarra?: string;

  @ManyToOne(() => Categoria, (categoria) => categoria.productos, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoria_id' })
  categoria?: Categoria;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'precio_venta' })
  precioVenta: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'precio_costo' })
  precioCosto: number;

  @Column({ type: 'int', default: 0, name: 'stock_actual' })
  stockActual: number;

  @Column({ type: 'int', default: 0, name: 'stock_minimo' })
  stockMinimo: number;

  @Column({ length: 20, default: 'UNIDAD', name: 'unidad_medida' })
  unidadMedida: string; // UNIDAD, KG, LITRO, PAQUETE...

  @Column({ type: 'text', nullable: true, name: 'imagen_url' })
  imagenUrl?: string;

  // Visible en la tienda online. Un producto puede estar activo para venta
  // en mostrador pero oculto del catálogo web (ej: en liquidación interna).
  @Column({ default: true, name: 'visible_tienda' })
  visibleTienda: boolean;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
