import { rabbitmqHTTP } from "./httpClient.js";
import { SERVICE_DESTINATIONS } from "./exchanges.js";
import { RetryHandler } from "../retry/retryHandler.js";
import { BatchWriter } from "../storage/batchWriter.js";
import { config } from "../config/env.js";

export class RabbitMQHTTPConsumer {
  private retryHandler: RetryHandler;
  private batchWriter: BatchWriter;
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.retryHandler = new RetryHandler();
    this.batchWriter = new BatchWriter();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log("Starting RabbitMQ HTTP consumer (polling)...");

    // Poll every 1 second for messages
    this.pollInterval = setInterval(async () => {
      await this.pollQueues();
    }, 1000);

    // Initial poll
    await this.pollQueues();
  }

  private async pollQueues(): Promise<void> {
    for (const service of SERVICE_DESTINATIONS) {
      await this.pollQueue(service);
    }
  }

  private async pollQueue(service: string): Promise<void> {
    try {
      const queueName = `queue_${service}`;

      // Get messages from queue (max 50 per poll)
      const messages = await rabbitmqHTTP.getMessages(
        queueName,
        50,
        "ack_requeue_false",
      );

      if (messages && messages.length > 0) {
        console.log(
          `📥 Retrieved ${messages.length} messages from ${queueName}`,
        );

        // Process each message
        for (const msg of messages) {
          try {
            // Parse the payload
            const payload = JSON.parse(msg.payload);

            // Write to SQLite via retry handler
            await this.retryHandler.processWithRetry(
              payload,
              async (log) => {
                await this.batchWriter.addLog(service as any, log);
              },
              `Write to ${service}`,
            );
          } catch (error) {
            console.error(`Error processing message from ${queueName}:`, error);
          }
        }
      }
    } catch (error) {
      // Queue might not exist or RabbitMQ might be down
      console.debug(`Could not poll queue ${service}:`, error);
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log("RabbitMQ HTTP consumer stopped");
  }
}
