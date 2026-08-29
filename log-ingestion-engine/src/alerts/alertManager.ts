import { metricsCollector } from "../monitoring/metrics.js";
import type { AlertState, AlertConfig } from "../types/alerts.js";

export class AlertManager {
  private alertStates: Map<string, AlertState> = new Map();
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private config: AlertConfig;

  constructor() {
    this.config = {
      errorRateThreshold: parseFloat(process.env.ERROR_RATE_THRESHOLD || "10"),
      queueBacklogThreshold: parseInt(
        process.env.QUEUE_BACKLOG_THRESHOLD || "5000",
        10,
      ),
      throughputZeroThreshold: parseInt(
        process.env.THROUGHPUT_ZERO_THRESHOLD || "10",
        10,
      ),
      deadLetterThreshold: parseInt(
        process.env.DEAD_LETTER_THRESHOLD || "1000",
        10,
      ),
      checkInterval: 10, 
      cooldownSeconds: 60, 
    };
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(" Alert manager started");
    console.log(`   Error rate threshold: ${this.config.errorRateThreshold}%`);
    console.log(
      `   Queue backlog threshold: ${this.config.queueBacklogThreshold}`,
    );
    console.log(
      `   Throughput zero threshold: ${this.config.throughputZeroThreshold}s`,
    );
    console.log(`   Dead letter threshold: ${this.config.deadLetterThreshold}`);

   
    this.checkInterval = setInterval(() => {
      this.checkAllAlerts();
    }, this.config.checkInterval * 1000);

    
    setTimeout(() => this.checkAllAlerts(), 1000);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log(" Alert manager stopped");
  }

  private checkAllAlerts(): void {
    this.checkErrorRate();
    this.checkQueueBacklog();
    this.checkThroughput();
    this.checkDeadLetters();
  }

  private checkErrorRate(): void {
    const errorRate = metricsCollector.getErrorRate();
    const threshold = this.config.errorRateThreshold;

    const isTriggered = errorRate > threshold;
    const alertName = "High Error Rate";

    if (isTriggered) {
      this.triggerAlert(
        alertName,
        ` ALERT: Error rate is ${errorRate.toFixed(2)}% (threshold: ${threshold}%)`,
      );
    } else {
      this.resolveAlert(alertName);
    }
  }

  private checkQueueBacklog(): void {
    const backlog = metricsCollector.getQueueBacklog();
    const threshold = this.config.queueBacklogThreshold;

    const isTriggered = backlog > threshold;
    const alertName = "Queue Backlog";

    if (isTriggered) {
      this.triggerAlert(
        alertName,
        ` ALERT: Queue backlog is ${backlog} messages (threshold: ${threshold})`,
      );
    } else {
      this.resolveAlert(alertName);
    }
  }
  private checkThroughput(): void {
    const throughput = metricsCollector.getThroughput();
    const alertName = "Zero Throughput";

    // Track consecutive zero throughput
    const state = this.getAlertState(alertName);

    if (throughput === 0) {
      // Increment consecutive zeros
      const zeroCount = (state as any).zeroCount || 0;
      (state as any).zeroCount = zeroCount + 1;

      // Check if we've had 10 consecutive seconds of zero throughput
      if (zeroCount >= this.config.throughputZeroThreshold) {
        this.triggerAlert(
          alertName,
          ` ALERT: Throughput has been 0 for ${zeroCount} consecutive seconds`,
        );
      }
    } else {
      // Reset zero count
      (state as any).zeroCount = 0;
      this.resolveAlert(alertName);
    }
  }

  //  Dead letter file > 1,000 entries (
  private checkDeadLetters(): void {
   
    const deadLetterCount = this.getDeadLetterCount();
    const threshold = this.config.deadLetterThreshold;

    const isTriggered = deadLetterCount > threshold;
    const alertName = "Dead Letter Overflow";

    if (isTriggered) {
      this.triggerAlert(
        alertName,
        ` ALERT: Dead letter has ${deadLetterCount} entries (threshold: ${threshold})`,
      );
    } else {
      this.resolveAlert(alertName);
    }
  }

  private getAlertState(alertName: string): AlertState {
    if (!this.alertStates.has(alertName)) {
      this.alertStates.set(alertName, {
        active: false,
        lastTriggered: 0,
        count: 0,
      });
    }
    return this.alertStates.get(alertName)!;
  }

  private triggerAlert(alertName: string, message: string): void {
    const state = this.getAlertState(alertName);
    const now = Date.now();

    
    if (state.active) {
     
      const timeSinceLast = (now - state.lastTriggered) / 1000;
      if (timeSinceLast < this.config.cooldownSeconds) {
        return; 
      }
    }

    state.active = true;
    state.lastTriggered = now;
    state.count++;

    console.log(` ${message}`);
    console.log(`   [${new Date().toISOString()}] (Alert #${state.count})`);
  }

  private resolveAlert(alertName: string): void {
    const state = this.getAlertState(alertName);
    if (state.active) {
      state.active = false;
      console.log(` Alert resolved: ${alertName}`);
    }
  }

  private getDeadLetterCount(): number {
 
    try {
      const fs = require("fs");
      const path = require("path");
      const deadLetterPath = path.join(
        process.cwd(),
        "dead-letter",
        "logs-failed.json",
      );

      if (fs.existsSync(deadLetterPath)) {
        const content = fs.readFileSync(deadLetterPath, "utf8");
        const data = JSON.parse(content);
        return Array.isArray(data) ? data.length : 0;
      }
    } catch (error) {
    
    }
    return 0;
  }

  // For updating dead letter count from retry handler
  updateDeadLetterCount(count: number): void {
    // This can be called by the retry handler to update the count
    // We'll just track it in the alert state
    const state = this.getAlertState("Dead Letter Overflow");
    (state as any).deadLetterCount = count;
  }
}

// Singleton instance
export const alertManager = new AlertManager();
