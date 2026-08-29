import type { EnrichedLog } from "../types/log.js";
import { config } from "../config/env.js";
import { rabbitMQ } from "./connection.js";
import {
  ROUTING_KEY,
  SERVICE_DESTINATIONS,
  type ServiceDestination,
} from "./exchanges.js";
import { rabbitmqHTTP } from "./httpClient.js";
import { FallbackQueue } from "./fallbackQueue.js";

export class RabbitMQPublisher {
  private fallbackQueue: FallbackQueue;
  private isRabbitMQAvailable = false;

  constructor() {
    this.fallbackQueue = new FallbackQueue();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const result = await rabbitMQ.connect();

      if (!result.connected) {
        throw new Error(result.message);
      }

      this.isRabbitMQAvailable = true;

      console.log("✅ RabbitMQ publisher initialized");
    } catch (error) {
      console.warn("⚠️ RabbitMQ unavailable, using fallback queue:", error);

      this.isRabbitMQAvailable = false;
    }
  }

  async publish(
    destination: ServiceDestination,
    log: EnrichedLog,
  ): Promise<void> {
    if (!SERVICE_DESTINATIONS.includes(destination)) {
      throw new Error(`Invalid destination: ${destination}`);
    }

    if (this.isRabbitMQAvailable) {
      try {
        const exchangeName = `exchange_${destination}`;

        await this.withTimeout(
          rabbitmqHTTP.publishMessage(exchangeName, ROUTING_KEY, log),
          config.rabbitmq.timeout,
        );

        return;
      } catch (error) {
        console.error(
          `Failed to publish log to RabbitMQ (${destination}):`,
          error,
        );

        this.isRabbitMQAvailable = false;
      }
    }

    console.warn(`⚠️ Using fallback queue for log to ${destination}`);

    this.fallbackQueue.push(destination, log);
  }

  async publishBatch(
    destination: ServiceDestination,
    logs: EnrichedLog[],
  ): Promise<void> {
    for (const log of logs) {
      await this.publish(destination, log);
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Publish timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  getFallbackQueue(): FallbackQueue {
    return this.fallbackQueue;
  }

  isAvailable(): boolean {
    return this.isRabbitMQAvailable;
  }
}
