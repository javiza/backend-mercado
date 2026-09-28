import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Empleado } from './empleado.entity';

// Turno puntual (no plantilla recurrente): un día, con hora de inicio y
// fin. Para armar la semana se crean varias filas, una por día — así el
// admin puede mover/eliminar un turno individual sin afectar el resto.
@Entity('turnos')
export class Turno {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Empleado, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empleado_id' })
  empleado: Empleado;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'time', name: 'hora_inicio' })
  horaInicio: string;

  @Column({ type: 'time', name: 'hora_fin' })
  horaFin: string;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
