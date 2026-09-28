import {
  IsInt,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateEmpleadoDto {
  @IsInt()
  usuarioId: number;

  @IsString()
  @MaxLength(100)
  cargo: string;

  @IsNumber()
  @Min(0)
  sueldoBase: number;

  @IsDateString()
  fechaContratacion: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  contactoEmergenciaNombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactoEmergenciaTelefono?: string;
}
