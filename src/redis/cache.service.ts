import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Caché por "espacios" (namespaces) con invalidación por versión: en vez de buscar y borrar cientos de
 * claves, se sube un contador y todas las claves anteriores quedan huérfanas (expiran solas por TTL).
 *   const productos = await cache.wrap('productos', 'catalogo:cat=3', 30, () => consultaCara());
 *   await cache.bump('productos');   // tras cualquier cambio de productos/stock
 */
@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisService) {}

  private async version(ns: string): Promise<string> {
    if (!this.redis.ready) return '0';
    try { return (await this.redis.client!.get(`cache:ver:${ns}`)) ?? '0'; } catch { return '0'; }
  }

  async wrap<T>(ns: string, key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    if (!this.redis.ready) return loader();
    const fullKey = `cache:${ns}:${await this.version(ns)}:${key}`;
    const hit = await this.redis.getJson<T>(fullKey);
    if (hit !== null) return hit;
    const fresh = await loader();
    await this.redis.setJson(fullKey, fresh, ttlSeconds);
    return fresh;
  }

  async bump(ns: string): Promise<void> {
    if (!this.redis.ready) return;
    try { await this.redis.client!.incr(`cache:ver:${ns}`); } catch { /* ignorar */ }
  }
}
