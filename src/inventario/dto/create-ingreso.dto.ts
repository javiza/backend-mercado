import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';

class DetalleIngresoDto {
  @IsInt()
  productoId: number;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsNumber()
  @Min(0)
  costoUnitario: number;
}

export class CreateIngresoDto {
  @IsOptional()
  @IsInt()
  proveedorId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  numeroDocumento?: string;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleIngresoDto)
  detalles: DetalleIngresoDto[];
}
