import { Exclude } from 'class-transformer';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 150 }) nombre: string;
  @Column({ length: 150, unique: true }) email: string;
  @Exclude() @Column() password: string;
  @Column({ type: 'varchar', length: 50, nullable: true }) telefono?: string;
  @Column({ type: 'varchar', length: 20, nullable: true }) rut?: string;
  @Column('text', { array: true, default: '{}', name: 'telefonos_adicionales' }) telefonosAdicionales: string[];
  @Column('text', { array: true, default: '{}', name: 'correos_adicionales' }) correosAdicionales: string[];
  @Column({ default: true }) activo: boolean;
  @Exclude() @Column({ type: 'varchar', nullable: true, name: 'hashed_refresh_token' }) hashedRefreshToken: string | null;
  @Exclude() @Column({ type: 'varchar', nullable: true, name: 'reset_password_token' }) resetPasswordToken: string | null;
  @Exclude() @Column({ type: 'timestamp', nullable: true, name: 'reset_password_expires' }) resetPasswordExpires: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
