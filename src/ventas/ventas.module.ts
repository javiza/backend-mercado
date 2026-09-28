import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Venta } from './entities/venta.entity';
import { VentaDetalle } from './entities/venta-detalle.entity';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { ProductosModule } from '../productos/productos.module';

@Module({
  imports: [TypeOrmModule.forFeature([Venta, VentaDetalle]), ProductosModule],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
