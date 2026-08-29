
import type { RawLogMessage } from "../types/log.js";
import { config } from "../config/env.js";

export class RawLogsChannel {
  private channel: RawLogMessage[] = [];
  private maxSize: number;
  private consumers: ((batch: RawLogMessage[]) => Promise<void>)[] = [];
  private batchSize: number;
  private isProcessing = false;

  constructor(maxSize?: number, batchSize?: number) {
    this.maxSize = maxSize || config.rawLogBuffer;
    this.batchSize = batchSize || config.consumerBatchSize;
  }

  
  async push(message: RawLogMessage): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false); // Timeout - channel full
      }, 100);

    
      if (this.channel.length < this.maxSize) {
        clearTimeout(timeout);
        this.channel.push(message);
        resolve(true);
        this.notifyConsumers();
      } else {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }

  // Register a consumer
  registerConsumer(consumer: (batch: RawLogMessage[]) => Promise<void>): void {
    this.consumers.push(consumer);
    this.startProcessing();
  }

  private async startProcessing(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    while (true) {
      if (this.channel.length >= this.batchSize) {
        const batch = this.channel.splice(0, this.batchSize);
        await this.processBatch(batch);
      } else {
        
        await this.waitForLogs();
      }
    }
  }

  private async waitForLogs(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.channel.length >= this.batchSize) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 10);
    });
  }

  private async processBatch(batch: RawLogMessage[]): Promise<void> {
    for (const consumer of this.consumers) {
      try {
        await consumer(batch);
      } catch (error) {
        console.error("Consumer error:", error);
      }
    }
  }

  private notifyConsumers(): void {
    
    if (this.channel.length >= this.batchSize && !this.isRunning) {
      this.startProcessing();
    }
  }

  get length(): number {
    return this.channel.length;
  }

  isFull(): boolean {
    return this.channel.length >= this.maxSize;
  }

  // Helper to get current processing state
  private isRunning = false;
}
