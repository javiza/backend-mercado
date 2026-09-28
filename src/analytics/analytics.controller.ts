import { Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.enum';

@ApiTags('analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('resumen') resumen() { return this.analytics.resumen(); }

  @Get('ventas-diarias')
  ventasDiarias(@Query('dias') dias?: string) { return this.analytics.ventasDiarias(Number(dias ?? 30)); }

  @Get('top-productos')
  topProductos(@Query('limite') limite?: string) { return this.analytics.topProductos(Number(limite ?? 10)); }

  @Get('categorias')
  categorias(@Query('meses') meses?: string) { return this.analytics.categorias(Number(meses ?? 6)); }

  @Get('stock') stock() { return this.analytics.stock(); }

  /** Fuerza el refresco de las vistas (normalmente lo hace solo cada 5 min). */
  @Post('refresh') @HttpCode(200)
  async refresh() { return { refrescado: await this.analytics.refrescar() }; }
}
