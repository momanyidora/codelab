import type { Metrics } from "../types/metrics.js";
import type { LogLevel } from "../types/log.js";

export class MetricsCollector {
  private totalLogs = 0;
  private logsByLevel: Record<LogLevel, number> = {
    INFO: 0,
    WARN: 0,
    ERROR: 0,
    DEBUG: 0,
  };
  private logsByService: Record<string, number> = {};
  private throughputWindow: number[] = [];
  private windowSize = 10; // 10 seconds window
  private lastErrorRateCalculation = Date.now();
  private errorRate = 0;
  private queueBacklog = 0;
  private totalErrors = 0;

  // Track incoming logs (called when a log is received)
  trackLog(level: LogLevel, service: string): void {
    // Increment total
    this.totalLogs++;

    // Track by level
    if (this.logsByLevel[level] !== undefined) {
      this.logsByLevel[level]++;
    }

    // Track by service
    if (!this.logsByService[service]) {
      this.logsByService[service] = 0;
    }
    this.logsByService[service]++;

    // Track for throughput calculation
    const now = Date.now();
    this.throughputWindow.push(now);

    // Clean old entries (keep only entries within the window)
    const cutoff = now - this.windowSize * 1000;
    this.throughputWindow = this.throughputWindow.filter((t) => t > cutoff);

    // Track errors for error rate
    if (level === "ERROR") {
      this.totalErrors++;
    }

 
    if (now - this.lastErrorRateCalculation > 5000) {
      this.calculateErrorRate();
      this.lastErrorRateCalculation = now;
    }
  }

  // Calculate error rate 
  private calculateErrorRate(): void {
    if (this.totalLogs === 0) {
      this.errorRate = 0;
      return;
    }
    this.errorRate = (this.totalErrors / this.totalLogs) * 100;
  }

  getThroughput(): number {
    if (this.throughputWindow.length === 0) return 0;

    const now = Date.now();
    const cutoff = now - this.windowSize * 1000;
    const recent = this.throughputWindow.filter((t) => t > cutoff);

    if (recent.length === 0) return 0;

    // Calculate logs per second over the window
    const oldest = Math.min(...recent);
    const timeSpan = (now - oldest) / 1000;

    // If timeSpan is very small, use a minimum time span to avoid division by zero
    const effectiveTimeSpan = Math.max(timeSpan, 0.001);

    return recent.length / effectiveTimeSpan;
  }

 
  updateQueueBacklog(size: number): void {
    this.queueBacklog = size;
  }

 
  getMetrics(): Metrics {
    return {
      total_logs_received: this.totalLogs,
      logs_by_level: {
        INFO: this.logsByLevel.INFO || 0,
        WARN: this.logsByLevel.WARN || 0,
        ERROR: this.logsByLevel.ERROR || 0,
        DEBUG: this.logsByLevel.DEBUG || 0,
      },
      logs_by_service: { ...this.logsByService },
      error_rate: parseFloat(this.errorRate.toFixed(2)),
      throughput: parseFloat(this.getThroughput().toFixed(2)),
      queue_backlog: this.queueBacklog,
    };
  }

  reset(): void {
    this.totalLogs = 0;
    this.logsByLevel = { INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0 };
    this.logsByService = {};
    this.throughputWindow = [];
    this.totalErrors = 0;
    this.errorRate = 0;
    this.queueBacklog = 0;
  }


  getTotalLogs(): number {
    return this.totalLogs;
  }

  
  getLogsByLevel(): Record<LogLevel, number> {
    return { ...this.logsByLevel };
  }


  getLogsByService(): Record<string, number> {
    return { ...this.logsByService };
  }

  
  getErrorRate(): number {
    return this.errorRate;
  }

 
  getQueueBacklog(): number {
    return this.queueBacklog;
  }
}

export const metricsCollector = new MetricsCollector();
