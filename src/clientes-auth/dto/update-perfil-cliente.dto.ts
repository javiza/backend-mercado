import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
export class UpdatePerfilClienteDto {
  @IsOptional() @IsString() @MaxLength(150) nombre?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(50) telefono?: string;
  @IsOptional() @IsString() @MaxLength(20) rut?: string;
}
