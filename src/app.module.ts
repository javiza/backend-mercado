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
import { RedisModule } from './redis/redis.module';
import { EventsModule } from './events/events.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthController } from './health/health.controller';
import { buildTypeOrmOptions } from './database/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // El esquema lo manejan las migraciones (src/database/migrations). Ver typeorm.config.ts.
    TypeOrmModule.forRoot({ ...buildTypeOrmOptions(), autoLoadEntities: true }),
    RedisModule,
    TypeOrmModule.forFeature([User, Categoria]),
    AuthModule, UsersModule, ClientesModule, ClientesAuthModule, ProductosModule,
    InventarioModule, VentasModule, PagosModule, PersonalModule, ProveedoresMercaderiaModule,
    EventsModule, AnalyticsModule,
  ],
  controllers: [HealthController],
  providers: [SeedService],
})
export class AppModule {}
