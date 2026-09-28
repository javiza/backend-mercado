import { DataSourceOptions } from 'typeorm';
import { join } from 'path';

/**
 * Configuración ÚNICA de TypeORM: la usan tanto la app (AppModule) como el CLI de migraciones
 * (data-source.ts). Así lo que ves en producción es exactamente lo que migras.
 */
export function buildTypeOrmOptions(
  env: NodeJS.ProcessEnv = process.env,
  opts: { globEntities?: boolean } = {},
): DataSourceOptions {
  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    // Render: la URL EXTERNA exige SSL (DB_SSL=true). La URL INTERNA (misma región) no lo necesita.
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    // La app usa autoLoadEntities; el CLI necesita el glob.
    ...(opts.globEntities ? { entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')] } : {}),
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'typeorm_migrations',
    // Con migraciones el esquema lo manda el historial, no synchronize. Solo para prototipos: DB_SYNC=true.
    synchronize: env.DB_SYNC === 'true',
    // Aplica las migraciones pendientes al arrancar (desactívalo con DB_MIGRATIONS_RUN=false si migras en preDeployCommand).
    migrationsRun: env.DB_MIGRATIONS_RUN !== 'false',
    logging: env.DB_LOGGING === 'true' ? ['error', 'warn', 'migration', 'schema'] : ['error', 'migration'],
    maxQueryExecutionTime: Number(env.DB_SLOW_QUERY_MS || 500), // loguea consultas lentas
    extra: {
      max: Number(env.DB_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      statement_timeout: Number(env.DB_STATEMENT_TIMEOUT_MS || 30_000),
      application_name: 'supermercado-backend',
    },
  };
}
