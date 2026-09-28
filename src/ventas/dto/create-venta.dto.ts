import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

class DetalleVentaDto {
  @IsInt()
  productoId: number;

  @IsInt()
  @Min(1)
  cantidad: number;
}

export class CreateVentaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleVentaDto)
  detalles: DetalleVentaDto[];

  // Solo aplica al canal ONLINE (retiro/despacho a domicilio).
  @IsOptional()
  @IsString()
  direccionEntrega?: string;

  @IsOptional()
  @IsString()
  notas?: string;

  // Solo lo usa el cajero al vender en mostrador a un cliente que sí tiene
  // cuenta (para que la compra le quede en su historial). Si no se manda,
  // la venta de mostrador queda sin cliente asociado.
  @IsOptional()
  @IsInt()
  clienteId?: number;
}
