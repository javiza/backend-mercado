import { Exclude } from 'class-transformer';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '../../common/constants/roles.enum';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 150 }) nombre: string;
  @Column({ length: 150, unique: true }) email: string;
  @Exclude() @Column() password: string;
  @Column({ type: 'enum', enum: Role, default: Role.ADMIN }) rol: Role;
  @Column({ type: 'varchar', length: 20, nullable: true }) rut?: string;
  @Column({ default: true }) activo: boolean;
  @Exclude() @Column({ type: 'varchar', nullable: true, name: 'hashed_refresh_token' }) hashedRefreshToken: string | null;
  @Exclude() @Column({ type: 'varchar', nullable: true, name: 'reset_password_token' }) resetPasswordToken: string | null;
  @Exclude() @Column({ type: 'timestamp', nullable: true, name: 'reset_password_expires' }) resetPasswordExpires: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
