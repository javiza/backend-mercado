import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProveedorMercaderia } from './entities/proveedor-mercaderia.entity';
import { ProveedoresMercaderiaService } from './proveedores-mercaderia.service';
import { ProveedoresMercaderiaController } from './proveedores-mercaderia.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProveedorMercaderia])],
  controllers: [ProveedoresMercaderiaController],
  providers: [ProveedoresMercaderiaService],
  exports: [TypeOrmModule, ProveedoresMercaderiaService],
})
export class ProveedoresMercaderiaModule {}
