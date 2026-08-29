import type { EnrichedLog } from "../types/log.js";
import type { ServiceDestination } from "../rabbitmq/exchanges.js";
import { LogRepository } from "./logRepository.js";
import { SQLiteSchema } from "./schema.js";
import { config } from "../config/env.js";
import path from "path";
import fs from "fs";

export class BatchWriter {
  private repositories: Map<ServiceDestination, LogRepository> = new Map();
  private batches: Map<ServiceDestination, EnrichedLog[]> = new Map();
  private timers: Map<ServiceDestination, NodeJS.Timeout> = new Map();
  private isFlushing: Map<ServiceDestination, boolean> = new Map();

  constructor() {
    // Initialize repositories for each service
    const destinations: ServiceDestination[] = [
      "service1",
      "service2",
      "service3",
    ];

    for (const dest of destinations) {
      const dbPath = path.join(config.sqlite.dataDir, `logs_${dest}.db`);
      const schema = new SQLiteSchema(dbPath);
      const repo = new LogRepository(schema.getDatabase());

      this.repositories.set(dest, repo);
      this.batches.set(dest, []);
      this.isFlushing.set(dest, false);

      // Start batch timer (REQ-008: every 1 second or batch size)
      const timer = setInterval(() => {
        this.flush(dest);
      }, config.sqlite.batchInterval);

      this.timers.set(dest, timer);
    }

    console.log("✅ Batch writers initialized");
  }

  async addLog(
    destination: ServiceDestination,
    log: EnrichedLog,
  ): Promise<void> {
    const batch = this.batches.get(destination);
    if (!batch) {
      throw new Error(`Unknown destination: ${destination}`);
    }

    batch.push(log);

    // If batch size reached, flush immediately (REQ-008: batch size 100)
    if (batch.length >= config.sqlite.batchSize) {
      await this.flush(destination);
    }
  }

  async flush(destination: ServiceDestination): Promise<void> {
    if (this.isFlushing.get(destination)) {
      return; // Already flushing
    }

    this.isFlushing.set(destination, true);

    try {
      const batch = this.batches.get(destination);
      if (!batch || batch.length === 0) {
        return;
      }

      const repo = this.repositories.get(destination);
      if (!repo) {
        throw new Error(`No repository for destination: ${destination}`);
      }

      // Take a copy and clear the batch
      const logsToWrite = [...batch];
      batch.length = 0;

      // Write batch (REQ-008)
      repo.insertBatch(logsToWrite);

      console.log(
        `📝 Wrote ${logsToWrite.length} logs to ${destination} database`,
      );
    } catch (error) {
      console.error(`Failed to flush batch for ${destination}:`, error);
      // Logs will be retried via retry mechanism
      throw error;
    } finally {
      this.isFlushing.set(destination, false);
    }
  }

  getRepository(destination: ServiceDestination): LogRepository | undefined {
    return this.repositories.get(destination);
  }

  close(): void {
    // Flush all remaining batches
    for (const dest of this.batches.keys()) {
      this.flush(dest);
    }

    // Clear timers
    for (const [dest, timer] of this.timers) {
      clearInterval(timer);
    }

    // Close databases
    for (const repo of this.repositories.values()) {
      repo.close();
    }
  }
}
