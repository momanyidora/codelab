import type { RawLog, EnrichedLog } from "../types/log.js";
import { config } from "../config/env.js";

export class LogEnricher {
  private env: string;

  constructor() {
    this.env = config.env;
  }

  enrich(log: RawLog, sourceIp: string): EnrichedLog {
    return {
      ...log,
      received_at: new Date().toISOString(), // ISO 8601 with microseconds
      source_ip: sourceIp || "unknown",
      env: this.env,
    };
  }

  enrichBatch(logs: RawLog[], sourceIp: string): EnrichedLog[] {
    return logs.map((log) => this.enrich(log, sourceIp));
  }
}
