import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CreateProveedorMercaderiaDto {
  @IsString()
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rut?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  contacto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  direccion?: string;
}
