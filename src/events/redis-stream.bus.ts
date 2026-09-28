import type Redis from 'ioredis';
import { EventBus, OutboxRow } from './event-bus';

/** Publica en un Redis Stream (lo soporta Render Key Value). Los consumidores usan XREADGROUP. */
export class RedisStreamBus implements EventBus {
  readonly name = 'redis-stream';
  constructor(private readonly redis: Redis, private readonly stream = process.env.EVENT_STREAM || 'supermercado.eventos') {}

  async publish(rows: OutboxRow[]): Promise<void> {
    const pipe = this.redis.pipeline();
    for (const r of rows) {
      // MAXLEN ~ acota la memoria del stream (recorte aproximado, barato)
      pipe.xadd(this.stream, 'MAXLEN', '~', 100_000, '*',
        'id', String(r.id), 'tipo', r.tipo, 'agregado', r.agregado, 'agregadoId', String(r.agregado_id),
        'creadoEn', new Date(r.creado_en).toISOString(), 'payload', JSON.stringify(r.payload));
    }
    const res = await pipe.exec();
    const fallo = res?.find(([err]) => err);
    if (fallo) throw fallo[0];
  }

  async close() { /* el cliente lo administra RedisService */ }
}
