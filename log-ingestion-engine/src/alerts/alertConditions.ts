import { metricsCollector } from "../monitoring/metrics.js";
import { alertManager } from "./alertManager.js";

export const AlertConditions = {
  highErrorRate: () => {
    const errorRate = metricsCollector.getErrorRate();
    const threshold = parseFloat(process.env.ERROR_RATE_THRESHOLD || "10");
    return errorRate > threshold;
  },

  queueBacklog: () => {
    const backlog = metricsCollector.getQueueBacklog();
    const threshold = parseInt(
      process.env.QUEUE_BACKLOG_THRESHOLD || "5000",
      10,
    );
    return backlog > threshold;
  },

  zeroThroughput: () => {
    const throughput = metricsCollector.getThroughput();
    return throughput === 0;
  },

  deadLetterOverflow: () => {
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
        const count = Array.isArray(data) ? data.length : 0;
        const threshold = parseInt(
          process.env.DEAD_LETTER_THRESHOLD || "1000",
          10,
        );
        return count > threshold;
      }
    } catch (error) {}
    return false;
  },
};
