import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// Datos de RR.HH. del empleado. Separado de User a propósito: User maneja
// login/rol/permisos, Empleado maneja ficha laboral (cargo, sueldo,
// contrato). Un User sin fila en Empleado sigue pudiendo loguearse
// normalmente (ej: un SUPER_ADMIN que no es "personal" contratado).
@Entity('empleados')
export class Empleado {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;

  @Column({ length: 100 })
  cargo: string; // "Cajero", "Bodeguero", "Vendedor", "Administrador"...

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'sueldo_base' })
  sueldoBase: number;

  @Column({ type: 'date', name: 'fecha_contratacion' })
  fechaContratacion: string;

  @Column({ length: 50, nullable: true })
  telefono?: string;

  @Column({ type: 'text', nullable: true })
  direccion?: string;

  @Column({ length: 150, nullable: true, name: 'contacto_emergencia_nombre' })
  contactoEmergenciaNombre?: string;

  @Column({ length: 50, nullable: true, name: 'contacto_emergencia_telefono' })
  contactoEmergenciaTelefono?: string;

  // Empleado vigente en la empresa. Independiente de User.activo (que
  // controla si puede loguearse): se puede desactivar como empleado
  // (finiquitado) sin necesariamente borrar/desactivar su cuenta al tiro,
  // o viceversa, dejar la cuenta desactivada pero conservar su ficha.
  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
