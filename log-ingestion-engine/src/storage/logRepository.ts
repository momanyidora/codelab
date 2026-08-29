import Database from "better-sqlite3";
import type { EnrichedLog } from "../types/log.js";

export class LogRepository {
  private db: Database.Database;
  private insertStmt: Database.Statement;

  constructor(db: Database.Database) {
    this.db = db;

    this.insertStmt = this.db.prepare(`
      INSERT INTO logs (
        timestamp, service, level, message, received_at, source_ip, env
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
  }

  insert(log: EnrichedLog): void {
    this.insertStmt.run(
      log.timestamp,
      log.service,
      log.level,
      log.message,
      log.received_at,
      log.source_ip,
      log.env,
    );
  }

  insertBatch(logs: EnrichedLog[]): void {

    const insertMany = this.db.transaction((logs: EnrichedLog[]) => {
      for (const log of logs) {
        this.insertStmt.run(
          log.timestamp,
          log.service,
          log.level,
          log.message,
          log.received_at,
          log.source_ip,
          log.env,
        );
      }
    });

    insertMany(logs);
  }

  getCount(): number {
    const result = this.db
      .prepare("SELECT COUNT(*) as count FROM logs")
      .get() as { count: number };
    return result.count;
  }

  getLogsByLevel(level: string): number {
    const result = this.db
      .prepare("SELECT COUNT(*) as count FROM logs WHERE level = ?")
      .get(level) as { count: number };
    return result.count;
  }

  getLogsByService(service: string): number {
    const result = this.db
      .prepare("SELECT COUNT(*) as count FROM logs WHERE service = ?")
      .get(service) as { count: number };
    return result.count;
  }

  deleteOlderThan(days: number): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString();

    const result = this.db
      .prepare("DELETE FROM logs WHERE timestamp < ?")
      .run(cutoffStr);

    return result.changes;
  }

  close(): void {
    this.db.close();
  }
}
