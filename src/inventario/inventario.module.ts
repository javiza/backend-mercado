import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IngresoMercaderia } from './entities/ingreso-mercaderia.entity';
import { IngresoMercaderiaDetalle } from './entities/ingreso-mercaderia-detalle.entity';
import { MovimientoStock } from './entities/movimiento-stock.entity';
import { InventarioService } from './inventario.service';
import { InventarioController } from './inventario.controller';
import { ProductosModule } from '../productos/productos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IngresoMercaderia,
      IngresoMercaderiaDetalle,
      MovimientoStock,
    ]),
    ProductosModule,
  ],
  controllers: [InventarioController],
  providers: [InventarioService],
  exports: [InventarioService],
})
export class InventarioModule {}
