import { v4 as uuidv4 } from "uuid";
import type { RawLog, RawLogMessage, EnrichedLog } from "../types/log.js";
import { config } from "../config/env.js";
import { LogValidator } from "./logValidator.js";
import { TokenBucketRateLimiter } from "../rate-limiter/tokenBucket.js";
import { RawLogsChannel } from "../channel/rawLogsChannel.js";
import { LogEnricher } from "../enrichment/logEnricher.js";
import { LogRouter } from "../routing/logRouter.js";
import { RabbitMQPublisher } from "../rabbitmq/publisher.js";
import { BatchWriter } from "../storage/batchWriter.js";
import { RetryHandler } from "../retry/retryHandler.js";
import { type ServiceDestination } from "../rabbitmq/exchanges.js";
import { metricsCollector } from "../monitoring/metrics.js"; // ADDED

export class LogIngestor {
  private validator: LogValidator;
  private rateLimiter: TokenBucketRateLimiter;
  private channel: RawLogsChannel;
  private enricher: LogEnricher;
  private router: LogRouter;
  private publisher: RabbitMQPublisher;
  private batchWriter: BatchWriter;
  private retryHandler: RetryHandler;
  private isProcessing = false;

  constructor() {
    this.validator = new LogValidator();
    this.rateLimiter = new TokenBucketRateLimiter(
      config.rateLimit,
      config.rateLimit,
    );
    this.channel = new RawLogsChannel();
    this.enricher = new LogEnricher();
    this.router = new LogRouter();
    this.publisher = new RabbitMQPublisher();
    this.batchWriter = new BatchWriter();
    this.retryHandler = new RetryHandler();

  
    this.startProcessing();
  }

  async ingestBatch(
    logs: any[],
    sourceIp: string,
  ): Promise<{
    batchId: string;
    accepted: number;
    failed: number;
    errors: any[];
    rateLimited?: boolean;
    retryAfter?: number;
  }> {
    const batchId = uuidv4();
    const errors: any[] = [];

    const rateLimitResult = this.rateLimiter.allowRequest(sourceIp);

    if (!rateLimitResult.allowed) {
      const retryAfter = rateLimitResult.retryAfter ?? 1;
      return {
        batchId,
        accepted: 0,
        failed: logs.length,
        errors: [
          {
            error: "Rate limit exceeded",
            retryAfter,
          },
        ],
        rateLimited: true,
        retryAfter,
      };
    }

    const { valid, invalid } = this.validator.validateBatch(logs);

    for (const invalidLog of invalid) {
      errors.push({
        log: invalidLog.log,
        errors: invalidLog.errors,
      });
    }

    let accepted = 0;

    for (const log of valid) {
      const message: RawLogMessage = { log, sourceIp };
      const pushed = await this.channel.push(message);

      if (pushed) {
        accepted++;
      
        metricsCollector.trackLog(log.level, log.service);
      } else {
        throw new Error("ingestion overloaded");
      }
    }

    return {
      batchId,
      accepted,
      failed: logs.length - accepted,
      errors,
    };
  }

  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;


    this.channel.registerConsumer(async (batch: RawLogMessage[]) => {
      try {
        const logs = batch.map((item) => item.log);
        const sourceIp = batch[0]?.sourceIp || "unknown";

     
        const enriched = this.enricher.enrichBatch(logs, sourceIp);

        for (const log of enriched) {
          const destination = this.router.route(log);
          console.log(
            ` Routed log to ${destination}:`,
            log.service,
            log.level,
          );

       
          await this.retryHandler.processWithRetry(
            log,
            async (enrichedLog: EnrichedLog) => {
              await this.publisher.publish(
                destination as ServiceDestination,
                enrichedLog,
              );
            },
            `Publish to ${destination}`,
          );

          console.log(` Published log to ${destination}`);
        }

       
        this.consumeFallbackQueue();
      } catch (error) {
        console.error("Error processing batch:", error);
      }
    });
  }

  private async consumeFallbackQueue(): Promise<void> {
    const fallbackQueue = this.publisher.getFallbackQueue();

    fallbackQueue.registerConsumer(async (batch) => {
      for (const item of batch) {
        await this.retryHandler.processWithRetry(
          item.log,
          async (enrichedLog: EnrichedLog) => {
           
            await this.publisher.publish(item.destination, enrichedLog);
          },
          `Fallback publish to ${item.destination}`,
        );
      }
    });
  }


  getMetrics() {
    return metricsCollector.getMetrics();
  }

  async shutdown(): Promise<void> {
    this.isProcessing = false;
    this.batchWriter.close();
    await this.publisher.getFallbackQueue(); 
    console.log(" LogIngestor shutdown complete");
  }
}
