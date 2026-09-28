import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './users/entities/user.entity';
import { Categoria } from './productos/entities/categoria.entity';
import { Role } from './common/constants/roles.enum';
import { getBcryptRounds } from './common/utils/bcrypt-rounds';

// Crea la primera cuenta SUPER_ADMIN y unas categorías base si la base está vacía.
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private log = new Logger('Seed');
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Categoria) private categorias: Repository<Categoria>,
  ) {}

  async onApplicationBootstrap() {
    if ((await this.users.count()) === 0) {
      const email = (process.env.SEED_ADMIN_EMAIL || 'admin@supermercado.cl').toLowerCase();
      const password = process.env.SEED_ADMIN_PASSWORD || 'Admin1234!';
      await this.users.save(this.users.create({
        nombre: process.env.SEED_ADMIN_NOMBRE || 'Administrador', email,
        password: await bcrypt.hash(password, getBcryptRounds()), rol: Role.SUPER_ADMIN, activo: true,
      }));
      this.log.log(`Cuenta inicial creada: ${email}`);
    }
    if ((await this.categorias.count()) === 0) {
      const base = ['Frutas y verduras', 'Lácteos', 'Carnes', 'Panadería', 'Despensa', 'Bebidas', 'Aseo y hogar'];
      await this.categorias.save(base.map((nombre) => this.categorias.create({ nombre, activo: true })));
    }
  }
}
