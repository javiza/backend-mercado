import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AbrirCajaDto {
  @IsNumber()
  @Min(0)
  montoApertura: number;
}

export class CerrarCajaDto {
  @IsNumber()
  @Min(0)
  montoCierreDeclarado: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
