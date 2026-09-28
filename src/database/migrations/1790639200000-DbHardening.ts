import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Endurece la base para volumen alto (ventas/pagos/movimientos de stock):
 *  1. Restricciones CHECK (integridad que no depende de que el código siempre valide bien).
 *  2. Índices (búsqueda de productos con ILIKE, historial por cliente, reportes por fecha, etc.).
 *  3. Triggers: updated_at, transiciones válidas de estado, auditoría inmutable, outbox de eventos.
 *  4. Vistas materializadas para reportes (se refrescan sin bloquear lecturas).
 *
 * Todo es idempotente (IF NOT EXISTS / CREATE OR REPLACE) para poder re-ejecutarlo sin romper nada.
 * Nota: en tablas ya enormes conviene crear los índices con CREATE INDEX CONCURRENTLY a mano, fuera
 * de una transacción. Con el volumen de un supermercado que recién parte, esto es instantáneo.
 */
export class DbHardening1790639200000 implements MigrationInterface {
  name = 'DbHardening1790639200000';

  public async up(q: QueryRunner): Promise<void> {
    // ───────────────────────── Extensiones ─────────────────────────
    // pg_trgm acelera los ILIKE '%texto%' del buscador de productos (Render la soporta).
    await q.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // ───────────────────────── 1. CHECK constraints ─────────────────────────
    const checks: [string, string, string][] = [
      ['productos', 'ck_productos_stock_no_negativo', 'stock_actual >= 0'],
      ['productos', 'ck_productos_stock_minimo', 'stock_minimo >= 0'],
      ['productos', 'ck_productos_precios', 'precio_venta >= 0 AND precio_costo >= 0'],
      ['ventas', 'ck_ventas_montos', 'subtotal >= 0 AND total >= 0'],
      ['ventas_detalle', 'ck_ventas_detalle_valores', 'cantidad > 0 AND precio_unitario >= 0'],
      ['pagos', 'ck_pagos_monto_positivo', 'monto > 0'],
      ['ingresos_mercaderia_detalle', 'ck_ingresos_detalle_valores', 'cantidad > 0 AND costo_unitario >= 0'],
      ['cajas', 'ck_cajas_apertura', 'monto_apertura >= 0'],
    ];
    for (const [tabla, nombre, expr] of checks) {
      await q.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${nombre}') THEN
            ALTER TABLE "${tabla}" ADD CONSTRAINT ${nombre} CHECK (${expr});
          END IF;
        END $$;`);
    }

    // ───────────────────────── 2. Índices ─────────────────────────
    const indices = [
      // Buscador de productos (nombre/sku/código de barra con ILIKE '%q%')
      `CREATE INDEX IF NOT EXISTS idx_productos_nombre_trgm ON productos USING gin (nombre gin_trgm_ops)`,
      `CREATE INDEX IF NOT EXISTS idx_productos_sku_trgm ON productos USING gin (sku gin_trgm_ops)`,
      `CREATE INDEX IF NOT EXISTS idx_productos_codigo_barra_trgm ON productos USING gin (codigo_barra gin_trgm_ops)`,
      // Escaneo exacto de código de barra en caja
      `CREATE INDEX IF NOT EXISTS idx_productos_codigo_barra ON productos (codigo_barra) WHERE codigo_barra IS NOT NULL`,
      // Catálogo público: solo activos y visibles, por categoría y nombre
      `CREATE INDEX IF NOT EXISTS idx_productos_catalogo ON productos (categoria_id, nombre) WHERE activo AND visible_tienda`,
      `CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos (categoria_id)`,
      // Alerta de stock bajo: el índice solo contiene los productos en alerta
      `CREATE INDEX IF NOT EXISTS idx_productos_stock_bajo ON productos (stock_actual) WHERE activo AND stock_actual <= stock_minimo`,

      // Ventas
      `CREATE INDEX IF NOT EXISTS idx_ventas_cliente_fecha ON ventas (cliente_id, creado_en DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_ventas_estado_fecha ON ventas (estado, creado_en DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_ventas_creado_brin ON ventas USING brin (creado_en)`,
      `CREATE INDEX IF NOT EXISTS idx_ventas_detalle_venta ON ventas_detalle (venta_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ventas_detalle_producto ON ventas_detalle (producto_id)`,

      // Pagos y caja
      `CREATE INDEX IF NOT EXISTS idx_pagos_venta_estado ON pagos (venta_id, estado)`,
      `CREATE INDEX IF NOT EXISTS idx_pagos_caja_efectivo ON pagos (caja_id) WHERE medio = 'EFECTIVO' AND estado = 'CONFIRMADO'`,
      `CREATE INDEX IF NOT EXISTS idx_pagos_creado_brin ON pagos USING brin (creado_en)`,
      // Un usuario no puede tener dos cajas abiertas (la regla ya la valida el código; aquí la garantiza la BD)
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_cajas_una_abierta_por_usuario ON cajas (usuario_id) WHERE estado = 'ABIERTA'`,

      // Inventario
      `CREATE INDEX IF NOT EXISTS idx_movimientos_producto_fecha ON movimientos_stock (producto_id, creado_en DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_movimientos_tipo_fecha ON movimientos_stock (tipo, creado_en DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_ingresos_detalle_ingreso ON ingresos_mercaderia_detalle (ingreso_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ingresos_detalle_producto ON ingresos_mercaderia_detalle (producto_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ingresos_proveedor ON ingresos_mercaderia (proveedor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON ingresos_mercaderia (creado_en DESC)`,

      // Personal
      `CREATE INDEX IF NOT EXISTS idx_turnos_empleado_fecha ON turnos (empleado_id, fecha)`,
      `CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos (fecha)`,
    ];
    for (const sql of indices) await q.query(sql);

    // ───────────────────────── 3. Triggers ─────────────────────────
    // 3a. updated_at / actualizado_en siempre al día (también en UPDATEs hechos por SQL directo)
    await q.query(`
      CREATE OR REPLACE FUNCTION fn_set_actualizado_en() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN NEW.actualizado_en := now(); RETURN NEW; END $$;`);
    await q.query(`
      CREATE OR REPLACE FUNCTION fn_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN NEW.updated_at := now(); RETURN NEW; END $$;`);
    for (const t of ['productos', 'ventas']) {
      await q.query(`DROP TRIGGER IF EXISTS trg_${t}_actualizado_en ON ${t}`);
      await q.query(`CREATE TRIGGER trg_${t}_actualizado_en BEFORE UPDATE ON ${t}
                     FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en()`);
    }
    for (const t of ['clientes', 'usuarios']) {
      await q.query(`DROP TRIGGER IF EXISTS trg_${t}_updated_at ON ${t}`);
      await q.query(`CREATE TRIGGER trg_${t}_updated_at BEFORE UPDATE ON ${t}
                     FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()`);
    }

    // 3b. Máquina de estados de la venta (misma regla que VentasService, pero a prueba de bypass)
    await q.query(`
      CREATE OR REPLACE FUNCTION fn_ventas_validar_transicion() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NOT (
          (OLD.estado = 'PENDIENTE_PAGO' AND NEW.estado IN ('PAGADA', 'ANULADA')) OR
          (OLD.estado = 'PAGADA'         AND NEW.estado IN ('ENTREGADA', 'ANULADA'))
        ) THEN
          RAISE EXCEPTION 'Transición de estado inválida en la venta %: % -> %', OLD.id, OLD.estado, NEW.estado
            USING ERRCODE = 'check_violation';
        END IF;
        IF NEW.estado = 'ENTREGADA' AND NEW.canal <> 'ONLINE' THEN
          RAISE EXCEPTION 'Solo las ventas ONLINE pueden pasar a ENTREGADA (venta %)', OLD.id
            USING ERRCODE = 'check_violation';
        END IF;
        RETURN NEW;
      END $$;`);
    await q.query(`DROP TRIGGER IF EXISTS trg_ventas_transicion_estado ON ventas`);
    await q.query(`CREATE TRIGGER trg_ventas_transicion_estado BEFORE UPDATE OF estado ON ventas
                   FOR EACH ROW WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
                   EXECUTE FUNCTION fn_ventas_validar_transicion()`);

    // 3c. movimientos_stock es auditoría: no se edita ni se borra (salvo el borrado en cascada si se elimina el producto)
    await q.query(`
      CREATE OR REPLACE FUNCTION fn_movimientos_stock_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN RETURN OLD; END IF;
        RAISE EXCEPTION 'movimientos_stock es un registro de auditoría: no se puede % ', lower(TG_OP)
          USING ERRCODE = 'restrict_violation';
      END $$;`);
    await q.query(`DROP TRIGGER IF EXISTS trg_movimientos_stock_inmutable ON movimientos_stock`);
    await q.query(`CREATE TRIGGER trg_movimientos_stock_inmutable BEFORE UPDATE OR DELETE ON movimientos_stock
                   FOR EACH ROW EXECUTE FUNCTION fn_movimientos_stock_inmutable()`);

    // ───────────────────────── 3d. Outbox transaccional de eventos ─────────────────────────
    // Los triggers escriben el evento EN LA MISMA TRANSACCIÓN que el cambio: si el cambio se revierte, el
    // evento también. Un worker (OutboxPublisher) los publica a Redis Streams o Kafka. Nunca se pierden eventos.
    await q.query(`
      CREATE TABLE IF NOT EXISTS outbox_eventos (
        id            bigserial PRIMARY KEY,
        tipo          varchar(60)  NOT NULL,
        agregado      varchar(40)  NOT NULL,
        agregado_id   bigint       NOT NULL,
        payload       jsonb        NOT NULL,
        creado_en     timestamptz  NOT NULL DEFAULT now(),
        publicado_en  timestamptz,
        intentos      int          NOT NULL DEFAULT 0,
        ultimo_error  text
      )`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_outbox_pendientes ON outbox_eventos (id) WHERE publicado_en IS NULL`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_outbox_publicados ON outbox_eventos (publicado_en) WHERE publicado_en IS NOT NULL`);

    await q.query(`
      CREATE OR REPLACE FUNCTION fn_outbox_ventas() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          -- La app inserta la venta con total 0 y lo fija al final de la transacción: ahí ya existen sus líneas.
          IF OLD.total = 0 AND NEW.total > 0 THEN
            INSERT INTO outbox_eventos (tipo, agregado, agregado_id, payload)
            VALUES ('venta.creada', 'venta', NEW.id, jsonb_build_object(
              'id', NEW.id, 'canal', NEW.canal, 'estado', NEW.estado, 'total', NEW.total,
              'clienteId', NEW.cliente_id,
              'items', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                          'productoId', d.producto_id, 'cantidad', d.cantidad, 'precioUnitario', d.precio_unitario))
                        FROM ventas_detalle d WHERE d.venta_id = NEW.id), '[]'::jsonb)));
          END IF;
          IF OLD.estado IS DISTINCT FROM NEW.estado THEN
            INSERT INTO outbox_eventos (tipo, agregado, agregado_id, payload)
            VALUES ('venta.estado_cambiado', 'venta', NEW.id, jsonb_build_object(
              'id', NEW.id, 'canal', NEW.canal, 'de', OLD.estado, 'a', NEW.estado, 'total', NEW.total));
          END IF;
        END IF;
        RETURN NULL;
      END $$;`);
    await q.query(`DROP TRIGGER IF EXISTS trg_outbox_ventas ON ventas`);
    await q.query(`CREATE TRIGGER trg_outbox_ventas AFTER UPDATE ON ventas
                   FOR EACH ROW EXECUTE FUNCTION fn_outbox_ventas()`);

    await q.query(`
      CREATE OR REPLACE FUNCTION fn_outbox_pagos() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          INSERT INTO outbox_eventos (tipo, agregado, agregado_id, payload)
          VALUES ('pago.registrado', 'pago', NEW.id, jsonb_build_object(
            'id', NEW.id, 'ventaId', NEW.venta_id, 'medio', NEW.medio, 'estado', NEW.estado, 'monto', NEW.monto));
        ELSIF OLD.estado IS DISTINCT FROM NEW.estado THEN
          INSERT INTO outbox_eventos (tipo, agregado, agregado_id, payload)
          VALUES ('pago.estado_cambiado', 'pago', NEW.id, jsonb_build_object(
            'id', NEW.id, 'ventaId', NEW.venta_id, 'de', OLD.estado, 'a', NEW.estado, 'monto', NEW.monto));
        END IF;
        RETURN NULL;
      END $$;`);
    await q.query(`DROP TRIGGER IF EXISTS trg_outbox_pagos ON pagos`);
    await q.query(`CREATE TRIGGER trg_outbox_pagos AFTER INSERT OR UPDATE ON pagos
                   FOR EACH ROW EXECUTE FUNCTION fn_outbox_pagos()`);

    // Evento solo al CRUZAR el umbral (no en cada venta posterior con stock ya bajo)
    await q.query(`
      CREATE OR REPLACE FUNCTION fn_outbox_stock_bajo() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        INSERT INTO outbox_eventos (tipo, agregado, agregado_id, payload)
        VALUES ('producto.stock_bajo', 'producto', NEW.id, jsonb_build_object(
          'id', NEW.id, 'nombre', NEW.nombre, 'stockActual', NEW.stock_actual, 'stockMinimo', NEW.stock_minimo));
        RETURN NULL;
      END $$;`);
    await q.query(`DROP TRIGGER IF EXISTS trg_outbox_stock_bajo ON productos`);
    await q.query(`CREATE TRIGGER trg_outbox_stock_bajo AFTER UPDATE OF stock_actual ON productos
                   FOR EACH ROW WHEN (NEW.activo AND OLD.stock_actual > OLD.stock_minimo
                                      AND NEW.stock_actual <= NEW.stock_minimo)
                   EXECUTE FUNCTION fn_outbox_stock_bajo()`);

    // ───────────────────────── 4. Vistas materializadas ─────────────────────────
    // Fechas en hora de Chile (el servidor guarda en UTC). Cada vista tiene índice UNIQUE para poder
    // refrescarla con CONCURRENTLY (los reportes siguen leyendo mientras se actualiza).
    const local = (col: string) => `((${col} AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')`;

    await q.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ventas_diarias AS
      SELECT ${local('v.creado_en')}::date AS fecha,
             v.canal::text AS canal,
             count(*)::int AS ventas,
             sum(v.total)::numeric(14,2) AS total,
             round(avg(v.total), 2)::numeric(12,2) AS ticket_promedio
      FROM ventas v
      WHERE v.estado IN ('PAGADA', 'ENTREGADA')
      GROUP BY 1, 2
      WITH DATA`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_ventas_diarias ON mv_ventas_diarias (fecha, canal)`);

    await q.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_productos_30d AS
      SELECT p.id AS producto_id,
             p.nombre,
             COALESCE(p.categoria_id, 0) AS categoria_id,
             sum(d.cantidad)::int AS unidades,
             sum(d.subtotal)::numeric(14,2) AS ingresos,
             sum(d.subtotal - d.cantidad * p.precio_costo)::numeric(14,2) AS margen_estimado,
             count(DISTINCT d.venta_id)::int AS ventas
      FROM ventas_detalle d
      JOIN ventas v    ON v.id = d.venta_id
      JOIN productos p ON p.id = d.producto_id
      WHERE v.estado IN ('PAGADA', 'ENTREGADA') AND v.creado_en >= now() - interval '30 days'
      GROUP BY p.id
      WITH DATA`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_top_productos_30d ON mv_top_productos_30d (producto_id)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_mv_top_productos_unidades ON mv_top_productos_30d (unidades DESC)`);

    await q.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ventas_categoria_mensual AS
      SELECT date_trunc('month', ${local('v.creado_en')})::date AS mes,
             COALESCE(p.categoria_id, 0) AS categoria_id,
             COALESCE(c.nombre, 'Sin categoría') AS categoria,
             sum(d.cantidad)::int AS unidades,
             sum(d.subtotal)::numeric(14,2) AS ingresos
      FROM ventas_detalle d
      JOIN ventas v    ON v.id = d.venta_id
      JOIN productos p ON p.id = d.producto_id
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE v.estado IN ('PAGADA', 'ENTREGADA')
      GROUP BY 1, 2, 3
      WITH DATA`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_ventas_categoria_mensual ON mv_ventas_categoria_mensual (mes, categoria_id)`);

    await q.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_stock_por_categoria AS
      SELECT COALESCE(p.categoria_id, 0) AS categoria_id,
             COALESCE(c.nombre, 'Sin categoría') AS categoria,
             count(*)::int AS productos,
             sum(p.stock_actual)::bigint AS unidades,
             sum(p.stock_actual * p.precio_costo)::numeric(16,2) AS valor_costo,
             sum(p.stock_actual * p.precio_venta)::numeric(16,2) AS valor_venta,
             count(*) FILTER (WHERE p.stock_actual <= p.stock_minimo)::int AS productos_stock_bajo
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.activo
      GROUP BY 1, 2
      WITH DATA`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_stock_por_categoria ON mv_stock_por_categoria (categoria_id)`);

    await q.query(`
      CREATE OR REPLACE FUNCTION refrescar_vistas_analiticas() RETURNS void LANGUAGE plpgsql AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ventas_diarias;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_productos_30d;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ventas_categoria_mensual;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stock_por_categoria;
      END $$;`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP FUNCTION IF EXISTS refrescar_vistas_analiticas()`);
    for (const v of ['mv_stock_por_categoria', 'mv_ventas_categoria_mensual', 'mv_top_productos_30d', 'mv_ventas_diarias']) {
      await q.query(`DROP MATERIALIZED VIEW IF EXISTS ${v}`);
    }
    for (const [t, trg] of [
      ['productos', 'trg_outbox_stock_bajo'], ['pagos', 'trg_outbox_pagos'], ['ventas', 'trg_outbox_ventas'],
      ['movimientos_stock', 'trg_movimientos_stock_inmutable'], ['ventas', 'trg_ventas_transicion_estado'],
      ['productos', 'trg_productos_actualizado_en'], ['ventas', 'trg_ventas_actualizado_en'],
      ['clientes', 'trg_clientes_updated_at'], ['usuarios', 'trg_usuarios_updated_at'],
    ]) await q.query(`DROP TRIGGER IF EXISTS ${trg} ON ${t}`);
    for (const f of [
      'fn_outbox_stock_bajo', 'fn_outbox_pagos', 'fn_outbox_ventas', 'fn_movimientos_stock_inmutable',
      'fn_ventas_validar_transicion', 'fn_set_actualizado_en', 'fn_set_updated_at',
    ]) await q.query(`DROP FUNCTION IF EXISTS ${f}()`);
    await q.query(`DROP TABLE IF EXISTS outbox_eventos`);
    for (const i of [
      'idx_productos_nombre_trgm', 'idx_productos_sku_trgm', 'idx_productos_codigo_barra_trgm', 'idx_productos_codigo_barra',
      'idx_productos_catalogo', 'idx_productos_categoria', 'idx_productos_stock_bajo', 'idx_ventas_cliente_fecha',
      'idx_ventas_estado_fecha', 'idx_ventas_creado_brin', 'idx_ventas_detalle_venta', 'idx_ventas_detalle_producto',
      'idx_pagos_venta_estado', 'idx_pagos_caja_efectivo', 'idx_pagos_creado_brin', 'uq_cajas_una_abierta_por_usuario',
      'idx_movimientos_producto_fecha', 'idx_movimientos_tipo_fecha', 'idx_ingresos_detalle_ingreso',
      'idx_ingresos_detalle_producto', 'idx_ingresos_proveedor', 'idx_ingresos_fecha', 'idx_turnos_empleado_fecha',
      'idx_turnos_fecha',
    ]) await q.query(`DROP INDEX IF EXISTS ${i}`);
    for (const [t, c] of [
      ['productos', 'ck_productos_stock_no_negativo'], ['productos', 'ck_productos_stock_minimo'],
      ['productos', 'ck_productos_precios'], ['ventas', 'ck_ventas_montos'], ['ventas_detalle', 'ck_ventas_detalle_valores'],
      ['pagos', 'ck_pagos_monto_positivo'], ['ingresos_mercaderia_detalle', 'ck_ingresos_detalle_valores'],
      ['cajas', 'ck_cajas_apertura'],
    ]) await q.query(`ALTER TABLE ${t} DROP CONSTRAINT IF EXISTS ${c}`);
  }
}
