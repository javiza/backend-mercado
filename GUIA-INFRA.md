# Guía: base de datos, Redis, eventos y despliegue en Render

## 1. Levantar todo en local
```bash
docker compose up -d                 # Postgres 16 + Redis 7
cp .env.example .env                 # y ajusta DATABASE_URL=postgres://postgres:postgres@localhost:5432/supermercado
npm install
npm run start:dev                    # las migraciones se aplican solas al arrancar
```
Comprueba: `GET http://localhost:3001/health` → `{"status":"ok","db":"up","redis":"up"}`.

## 2. Migraciones (ya no uses `synchronize`)
| Comando | Qué hace |
|---|---|
| `npm run migration:show` | Lista aplicadas / pendientes |
| `npm run migration:run` | Aplica las pendientes |
| `npm run migration:revert` | Deshace la última |
| `npm run migration:generate -- src/database/migrations/NombreCambio` | Compara tus entidades con la BD y genera la migración |

Flujo normal: cambias una entidad → `migration:generate` → revisas el archivo → `migration:run`.
Las dos migraciones incluidas:
- **Baseline**: crea todas las tablas. Si tu BD ya existía (creada antes con `synchronize`), detecta que ya está y **no toca tus datos**: solo se registra como aplicada.
- **DbHardening**: constraints, índices, triggers, outbox y vistas materializadas (ver abajo). Es idempotente.

## 3. Qué agregó a la base de datos
**Restricciones**: stock nunca negativo, precios ≥ 0, cantidades > 0, pagos > 0, y **una sola caja abierta por usuario** (índice único parcial).

**Índices**: búsqueda de productos con `ILIKE '%texto%'` (trigram, antes hacía recorrido completo de la tabla), catálogo público, alerta de stock bajo (el índice solo contiene los productos en alerta), historial por cliente/fecha, BRIN por fecha en ventas y pagos (diminutos y eficientes para tablas que solo crecen), FKs sin índice.

**Triggers**
- `actualizado_en` / `updated_at` siempre al día, incluso con SQL directo.
- La venta solo puede cambiar de estado por caminos válidos (PENDIENTE_PAGO → PAGADA/ANULADA, PAGADA → ENTREGADA/ANULADA; ENTREGADA y ANULADA son finales).
- `movimientos_stock` es auditoría: no se puede editar ni borrar.
- **Outbox de eventos**: `venta.creada`, `venta.estado_cambiado`, `pago.registrado`, `pago.estado_cambiado`, `producto.stock_bajo` (solo al cruzar el mínimo). Se escriben en la misma transacción que el cambio: si se revierte, el evento también.

**Vistas materializadas** (reportes rápidos aunque tengas millones de ventas): `mv_ventas_diarias`, `mv_top_productos_30d`, `mv_ventas_categoria_mensual`, `mv_stock_por_categoria`. Se refrescan solas cada 5 min con `REFRESH ... CONCURRENTLY` (no bloquea lecturas) y un *advisory lock* evita que dos instancias refresquen a la vez. Fechas en hora de Chile.

## 4. Cambios en tu código existente
- **Sobreventa corregida**: `VentasService.crear/anular` e `InventarioService` ahora bloquean las filas de producto (`FOR UPDATE`) y las toman siempre en el mismo orden. Antes, dos clientes comprando la última unidad a la vez podían ambos pasar la validación de stock. (Probado: 8 compras simultáneas con stock 5 → exactamente 5 ventas y 3 rechazos.)
- Líneas repetidas del mismo producto en una venta se suman antes de validar stock.
- `GET /ventas` ahora es paginado: `?limit=` (por defecto 200, máx. 500) y `?offset=`. Sigue devolviendo un arreglo.
- Caché en Redis (30 s) del catálogo y listados de productos, invalidado al cambiar productos, categorías, ventas o inventario.
- `synchronize` pasó a **desactivado por defecto** (`DB_SYNC=true` para reactivarlo en prototipos).
- Nuevos endpoints (solo SUPER_ADMIN y ADMIN): `GET /analytics/resumen | ventas-diarias | top-productos | categorias | stock`, `POST /analytics/refresh`. `GET /health` público.
- Frontend: nueva página **Reportes** (`/dashboard/admin/reportes`) y el **Resumen** de admins ahora usa esas cifras (cuenta ventas *cobradas*; el cajero mantiene su cálculo anterior).

## 5. Desplegar en Render
1. Sube el backend a su repo (con `render.yaml` en la raíz) → Render → **New → Blueprint**. Crea Postgres, Redis (Key Value) y el web service, ya conectados por red privada.
2. Completa las variables `sync: false`: `CORS_ORIGIN` (URL de tu frontend), `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.
3. Cada deploy corre `npm run migration:run:prod` **antes** de cambiar el tráfico; si la migración falla, sigue sirviendo la versión anterior.
4. En el frontend, `BACKEND_URL` = URL pública del backend.

Si ya tienes una BD en Render con datos: en el Blueprint no crees otra; en el servicio pon `DATABASE_URL` con su **Internal Database URL** (o la External con `DB_SSL=true` si conectas desde fuera de Render). Antes del primer deploy, haz un backup desde el panel de la BD.

## 6. Kafka y Spark: cuándo sí, cuándo no
- **Hoy no los necesitas.** Un supermercado, incluso con millones de ventas, se resuelve bien con Postgres + índices + vistas materializadas + Redis. Kafka y Spark agregan servicios que mantener y pagar (Render no ofrece ninguno de los dos).
- **Kafka queda listo para cuando lo necesites**: el outbox ya publica a Kafka con solo definir `KAFKA_BROKERS` (Upstash, Confluent Cloud, Redpanda Cloud…). Mientras tanto publica en un Redis Stream (`supermercado.eventos`). La integración con Kafka está escrita pero **no la probé contra un broker real** (sí probé que, si el broker no responde, la app sigue sana y los eventos quedan pendientes con el error guardado).
- **Spark** tendría sentido con cientos de millones de filas o analítica pesada (modelos, cruces con otras fuentes). El camino sería: eventos → Kafka → Spark Structured Streaming, o exportar a Parquet. No lo agregué porque hoy solo sumaría costo y complejidad.

## 7. Pendientes que conviene tener presentes
- **Límite de peticiones (rate limiting)**: no lo activé porque tu frontend llama al backend desde el servidor de Next, así que el backend vería *una sola IP* para todos los usuarios. Para hacerlo bien hay que reenviar la IP real del cliente desde el proxy de Next.
- `PagosService.registrar` lee el total pagado y luego inserta sin bloquear la venta: dos cobros simultáneos de la misma venta podrían exceder el total. Es un caso raro (dos cajeros cobrando la misma venta), pero el arreglo es igual al de stock.
- Particionar `movimientos_stock` por mes (o archivar) cuando pase de decenas de millones de filas; hoy no hace falta.
