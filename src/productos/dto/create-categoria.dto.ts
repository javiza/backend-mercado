import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
