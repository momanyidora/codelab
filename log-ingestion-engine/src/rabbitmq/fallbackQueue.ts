import type { EnrichedLog } from "../types/log.js";
import type { ServiceDestination } from "./exchanges.js";

interface QueuedLog {
  destination: ServiceDestination;
  log: EnrichedLog;
  timestamp: number;
}

export class FallbackQueue {
  private queue: QueuedLog[] = [];
  private maxSize = 10000;
  private isProcessing = false;
  private consumers: ((batch: QueuedLog[]) => Promise<void>)[] = [];

  push(destination: ServiceDestination, log: EnrichedLog): void {
    if (this.queue.length >= this.maxSize) {
      console.error("❌ Fallback queue full, dropping log");
      return;
    }

    this.queue.push({ destination, log, timestamp: Date.now() });
    this.notifyConsumers();
  }

  registerConsumer(consumer: (batch: QueuedLog[]) => Promise<void>): void {
    this.consumers.push(consumer);
    this.startProcessing();
  }

  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (true) {
      if (this.queue.length > 0) {
        // Process in batches of 50
        const batch = this.queue.splice(0, 50);
        await this.processBatch(batch);
      } else {
        // Wait for more logs
        await this.waitForLogs();
      }
    }
  }

  private async waitForLogs(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.queue.length > 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  private async processBatch(batch: QueuedLog[]): Promise<void> {
    for (const consumer of this.consumers) {
      try {
        await consumer(batch);
      } catch (error) {
        console.error("Fallback consumer error:", error);
      }
    }
  }

  private notifyConsumers(): void {
    if (this.queue.length > 0 && !this.isProcessing) {
      this.startProcessing();
    }
  }

  get size(): number {
    return this.queue.length;
  }

  isFull(): boolean {
    return this.queue.length >= this.maxSize;
  }
}
