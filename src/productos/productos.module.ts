import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Producto } from './entities/producto.entity';
import { Categoria } from './entities/categoria.entity';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { CategoriasService } from './categorias.service';
import { CategoriasController } from './categorias.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Producto, Categoria])],
  controllers: [ProductosController, CategoriasController],
  providers: [ProductosService, CategoriasService],
  // Exportado para que InventarioModule pueda inyectar el repositorio de
  // Producto y ajustar stockActual al confirmar un ingreso de mercadería.
  exports: [TypeOrmModule, ProductosService],
})
export class ProductosModule {}
