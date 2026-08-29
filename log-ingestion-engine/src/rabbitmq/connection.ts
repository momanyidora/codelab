import { rabbitmqHTTP } from "./httpClient.js";
import { RabbitMQSetup } from "./exchanges.js";

export class RabbitMQConnection {
  private isConnected = false;

  async connect(): Promise<{ connected: boolean; message: string }> {
    try {
      const healthy = await rabbitmqHTTP.health();

      if (!healthy) {
        return {
          connected: false,
          message: "RabbitMQ HTTP API not available",
        };
      }

      const setup = new RabbitMQSetup();

      await setup.setupInfrastructure();

      const verified = await setup.verifySetup();

      if (!verified) {
        return {
          connected: false,
          message: "RabbitMQ infrastructure not properly configured",
        };
      }

      this.isConnected = true;

      console.log("✅ RabbitMQ HTTP API connection established");

      return {
        connected: true,
        message: "Connected to RabbitMQ via HTTP API",
      };
    } catch (error) {
      console.error("Failed to connect to RabbitMQ HTTP API:", error);

      this.isConnected = false;

      return {
        connected: false,
        message: "Failed to connect to RabbitMQ HTTP API",
      };
    }
  }

  async close(): Promise<void> {
    this.isConnected = false;
    console.log("🔌 RabbitMQ HTTP API connection closed");
  }

  isConnectedToRabbitMQ(): boolean {
    return this.isConnected;
  }

  async checkQueue(queue: string): Promise<boolean> {
    try {
      const queueInfo = await rabbitmqHTTP.getQueue(queue);
      return !!queueInfo;
    } catch {
      return false;
    }
  }
}

export const rabbitMQ = new RabbitMQConnection();
