import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export class SQLiteSchema {
  private db: Database.Database;

  constructor(dbPath: string) {
   
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.createTables();
  }

  private createTables(): void {
    // Create logs table 
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        service TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        received_at TEXT NOT NULL,
        source_ip TEXT NOT NULL,
        env TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_logs_service ON logs(service);
      CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
    `);
  }

  getDatabase(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }
}
