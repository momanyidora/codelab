import { metricsCollector } from "./metrics.js";
import { rabbitmqHTTP } from "../rabbitmq/httpClient.js";
import { SERVICE_DESTINATIONS } from "../rabbitmq/exchanges.js";

export class QueueMetrics {
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  startMonitoring(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Check queue size every 10 seconds (REQ-010)
    this.checkInterval = setInterval(() => {
      this.updateQueueMetrics();
    }, 10000);

    console.log("📊 Queue metrics monitoring started");
  }

  private async updateQueueMetrics(): Promise<void> {
    try {
      let totalBacklog = 0;

      // Get queue sizes via HTTP API
      for (const service of SERVICE_DESTINATIONS) {
        const queueName = `queue_${service}`;
        try {
          const queueInfo = await rabbitmqHTTP.getQueue(queueName);
          totalBacklog += queueInfo.messages || 0;
        } catch (error) {
          // Queue might not exist yet
          console.debug(`Could not get queue ${queueName}:`, error);
        }
      }

      // Update metrics
      metricsCollector.updateQueueBacklog(totalBacklog);

      if (totalBacklog > 0) {
        console.log(`📊 Queue backlog: ${totalBacklog} messages`);
      }
    } catch (error) {
      // If RabbitMQ is not available, use fallback
      console.debug("Could not fetch RabbitMQ queue metrics:", error);
    }
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log("📊 Queue metrics monitoring stopped");
  }
}

// Singleton instance
export const queueMetrics = new QueueMetrics();
