import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../redis/redis.service';

/** Público. Lo usa Render como healthCheckPath. Solo la BD es crítica: sin Redis la app sigue sirviendo. */
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly redis: RedisService) {}

  @Get()
  async check() {
    let db: 'up' | 'down' = 'up';
    try { await this.ds.query('SELECT 1'); } catch { db = 'down'; }
    const redis = await this.redis.ping();
    const body = { status: db === 'up' ? 'ok' : 'error', db, redis, uptime: Math.round(process.uptime()) };
    if (db === 'down') throw new ServiceUnavailableException(body);
    return body;
  }
}
