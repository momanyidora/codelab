import type { EnrichedLog } from "../types/log.js";
import { config } from "../config/env.js";
import { DeadLetterWriter } from "../dead-letter/deadLetterWriter.js";

interface RetryEntry {
  log: EnrichedLog;
  attempts: number;
  lastError: string;
}

export class RetryHandler {
  private retryQueue: Map<string, RetryEntry> = new Map();
  private deadLetterWriter: DeadLetterWriter;

  constructor() {
    this.deadLetterWriter = new DeadLetterWriter();
  }

  async processWithRetry<T>(
    log: EnrichedLog,
    operation: (log: EnrichedLog) => Promise<T>,
    context: string,
  ): Promise<T> {
    let attempts = 0;
    let lastError: string = "";

    while (attempts < config.retry.maxAttempts) {
      try {
        return await operation(log);
      } catch (error) {
        attempts++;
        lastError = error instanceof Error ? error.message : String(error);

        if (attempts < config.retry.maxAttempts) {
          const delay = config.retry.backoffDelays[attempts - 1] || 10000;
          console.warn(
            `🔄 Retry ${attempts}/${config.retry.maxAttempts} for log ${log.service}:${log.timestamp} ` +
              `(waiting ${delay}ms) - ${lastError}`,
          );
          await this.sleep(delay);
        }
      }
    }

    // All retries failed (REQ-009: after 3 failures, write to dead letter)
    console.error(
      `❌ All ${config.retry.maxAttempts} retries failed for log ${log.service}:${log.timestamp}`,
    );

    // Write to dead letter file (REQ-009)
    await this.deadLetterWriter.write({
      log,
      error: lastError,
      timestamp: new Date().toISOString(),
      attempts: config.retry.maxAttempts,
    });

    throw new Error(`All retries failed: ${lastError}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getDeadLetterWriter(): DeadLetterWriter {
    return this.deadLetterWriter;
  }
}
