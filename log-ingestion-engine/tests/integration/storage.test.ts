import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BatchWriter } from "../../src/storage/batchWriter.js";
import type { EnrichedLog } from "../../src/types/log.js";
import fs from "fs";
import path from "path";
import { config } from "../../src/config/env.js";

describe("Storage Integration", () => {
  let sampleLog: EnrichedLog;
  const dataDir = path.join(process.cwd(), "test-data");

  beforeEach(() => {
    // Clean up existing test data
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(dataDir, file));
        } catch (e) {
          // Ignore
        }
      }
      try {
        fs.rmdirSync(dataDir);
      } catch (e) {
        // Ignore
      }
    }

    // Create fresh test data directory
    fs.mkdirSync(dataDir, { recursive: true });

    // Set environment for test
    process.env.SQLITE_DATA_DIR = dataDir;
    // Also update the config module's dataDir
    (config.sqlite as any).dataDir = dataDir;

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
    // Clean up test data
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(dataDir, file));
        } catch (e) {
          // Ignore
        }
      }
      try {
        fs.rmdirSync(dataDir);
      } catch (e) {
        // Ignore
      }
    }
  });

  it("should create database files (REQ-008)", () => {
    const writer = new BatchWriter();

    // Check that database files are created
    const dbPath1 = path.join(dataDir, "logs_service1.db");
    const dbPath2 = path.join(dataDir, "logs_service2.db");
    const dbPath3 = path.join(dataDir, "logs_service3.db");

    // Wait a moment for file creation
    expect(fs.existsSync(dbPath1)).toBe(true);
    expect(fs.existsSync(dbPath2)).toBe(true);
    expect(fs.existsSync(dbPath3)).toBe(true);

    writer.close();
  });

  it("should write logs in batches (REQ-008)", async () => {
    const writer = new BatchWriter();

    // Add 5 logs
    for (let i = 0; i < 5; i++) {
      await writer.addLog("service1", sampleLog);
    }

    // Force flush
    await writer.flush("service1");

    // Wait for flush to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const repo = writer.getRepository("service1");
    expect(repo).toBeDefined();
    if (repo) {
      const count = repo.getCount();
      expect(count).toBe(5);
    }

    writer.close();
  });

  it("should flush automatically on batch size (REQ-008)", async () => {
    const writer = new BatchWriter();

    // Add 100 logs (batch size)
    for (let i = 0; i < 100; i++) {
      await writer.addLog("service1", sampleLog);
    }

    // Wait for flush
    await new Promise((resolve) => setTimeout(resolve, 500));

    const repo = writer.getRepository("service1");
    expect(repo).toBeDefined();
    if (repo) {
      const count = repo.getCount();
      expect(count).toBeGreaterThanOrEqual(100);
    }

    writer.close();
  });

  it("should write to correct database per destination (REQ-008)", async () => {
    const writer = new BatchWriter();

    // Clear existing data by flushing
    await writer.flush("service1");
    await writer.flush("service2");
    await writer.flush("service3");

    await writer.addLog("service1", sampleLog);
    await writer.addLog("service2", sampleLog);
    await writer.addLog("service3", sampleLog);

    await writer.flush("service1");
    await writer.flush("service2");
    await writer.flush("service3");

    // Wait for flush
    await new Promise((resolve) => setTimeout(resolve, 100));

    const repo1 = writer.getRepository("service1");
    const repo2 = writer.getRepository("service2");
    const repo3 = writer.getRepository("service3");

    if (repo1) {
      // Count should be at least 1 for each
      expect(repo1.getCount()).toBeGreaterThanOrEqual(1);
    }
    if (repo2) {
      expect(repo2.getCount()).toBeGreaterThanOrEqual(1);
    }
    if (repo3) {
      expect(repo3.getCount()).toBeGreaterThanOrEqual(1);
    }

    writer.close();
  });
});
