export interface OutboxRow {
  id: string; tipo: string; agregado: string; agregado_id: string; payload: unknown; creado_en: Date;
}

/** Destino de los eventos del outbox. Implementaciones: Redis Streams, Kafka. */
export interface EventBus {
  readonly name: string;
  publish(rows: OutboxRow[]): Promise<void>;
  close(): Promise<void>;
}
