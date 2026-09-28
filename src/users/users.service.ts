import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { getBcryptRounds } from '../common/utils/bcrypt-rounds';
import { hashToken, tokenMatches } from '../common/utils/token-hash';

import { User } from './entities/user.entity';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    dto: CreateUserDto,
  ): Promise<User> {
    const exists =
      await this.userRepository.findOne({
        where: {
          email: dto.email,
        },
      });

    if (exists) {
      throw new ConflictException(
        'Email ya registrado',
      );
    }

    const hashedPassword = await bcrypt.hash(
      dto.password,
      getBcryptRounds(),
    );

    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });

    return await this.userRepository.save(
      user,
    );
  }

  // ?q= busca por nombre, email o RUT (coincidencia parcial), igual
  // criterio que ClientesService.findAll — el admin normalmente busca
  // así en el panel de "Usuarios".
  async findAll(q?: string): Promise<User[]> {
    if (!q) {
      return await this.userRepository.find();
    }

    const termino = `%${q.trim()}%`;
    return this.userRepository
      .createQueryBuilder('usuario')
      .where('usuario.nombre ILIKE :termino', { termino })
      .orWhere('usuario.email ILIKE :termino', { termino })
      .orWhere('usuario.rut ILIKE :termino', { termino })
      .getMany();
  }

  async findOne(
    id: number,
  ): Promise<User> {
    const user =
      await this.userRepository.findOne({
        where: { id },
      });

    if (!user) {
      throw new NotFoundException(
        'Usuario no encontrado',
      );
    }

    return user;
  }

  async findByEmail(
    email: string,
  ): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
    });
  }

  /**
   * Edición desde el panel admin (nombre, email, rol, rut y,
   * opcionalmente, una password nueva). Igual criterio que
   * ClientesService.actualizar: si el email viene y cambia, se valida
   * que no choque con otra cuenta antes de guardar. La password nunca
   * se guarda en texto plano ni se toca si el admin la deja vacía —
   * PartialType hace que todos los campos de CreateUserDto sean
   * opcionales acá.
   */
  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.email && dto.email !== user.email) {
      const existe = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (existe) {
        throw new ConflictException('Email ya registrado');
      }
    }

    const { password, ...resto } = dto;
    Object.assign(user, resto);

    if (password) {
      user.password = await bcrypt.hash(password, getBcryptRounds());
    }

    return this.userRepository.save(user);
  }

  /**
   * Elimina la cuenta de forma definitiva (a diferencia de
   * deactivate/reactivate, que solo cambian `activo`). Las tablas que
   * referencian usuarios.id (noticias.autor_id,
   * movimientos_financieros.usuario_id) tienen onDelete: 'SET NULL', así
   * que borrar un usuario no rompe ese historial, solo desvincula al
   * autor. `solicitanteId` es el id de quien hace la petición (del JWT):
   * se bloquea que un SUPER_ADMIN se elimine a sí mismo para no dejar el
   * panel sin nadie con sesión activa.
   */
  async remove(id: number, solicitanteId: number): Promise<void> {
    if (id === solicitanteId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta');
    }

    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async deactivate(
  id: number,
) {
  const user =
    await this.findOne(id);

  user.activo = false;

  return this.userRepository.save(
    user,
  );
}

async reactivate(id: number) {
  const user = await this.findOne(id);
  user.activo = true;
  return this.userRepository.save(user);
}
async updateRefreshToken(
  userId: number,
  refreshToken: string,
): Promise<void> {
  const hashed = hashToken(refreshToken);

  await this.userRepository.update(userId, {
    hashedRefreshToken: hashed,
  });
}

/** Logout: invalida el refresh token actual. Cualquier intento de refresh posterior con el viejo token va a fallar la comparación en AuthService.refresh(). */
async clearRefreshToken(userId: number): Promise<void> {
  await this.userRepository.update(userId, {
    hashedRefreshToken: null,
  });
}

/**
 * Cambio de contraseña propio (cualquier admin/staff autenticado, sin
 * importar su rol). Verifica la contraseña actual antes de aplicar la
 * nueva — ver CambiarPasswordDto para el porqué.
 */
async cambiarPassword(
  userId: number,
  passwordActual: string,
  passwordNueva: string,
): Promise<void> {
  const user = await this.findOne(userId);

  const coincide = await bcrypt.compare(passwordActual, user.password);
  if (!coincide) {
    throw new UnauthorizedException('La contraseña actual no es correcta');
  }

  user.password = await bcrypt.hash(passwordNueva, getBcryptRounds());
  await this.userRepository.save(user);
}

/**
 * Genera un token de reseteo (válido 1 hora) y lo guarda hasheado.
 * Devuelve el token EN CRUDO (solo para que el caller lo mande por
 * correo) o null si no existe una cuenta activa con ese email — el
 * caller debe responder igual en ambos casos (ver
 * AuthService.forgotPassword) para no filtrar qué emails están
 * registrados. Mismo criterio que ClientesService.generarTokenReseteo.
 */
async generarTokenReseteo(
  email: string,
): Promise<{ user: User; token: string } | null> {
  const user = await this.findByEmail(email);
  if (!user || !user.activo) return null;

  const token = randomBytes(32).toString('hex');
  user.resetPasswordToken = hashToken(token);
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  await this.userRepository.save(user);

  return { user, token };
}

/** Restablece la contraseña usando el token enviado por correo (ver generarTokenReseteo). */
async resetearPasswordConToken(
  token: string,
  passwordNueva: string,
): Promise<void> {
  // No hay forma de buscar directo por el token crudo (se guarda
  // hasheado), así que se trae a los candidatos con un token vigente
  // y se compara en tiempo constante con tokenMatches — mismo patrón
  // que el refresh token y que ClientesService.resetearPasswordConToken.
  const candidatos = await this.userRepository
    .createQueryBuilder('usuario')
    .where('usuario.resetPasswordToken IS NOT NULL')
    .andWhere('usuario.resetPasswordExpires > :ahora', { ahora: new Date() })
    .getMany();

  const user = candidatos.find((u) =>
    tokenMatches(token, u.resetPasswordToken as string),
  );

  if (!user) {
    throw new BadRequestException(
      'El enlace de recuperación no es válido o venció',
    );
  }

  user.password = await bcrypt.hash(passwordNueva, getBcryptRounds());
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  // Invalida también cualquier sesión activa, como al cambiar la
  // contraseña desde el perfil.
  user.hashedRefreshToken = null;
  await this.userRepository.save(user);
}

}