import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Cliente Redis con degradación elegante: si REDIS_URL no está definida o Redis se cae, la app SIGUE
 * funcionando (sin caché). Redis acelera, nunca es un punto único de falla.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly log = new Logger('Redis');
  readonly client: Redis | null;
  private lastErrorLog = 0;

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.client = null;
      this.log.warn('REDIS_URL no definida: caché y publicación de eventos por Redis desactivadas');
      return;
    }
    this.client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false, // si Redis no está, falla rápido en vez de encolar y colgar requests
      connectTimeout: 5_000,
      retryStrategy: (n) => Math.min(n * 250, 5_000),
    });
    this.client.on('ready', () => this.log.log('Conectado'));
    this.client.on('error', (e) => {
      if (Date.now() - this.lastErrorLog > 30_000) { // no inundar los logs
        this.lastErrorLog = Date.now();
        this.log.warn(`Error de conexión: ${e.message}`);
      }
    });
  }

  get ready(): boolean { return !!this.client && this.client.status === 'ready'; }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.ready) return null;
    try {
      const raw = await this.client!.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch { return null; }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.ready) return;
    try { await this.client!.set(key, JSON.stringify(value), 'EX', ttlSeconds); } catch { /* sin caché, no pasa nada */ }
  }

  async ping(): Promise<'up' | 'down' | 'disabled'> {
    if (!this.client) return 'disabled';
    try { return (await this.client.ping()) === 'PONG' ? 'up' : 'down'; } catch { return 'down'; }
  }

  async onModuleDestroy() { if (this.client) { try { await this.client.quit(); } catch { this.client.disconnect(); } } }
}
