import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateProductoDto } from './create-producto.dto';

// stockActual queda fuera de la edición manual a propósito (ver nota en
// la entidad); se ajusta solo vía InventarioService o VentasService.
export class UpdateProductoDto extends PartialType(
  OmitType(CreateProductoDto, ['stockActual'] as const),
) {}
