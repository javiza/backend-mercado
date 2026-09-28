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

import { Cliente } from './entities/cliente.entity';
import { RegistroClienteDto } from '../clientes-auth/dto/registro-cliente.dto';
import { UpdateClienteAdminDto } from './dto/update-cliente-admin.dto';
import { UpdatePerfilClienteDto } from '../clientes-auth/dto/update-perfil-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
  ) {}

  async registrar(dto: RegistroClienteDto): Promise<Cliente> {
    const existe = await this.clienteRepository.findOne({
      where: { email: dto.email },
    });

    if (existe) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const password = await bcrypt.hash(dto.password, getBcryptRounds());

    const cliente = this.clienteRepository.create({
      nombre: dto.nombre,
      email: dto.email,
      telefono: dto.telefono,
      rut: dto.rut,
      telefonosAdicionales: dto.telefonosAdicionales ?? [],
      correosAdicionales: dto.correosAdicionales ?? [],
      password,
      activo: true,
    });

    return this.clienteRepository.save(cliente);
  }

  async findByEmail(email: string): Promise<Cliente | null> {
    return this.clienteRepository.findOne({ where: { email } });
  }

  async findOne(id: number): Promise<Cliente> {
    const cliente = await this.clienteRepository.findOne({ where: { id } });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return cliente;
  }

  async updateRefreshToken(id: number, refreshToken: string): Promise<void> {
    const hashed = hashToken(refreshToken);
    await this.clienteRepository.update(id, { hashedRefreshToken: hashed });
  }

  /** Logout: invalida el refresh token actual. */
  async clearRefreshToken(id: number): Promise<void> {
    await this.clienteRepository.update(id, { hashedRefreshToken: null });
  }

  /**
   * Panel admin: gestión de clientes (requerimiento "gestionar usuarios
   * clientes"). `q`, si viene, filtra por nombre, email o RUT
   * (case-insensitive, coincidencia parcial) — el admin normalmente
   * busca por uno de esos tres datos para ubicar a un cliente puntual.
   */
  async findAll(q?: string): Promise<Cliente[]> {
    if (!q) {
      return this.clienteRepository.find({ order: { createdAt: 'DESC' } });
    }

    const termino = `%${q.trim()}%`;
    return this.clienteRepository
      .createQueryBuilder('cliente')
      .where('cliente.nombre ILIKE :termino', { termino })
      .orWhere('cliente.email ILIKE :termino', { termino })
      .orWhere('cliente.rut ILIKE :termino', { termino })
      .orderBy('cliente.createdAt', 'DESC')
      .getMany();
  }

  async deactivate(id: number): Promise<Cliente> {
    const cliente = await this.findOne(id);
    cliente.activo = false;
    return this.clienteRepository.save(cliente);
  }

  /**
   * Edición de datos por el cliente (perfil propio) o por el admin.
   * El email es el usuario de login, así que si viene y cambia se
   * valida que no choque con la cuenta de otro cliente antes de
   * guardarlo.
   */
  async actualizar(
    id: number,
    dto: UpdateClienteAdminDto | UpdatePerfilClienteDto,
  ): Promise<Cliente> {
    const cliente = await this.findOne(id);

    const nuevoEmail = (dto as UpdatePerfilClienteDto).email;
    if (nuevoEmail && nuevoEmail !== cliente.email) {
      const existe = await this.clienteRepository.findOne({
        where: { email: nuevoEmail },
      });
      if (existe) {
        throw new ConflictException('Ya existe una cuenta con ese email');
      }
    }

    Object.assign(cliente, dto);
    return this.clienteRepository.save(cliente);
  }

  async reactivate(id: number): Promise<Cliente> {
    const cliente = await this.findOne(id);
    cliente.activo = true;
    return this.clienteRepository.save(cliente);
  }

  /**
   * Elimina la cuenta de forma definitiva (a diferencia de
   * deactivate/reactivate, que solo cambian `activo`). Reservas,
   * cotizaciones y movimientos financieros referencian cliente_id con
   * onDelete: 'SET NULL', así que borrar un cliente no rompe ese
   * historial: esas filas quedan sin cliente vinculado pero conservan
   * sus propios datos (nombreCliente/emailCliente en reservas, etc.).
   */
  async eliminar(id: number): Promise<void> {
    const cliente = await this.findOne(id);
    await this.clienteRepository.remove(cliente);
  }

  /** Cambio de contraseña propio del cliente autenticado. Mismo criterio que UsersService.cambiarPassword. */
  async cambiarPassword(
    clienteId: number,
    passwordActual: string,
    passwordNueva: string,
  ): Promise<void> {
    const cliente = await this.findOne(clienteId);

    const coincide = await bcrypt.compare(passwordActual, cliente.password);
    if (!coincide) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    cliente.password = await bcrypt.hash(passwordNueva, getBcryptRounds());
    await this.clienteRepository.save(cliente);
  }

  /**
   * Genera un token de reseteo (válido 1 hora) y lo guarda hasheado.
   * Devuelve el token EN CRUDO (solo para que el caller lo mande por
   * correo) o null si no existe una cuenta activa con ese email — el
   * caller debe responder igual en ambos casos (ver
   * ClientesAuthService.forgotPassword) para no filtrar qué emails
   * están registrados.
   */
  async generarTokenReseteo(
    email: string,
  ): Promise<{ cliente: Cliente; token: string } | null> {
    const cliente = await this.findByEmail(email);
    if (!cliente || !cliente.activo) return null;

    const token = randomBytes(32).toString('hex');
    cliente.resetPasswordToken = hashToken(token);
    cliente.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await this.clienteRepository.save(cliente);

    return { cliente, token };
  }

  /** Restablece la contraseña usando el token enviado por correo (ver generarTokenReseteo). */
  async resetearPasswordConToken(
    token: string,
    passwordNueva: string,
  ): Promise<void> {
    // No hay forma de buscar directo por el token crudo (se guarda
    // hasheado), así que se trae a los candidatos con un token vigente
    // y se compara en tiempo constante con tokenMatches — mismo patrón
    // que el refresh token.
    const candidatos = await this.clienteRepository
      .createQueryBuilder('cliente')
      .where('cliente.resetPasswordToken IS NOT NULL')
      .andWhere('cliente.resetPasswordExpires > :ahora', { ahora: new Date() })
      .getMany();

    const cliente = candidatos.find((c) =>
      tokenMatches(token, c.resetPasswordToken as string),
    );

    if (!cliente) {
      throw new BadRequestException(
        'El enlace de recuperación no es válido o venció',
      );
    }

    cliente.password = await bcrypt.hash(passwordNueva, getBcryptRounds());
    cliente.resetPasswordToken = null;
    cliente.resetPasswordExpires = null;
    // Invalida también cualquier sesión activa, como al cambiar la
    // contraseña desde "Mi cuenta".
    cliente.hashedRefreshToken = null;
    await this.clienteRepository.save(cliente);
  }
}
