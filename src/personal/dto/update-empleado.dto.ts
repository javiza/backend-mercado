import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateEmpleadoDto } from './create-empleado.dto';

// usuarioId no se edita: si cambió de cuenta, se crea una ficha nueva.
export class UpdateEmpleadoDto extends PartialType(
  OmitType(CreateEmpleadoDto, ['usuarioId'] as const),
) {}
