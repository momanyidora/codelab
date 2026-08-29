import { describe, it, expect, vi, beforeEach } from "vitest";
import { RetryHandler } from "../../../src/retry/retryHandler.js";
import type { EnrichedLog } from "../../../src/types/log.js";

describe("RetryHandler", () => {
  let retryHandler: RetryHandler;
  let sampleLog: EnrichedLog;

  beforeEach(() => {
    retryHandler = new RetryHandler();
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

  it("should succeed on first attempt (REQ-009)", async () => {
    const operation = vi.fn().mockResolvedValue("success");

    const result = await retryHandler.processWithRetry(
      sampleLog,
      operation,
      "test",
    );

    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("should retry on failure (REQ-009)", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("Temporary error"))
      .mockResolvedValue("success");

    const result = await retryHandler.processWithRetry(
      sampleLog,
      operation,
      "test",
    );

    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("should fail after 3 attempts (REQ-009)", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("Persistent error"));

    await expect(
      retryHandler.processWithRetry(sampleLog, operation, "test"),
    ).rejects.toThrow("All retries failed");

    expect(operation).toHaveBeenCalledTimes(3);
  }, 15000); // 15 second timeout

  it("should write to dead letter after all retries fail (REQ-009)", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("Persistent error"));
    const deadLetterWriter = retryHandler.getDeadLetterWriter();
    const writeSpy = vi.spyOn(deadLetterWriter, "write");

    // Clear any existing dead letter entries
    await deadLetterWriter.clear();

    await expect(
      retryHandler.processWithRetry(sampleLog, operation, "test"),
    ).rejects.toThrow("All retries failed");

    expect(writeSpy).toHaveBeenCalled();
    expect(writeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        log: sampleLog,
        error: "Persistent error",
        attempts: 3,
      }),
    );
  }, 15000); // 15 second timeout

  it("should use exponential backoff delays (REQ-009)", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("Error"));
    const startTime = Date.now();

    try {
      await retryHandler.processWithRetry(sampleLog, operation, "test");
    } catch {
      // Expected to fail
    }

    const duration = Date.now() - startTime;
    // Should wait at least 1s + 5s = 6s
    expect(duration).toBeGreaterThan(6000);
    // Should be less than 12s (with buffer)
    expect(duration).toBeLessThan(12000);
  }, 15000); // 15 second timeout
});
