import { IsEnum, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { MedioPago } from '../entities/pago.entity';

export class CreatePagoDto {
  @IsEnum(MedioPago)
  medio: MedioPago;

  @IsNumber()
  @Min(1)
  monto: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  referencia?: string;
}
