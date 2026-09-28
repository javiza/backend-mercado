import { PartialType } from '@nestjs/mapped-types';
import { CreateProveedorMercaderiaDto } from './create-proveedor-mercaderia.dto';

export class UpdateProveedorMercaderiaDto extends PartialType(CreateProveedorMercaderiaDto) {}
