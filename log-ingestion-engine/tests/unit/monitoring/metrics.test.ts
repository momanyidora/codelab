import { describe, it, expect, beforeEach } from "vitest";
import { MetricsCollector } from "../../../src/monitoring/metrics.js";

describe("MetricsCollector", () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  it("should track logs correctly", () => {
    metrics.trackLog("INFO", "service1");
    metrics.trackLog("ERROR", "service2");
    metrics.trackLog("INFO", "service1");

    const result = metrics.getMetrics();

    expect(result.total_logs_received).toBe(3);
    expect(result.logs_by_level.INFO).toBe(2);
    expect(result.logs_by_level.ERROR).toBe(1);
    expect(result.logs_by_service.service1).toBe(2);
    expect(result.logs_by_service.service2).toBe(1);
  });

  it("should calculate error rate correctly", () => {
    metrics.trackLog("INFO", "service1");
    metrics.trackLog("ERROR", "service2");
    metrics.trackLog("ERROR", "service1");

    
    metrics["calculateErrorRate"]();

    const result = metrics.getMetrics();
    expect(result.error_rate).toBeCloseTo(66.67, 1);
  });

  it("should handle zero logs for error rate", () => {
    metrics["calculateErrorRate"]();
    expect(metrics.getErrorRate()).toBe(0);
  });

  it("should track throughput", () => {
    for (let i = 0; i < 5; i++) {
      metrics.trackLog("INFO", "service1");
    }

    const throughput = metrics.getThroughput();
    expect(throughput).toBeGreaterThan(0);
  });
});
