import { describe, it, expect, beforeEach } from "vitest";
import { LogEnricher } from "../../../src/enrichment/logEnricher.js";
import type { RawLog } from "../../../src/types/log.js";

describe("LogEnricher", () => {
  let enricher: LogEnricher;
  let sampleLog: RawLog;

  beforeEach(() => {
    enricher = new LogEnricher();
    sampleLog = {
      timestamp: "2026-08-24T10:20:00Z",
      service: "test-service",
      level: "INFO",
      message: "Test message",
    };
  });

  it("should add received_at timestamp (REQ-005)", () => {
    const sourceIp = "192.168.1.1";
    const enriched = enricher.enrich(sampleLog, sourceIp);

    expect(enriched.received_at).toBeDefined();
    // Should be ISO 8601 format
    expect(Date.parse(enriched.received_at)).not.toBeNaN();
  });

  it("should add source_ip from parameter (REQ-005)", () => {
    const sourceIp = "192.168.1.1";
    const enriched = enricher.enrich(sampleLog, sourceIp);

    expect(enriched.source_ip).toBe(sourceIp);
  });

  it("should use fallback for missing source_ip (REQ-005)", () => {
    const enriched = enricher.enrich(sampleLog, "unknown");

    expect(enriched.source_ip).toBe("unknown");
  });

  it("should add env from config (REQ-005)", () => {
    const sourceIp = "192.168.1.1";
    const enriched = enricher.enrich(sampleLog, sourceIp);

    expect(enriched.env).toBeDefined();
    // Default should be 'production' unless overridden
    expect(enriched.env).toBe("production");
  });

  it("should enrich batch of logs", () => {
    const logs = [sampleLog, { ...sampleLog, service: "test2" }];
    const sourceIp = "192.168.1.1";

    const enriched = enricher.enrichBatch(logs, sourceIp);

    expect(enriched).toHaveLength(2);
    const first = enriched[0];
    const second = enriched[1];

    expect(first).toBeDefined();
    expect(second).toBeDefined();

    if (first && second) {
      expect(first.source_ip).toBe(sourceIp);
      expect(second.source_ip).toBe(sourceIp);
      expect(first.received_at).toBeDefined();
      expect(second.received_at).toBeDefined();
    }
  });

  it("should preserve original log fields", () => {
    const sourceIp = "192.168.1.1";
    const enriched = enricher.enrich(sampleLog, sourceIp);

    expect(enriched.timestamp).toBe(sampleLog.timestamp);
    expect(enriched.service).toBe(sampleLog.service);
    expect(enriched.level).toBe(sampleLog.level);
    expect(enriched.message).toBe(sampleLog.message);
  });
});
