import type { EnrichedLog } from "../types/log.js";
import { config } from "../config/env.js";
import fs from "fs";
import path from "path";

interface DeadLetterEntry {
  log: EnrichedLog;
  error: string;
  timestamp: string;
  attempts: number;
}

export class DeadLetterWriter {
  private filePath: string;
  private maxSizeBytes: number;
  private currentSize = 0;
  private entries: DeadLetterEntry[] = [];

  constructor() {
    this.filePath = config.deadLetter.filePath;
    this.maxSizeBytes = config.deadLetter.maxSizeMB * 1024 * 1024;

   
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

   
    this.loadExisting();
  }

  private loadExisting(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, "utf8");
        const data = JSON.parse(content);
        this.entries = Array.isArray(data) ? data : [];
        this.currentSize = fs.statSync(this.filePath).size;
        console.log(` Loaded ${this.entries.length} dead letter entries`);
      }
    } catch (error) {
      console.warn("Could not load dead letter file:", error);
      this.entries = [];
    }
  }

  async write(entry: DeadLetterEntry): Promise<void> {
    this.entries.push(entry);
    await this.save();


    if (this.currentSize > this.maxSizeBytes) {
      this.rotate();
    }
  }

  private async save(): Promise<void> {
    const content = JSON.stringify(this.entries, null, 2);
    await fs.promises.writeFile(this.filePath, content, "utf8");
    this.currentSize = Buffer.byteLength(content, "utf8");
  }

  private rotate(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = path.dirname(this.filePath);
    const ext = path.extname(this.filePath);
    const base = path.basename(this.filePath, ext);
    const newPath = path.join(dir, `${base}-${timestamp}${ext}`);

    try {
     
      fs.renameSync(this.filePath, newPath);
      console.log(` Rotated dead letter file to: ${newPath}`);

 
      this.entries = [];
      this.currentSize = 0;
      this.save();
    } catch (error) {
      console.error("Failed to rotate dead letter file:", error);
    }
  }

  getEntries(): DeadLetterEntry[] {
    return this.entries;
  }

  getCount(): number {
    return this.entries.length;
  }

  async clear(): Promise<void> {
    this.entries = [];
    await this.save();
  }
}
