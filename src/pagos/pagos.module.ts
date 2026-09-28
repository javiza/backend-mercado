import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Pago } from './entities/pago.entity';
import { Caja } from './entities/caja.entity';
import { PagosService } from './pagos.service';
import { PagosController } from './pagos.controller';
import { CajaService } from './caja.service';
import { CajaController } from './caja.controller';
import { VentasModule } from '../ventas/ventas.module';

@Module({
  imports: [TypeOrmModule.forFeature([Pago, Caja]), VentasModule],
  controllers: [PagosController, CajaController],
  providers: [PagosService, CajaService],
  exports: [PagosService, CajaService],
})
export class PagosModule {}
