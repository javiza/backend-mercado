import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum EstadoCaja {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

// Un "turno de caja": el cajero abre con un monto inicial en efectivo,
// recibe pagos durante su turno, y al cerrar declara cuánto contó
// físicamente. La diferencia entre lo esperado y lo declarado es el
// cuadre de caja del turno.
@Entity('cajas')
export class Caja {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'usuario_id' })
  usuarioId: number;

  @Column({ type: 'enum', enum: EstadoCaja, default: EstadoCaja.ABIERTA })
  estado: EstadoCaja;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'monto_apertura' })
  montoApertura: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'monto_cierre_declarado',
  })
  montoCierreDeclarado?: number;

  // apertura + efectivo cobrado durante el turno, calculado al cerrar.
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'monto_esperado',
  })
  montoEsperado?: number;

  // montoCierreDeclarado - montoEsperado. Negativo = falta plata.
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  diferencia?: number;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @CreateDateColumn({ name: 'abierta_en' })
  abiertaEn: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'cerrada_en' })
  cerradaEn?: Date;
}
