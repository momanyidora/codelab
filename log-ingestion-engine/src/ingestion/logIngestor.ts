import { v4 as uuidv4 } from "uuid";
import type { RawLog, RawLogMessage } from "../types/log.js";
import { config } from "../config/env.js";
import { LogValidator } from "./logValidator.js";
import { TokenBucketRateLimiter } from "../rate-limiter/tokenBucket.js";
import { RawLogsChannel } from "../channel/rawLogsChannel.js";
import { LogEnricher } from "../enrichment/logEnricher.js";
import { LogRouter } from "../routing/logRouter.js";

export class LogIngestor {
  private validator: LogValidator;
  private rateLimiter: TokenBucketRateLimiter;
  private channel: RawLogsChannel;
  private enricher: LogEnricher;
  private router: LogRouter;
  private isProcessing = false;

  constructor() {
    this.validator = new LogValidator();
    this.rateLimiter = new TokenBucketRateLimiter(config.rateLimit, config.rateLimit);
    this.channel = new RawLogsChannel();
    this.enricher = new LogEnricher();
    this.router = new LogRouter();

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
      return {
        batchId,
        accepted: 0,
        failed: logs.length,
        errors: [
          {
            error: "Rate limit exceeded",
            retryAfter: rateLimitResult.retryAfter,
          },
        ],
        rateLimited: true,
        retryAfter: rateLimitResult.retryAfter,
      };
    }

    const { valid, invalid } = this.validator.validateBatch(logs);

    for (let i = 0; i < invalid.length; i++) {
      const invalidLog = invalid[i];
      errors.push({
        log: invalidLog?.log,
        errors: invalidLog?.errors,
      });
    }

    let accepted = 0;

    for (const log of valid) {
      const message: RawLogMessage = { log, sourceIp };
      const pushed = await this.channel.push(message);

      if (pushed) {
        accepted++;
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
          console.log(` Routed log to ${destination}:`, log.service, log.level);

          // TODO: Publish to RabbitMQ (REQ-007)
          // This will be implemented in Phase 3

          // TODO: Store in SQLite (REQ-008)
          // This will be implemented in Phase 3
        }

        // Update metrics (REQ-010)
        // This will be implemented in Phase 5
      } catch (error) {
        console.error("Error processing batch:", error);
        // TODO: Handle retries and dead letter (REQ-009)
      }
    });
  }
}
