import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CacheService } from '../redis/cache.service';

const LOCK_ID = 727_001; // clave del advisory lock: un solo refresco a la vez entre todas las instancias
const TZ = 'America/Santiago';

const clamp = (n: number, min: number, max: number, def: number) =>
  Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), min), max) : def;

@Injectable()
export class AnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Analytics');
  private timer?: NodeJS.Timeout;
  private lastRefresh: Date | null = null;

  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly cache: CacheService) {}

  onModuleInit() {
    const ms = Number(process.env.ANALYTICS_REFRESH_MS ?? 300_000); // cada 5 min; 0 = desactivado
    if (ms > 0) {
      this.timer = setInterval(() => void this.refrescar().catch(() => undefined), ms);
      this.timer.unref();
    }
  }
  onModuleDestroy() { clearInterval(this.timer); }

  /** Refresca las vistas materializadas sin bloquear lecturas. Devuelve false si otra instancia ya lo está haciendo. */
  async refrescar(): Promise<boolean> {
    try {
      const ok = await this.ds.transaction(async (m) => {
        const [{ ok }] = await m.query(`SELECT pg_try_advisory_xact_lock($1) AS ok`, [LOCK_ID]);
        if (!ok) return false;
        await m.query(`SELECT refrescar_vistas_analiticas()`);
        return true;
      });
      if (ok) { this.lastRefresh = new Date(); await this.cache.bump('analytics'); }
      return ok;
    } catch (e) {
      this.log.warn(`No se pudieron refrescar las vistas: ${(e as Error).message}`);
      throw e;
    }
  }

  resumen() {
    return this.cache.wrap('analytics', 'resumen', 60, async () => {
      const [r] = await this.ds.query(`
        WITH hoy AS (SELECT (now() AT TIME ZONE '${TZ}')::date AS d)
        SELECT
          COALESCE(sum(total)   FILTER (WHERE fecha = hoy.d), 0)                                  AS total_hoy,
          COALESCE(sum(ventas)  FILTER (WHERE fecha = hoy.d), 0)::int                             AS ventas_hoy,
          COALESCE(sum(total)   FILTER (WHERE date_trunc('month', fecha) = date_trunc('month', hoy.d)), 0) AS total_mes,
          COALESCE(sum(ventas)  FILTER (WHERE date_trunc('month', fecha) = date_trunc('month', hoy.d)), 0)::int AS ventas_mes
        FROM mv_ventas_diarias, hoy`);
      const [s] = await this.ds.query(
        `SELECT COALESCE(sum(productos_stock_bajo),0)::int AS stock_bajo, COALESCE(sum(valor_costo),0) AS valor_inventario FROM mv_stock_por_categoria`);
      return {
        hoy: { ventas: r.ventas_hoy, total: Number(r.total_hoy) },
        mes: { ventas: r.ventas_mes, total: Number(r.total_mes) },
        stockBajo: s.stock_bajo,
        valorInventario: Number(s.valor_inventario),
        actualizadoEn: this.lastRefresh,
      };
    });
  }

  ventasDiarias(diasRaw: number) {
    const dias = clamp(diasRaw, 1, 366, 30);
    return this.cache.wrap('analytics', `diarias:${dias}`, 60, async () => {
      const rows = await this.ds.query(
        `SELECT fecha::text AS fecha, canal, ventas, total::float8 AS total, ticket_promedio::float8 AS "ticketPromedio"
           FROM mv_ventas_diarias
          WHERE fecha >= (now() AT TIME ZONE '${TZ}')::date - $1::int
          ORDER BY fecha, canal`, [dias]);
      return rows;
    });
  }

  topProductos(limiteRaw: number) {
    const limite = clamp(limiteRaw, 1, 100, 10);
    return this.cache.wrap('analytics', `top:${limite}`, 60, () => this.ds.query(
      `SELECT producto_id AS "productoId", nombre, unidades, ingresos::float8 AS ingresos,
              margen_estimado::float8 AS "margenEstimado", ventas
         FROM mv_top_productos_30d ORDER BY unidades DESC, ingresos DESC LIMIT $1`, [limite]));
  }

  categorias(mesesRaw: number) {
    const meses = clamp(mesesRaw, 1, 36, 6);
    return this.cache.wrap('analytics', `cat:${meses}`, 60, () => this.ds.query(
      `SELECT mes::text AS mes, categoria_id AS "categoriaId", categoria, unidades, ingresos::float8 AS ingresos
         FROM mv_ventas_categoria_mensual
        WHERE mes >= date_trunc('month', (now() AT TIME ZONE '${TZ}')::date) - make_interval(months => $1::int - 1)
        ORDER BY mes, ingresos DESC`, [meses]));
  }

  stock() {
    return this.cache.wrap('analytics', 'stock', 60, () => this.ds.query(
      `SELECT categoria_id AS "categoriaId", categoria, productos, unidades::float8 AS unidades,
              valor_costo::float8 AS "valorCosto", valor_venta::float8 AS "valorVenta",
              productos_stock_bajo AS "productosStockBajo"
         FROM mv_stock_por_categoria ORDER BY valor_costo DESC`));
  }
}
