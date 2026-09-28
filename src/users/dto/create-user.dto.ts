import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../common/constants/roles.enum';

export class CreateUserDto {
  @IsString() @MaxLength(150) nombre: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsEnum(Role) rol: Role;
  @IsOptional() @IsString() @MaxLength(20) rut?: string;
}
