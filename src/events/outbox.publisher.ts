import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { EventBus, OutboxRow } from './event-bus';
import { RedisStreamBus } from './redis-stream.bus';
import { KafkaBus } from './kafka.bus';

/**
 * Lee outbox_eventos (que llenan los triggers de la BD) y los publica.
 *  - Semántica "al menos una vez": si el proceso cae tras publicar y antes de marcar, el evento se reenvía
 *    (los consumidores deben ser idempotentes; cada evento trae un `id` único y creciente).
 *  - FOR UPDATE SKIP LOCKED: con varias instancias del backend nadie publica el mismo evento dos veces a la vez.
 * Destino según variables:  EVENT_BUS=kafka|redis|none  (por defecto: kafka si hay KAFKA_BROKERS, si no redis si hay REDIS_URL).
 */
@Injectable()
export class OutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Outbox');
  private bus: EventBus | null = null;
  private timer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private busy = false;

  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly redis: RedisService) {}

  onModuleInit() {
    const choice = (process.env.EVENT_BUS || (process.env.KAFKA_BROKERS ? 'kafka' : process.env.REDIS_URL ? 'redis' : 'none')).toLowerCase();
    if (choice === 'kafka') this.bus = new KafkaBus();
    else if (choice === 'redis' && this.redis.client) this.bus = new RedisStreamBus(this.redis.client);
    if (!this.bus) { this.log.warn('Sin destino de eventos (EVENT_BUS=none): el outbox no se publica'); }
    else {
      this.log.log(`Publicando eventos en: ${this.bus.name}`);
      this.timer = setInterval(() => void this.tick(), Number(process.env.OUTBOX_POLL_MS || 2_000));
      this.timer.unref();
    }
    // Limpieza diaria: los eventos ya publicados no hacen falta para siempre
    this.cleanupTimer = setInterval(() => void this.cleanup(), 6 * 60 * 60 * 1000);
    this.cleanupTimer.unref();
  }

  async onModuleDestroy() {
    clearInterval(this.timer); clearInterval(this.cleanupTimer);
    await this.bus?.close().catch(() => undefined);
  }

  private async tick() {
    if (this.busy || !this.bus) return;
    this.busy = true;
    try { while ((await this.publishBatch()) === Number(process.env.OUTBOX_BATCH || 200)) { /* hay más: sigue */ } }
    catch (e) { this.log.warn(`Ciclo de publicación falló: ${(e as Error).message}`); }
    finally { this.busy = false; }
  }

  /** Publica un lote; devuelve cuántos eventos procesó. Público para poder probarlo. */
  async publishBatch(): Promise<number> {
    const batch = Number(process.env.OUTBOX_BATCH || 200);
    return this.ds.transaction(async (m) => {
      const rows: OutboxRow[] = await m.query(
        `SELECT id, tipo, agregado, agregado_id, payload, creado_en
           FROM outbox_eventos WHERE publicado_en IS NULL
          ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED`, [batch]);
      if (!rows.length) return 0;
      const ids = rows.map((r) => r.id);
      try {
        await this.bus!.publish(rows);
        await m.query(`UPDATE outbox_eventos SET publicado_en = now(), ultimo_error = NULL WHERE id = ANY($1::bigint[])`, [ids]);
        return rows.length;
      } catch (e) {
        await m.query(`UPDATE outbox_eventos SET intentos = intentos + 1, ultimo_error = $2 WHERE id = ANY($1::bigint[])`,
          [ids, String((e as Error).message).slice(0, 500)]);
        // No se relanza: lanzar aquí revertiría la transacción y se perdería el registro del error/intentos.
        this.log.warn(`No se pudo publicar ${rows.length} evento(s) en ${this.bus!.name}: ${(e as Error).message}`);
        return 0;
      }
    });
  }

  async cleanup() {
    const dias = Number(process.env.OUTBOX_RETENTION_DAYS || 7);
    try {
      const sql = this.bus
        ? `DELETE FROM outbox_eventos WHERE publicado_en IS NOT NULL AND publicado_en < now() - make_interval(days => $1)`
        : `DELETE FROM outbox_eventos WHERE creado_en < now() - make_interval(days => $1)`;
      await this.ds.query(sql, [dias]);
    } catch (e) { this.log.warn(`Limpieza del outbox falló: ${(e as Error).message}`); }
  }
}
