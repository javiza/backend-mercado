import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigoBarra?: string;

  @IsOptional()
  @IsInt()
  categoriaId?: number;

  @IsNumber()
  @Min(0)
  precioVenta: number;

  @IsNumber()
  @Min(0)
  precioCosto: number;

  // Stock inicial al crear el producto (ej: carga manual/migración). El
  // flujo normal para SUMAR stock después es un Ingreso de mercadería,
  // no editar el producto directamente.
  @IsOptional()
  @IsInt()
  @Min(0)
  stockActual?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockMinimo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unidadMedida?: string;

  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @IsOptional()
  @IsBoolean()
  visibleTienda?: boolean;
}
