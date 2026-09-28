import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';
import { Categoria } from './productos/entities/categoria.entity';
import { SeedService } from './seed.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientesModule } from './clientes/clientes.module';
import { ClientesAuthModule } from './clientes-auth/clientes-auth.module';
import { ProductosModule } from './productos/productos.module';
import { InventarioModule } from './inventario/inventario.module';
import { VentasModule } from './ventas/ventas.module';
import { PagosModule } from './pagos/pagos.module';
import { PersonalModule } from './personal/personal.module';
import { ProveedoresMercaderiaModule } from './proveedores-mercaderia/proveedores-mercaderia.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      autoLoadEntities: true,
      // synchronize crea/actualiza las tablas solo. Cómodo para arrancar; cuando tengas datos reales
      // que cuidar, ponlo en false y usa migraciones.
      synchronize: process.env.DB_SYNC !== 'false',
    }),
    TypeOrmModule.forFeature([User, Categoria]),
    AuthModule, UsersModule, ClientesModule, ClientesAuthModule, ProductosModule,
    InventarioModule, VentasModule, PagosModule, PersonalModule, ProveedoresMercaderiaModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
