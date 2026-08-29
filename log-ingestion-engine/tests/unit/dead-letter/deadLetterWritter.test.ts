import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DeadLetterWriter } from "../../../src/dead-letter/deadLetterWriter.js";
import type { EnrichedLog } from "../../../src/types/log.js";
import fs from "fs";
import path from "path";

describe("DeadLetterWriter", () => {
  const testFilePath = path.join(process.cwd(), "test-dead-letter.json");
  let writer: DeadLetterWriter;
  let sampleLog: EnrichedLog;

  beforeEach(async () => {
    // Clean up any existing test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    // Override config for testing
    process.env.DEAD_LETTER_FILE = testFilePath;

    writer = new DeadLetterWriter();
    // Clear any entries that might have been loaded
    await writer.clear();

    sampleLog = {
      timestamp: "2026-08-24T10:20:00Z",
      service: "test",
      level: "INFO",
      message: "test message",
      received_at: "2026-08-24T10:20:01.123Z",
      source_ip: "192.168.1.1",
      env: "production",
    };
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it("should write dead letter entry (REQ-009)", async () => {
    await writer.write({
      log: sampleLog,
      error: "Test error",
      timestamp: "2026-08-24T10:20:02.000Z",
      attempts: 3,
    });

    const entries = writer.getEntries();
    expect(entries).toHaveLength(1);
    const firstEntry = entries[0];
    expect(firstEntry).toBeDefined();
    if (firstEntry) {
      expect(firstEntry.log).toEqual(sampleLog);
      expect(firstEntry.error).toBe("Test error");
      expect(firstEntry.attempts).toBe(3);
    }
  });

  it("should persist entries to file (REQ-009)", async () => {
    await writer.write({
      log: sampleLog,
      error: "Test error",
      timestamp: "2026-08-24T10:20:02.000Z",
      attempts: 3,
    });

    // Create new writer instance to read from file
    const newWriter = new DeadLetterWriter();
    const entries = newWriter.getEntries();
    expect(entries).toHaveLength(1);
  });

  it("should return count of entries", async () => {
    // Clear any existing entries first
    await writer.clear();

    await writer.write({
      log: sampleLog,
      error: "Error 1",
      timestamp: "2026-08-24T10:20:02.000Z",
      attempts: 3,
    });
    await writer.write({
      log: sampleLog,
      error: "Error 2",
      timestamp: "2026-08-24T10:20:03.000Z",
      attempts: 3,
    });

    expect(writer.getCount()).toBe(2);
  });
});
