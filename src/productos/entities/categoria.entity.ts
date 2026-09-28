import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Producto } from './producto.entity';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => Producto, (producto) => producto.categoria)
  productos: Producto[];

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
