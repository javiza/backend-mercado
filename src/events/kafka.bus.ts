import { EventBus, OutboxRow } from './event-bus';

/**
 * Publica en Kafka (kafkajs). Se carga bajo demanda: si no usas Kafka, este módulo ni se importa.
 * Variables: KAFKA_BROKERS (host:port,host:port), KAFKA_TOPIC, KAFKA_SSL=true,
 *            KAFKA_USERNAME / KAFKA_PASSWORD / KAFKA_SASL_MECHANISM (plain | scram-sha-256 | scram-sha-512).
 * La clave del mensaje es "agregado:id" → todos los eventos de una misma venta caen en la misma partición (orden garantizado).
 */
export class KafkaBus implements EventBus {
  readonly name = 'kafka';
  private producer: any;
  private connected = false;
  private readonly topic = process.env.KAFKA_TOPIC || 'supermercado.eventos';

  private async ensure() {
    if (this.connected) return;
    const { Kafka, logLevel } = await import('kafkajs');
    const kafka = new Kafka({
      clientId: 'supermercado-backend',
      brokers: (process.env.KAFKA_BROKERS || '').split(',').map((b) => b.trim()).filter(Boolean),
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: process.env.KAFKA_USERNAME
        ? ({ mechanism: (process.env.KAFKA_SASL_MECHANISM || 'plain') as any,
             username: process.env.KAFKA_USERNAME, password: process.env.KAFKA_PASSWORD || '' } as any)
        : undefined,
      logLevel: logLevel.WARN,
      retry: { retries: 3 },
    });
    // idempotent: reintentos sin duplicar mensajes en el broker
    this.producer = kafka.producer({ idempotent: true, maxInFlightRequests: 1 });
    await this.producer.connect();
    this.connected = true;
  }

  async publish(rows: OutboxRow[]): Promise<void> {
    await this.ensure();
    await this.producer.send({
      topic: this.topic,
      acks: -1,
      messages: rows.map((r) => ({
        key: `${r.agregado}:${r.agregado_id}`,
        value: JSON.stringify({ id: String(r.id), tipo: r.tipo, agregado: r.agregado, agregadoId: String(r.agregado_id),
                                creadoEn: new Date(r.creado_en).toISOString(), payload: r.payload }),
        headers: { tipo: r.tipo, eventoId: String(r.id) },
      })),
    });
  }

  async close() { if (this.connected) { await this.producer.disconnect(); this.connected = false; } }
}
