import { IsArray, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class RegistroClienteDto {
  @IsString() @MaxLength(150) nombre: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsOptional() @IsString() @MaxLength(50) telefono?: string;
  @IsOptional() @IsString() @MaxLength(20) rut?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) telefonosAdicionales?: string[];
  @IsOptional() @IsArray() @IsEmail({}, { each: true }) correosAdicionales?: string[];
}
