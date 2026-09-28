import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('proveedores_mercaderia')
export class ProveedorMercaderia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 20, nullable: true })
  rut?: string;

  @Column({ length: 150, nullable: true })
  contacto?: string; // nombre de la persona de contacto

  @Column({ length: 50, nullable: true })
  telefono?: string;

  @Column({ length: 150, nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  direccion?: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
