import amqp, { Connection, Channel } from "amqplib";
import { config } from "../config/env.js";

export class RabbitMQConnection {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect(): Promise<{ connection: Connection; channel: Channel }> {
    if (this.isConnected && this.connection && this.channel) {
      return { connection: this.connection, channel: this.channel };
    }

    try {
      const { host, port, user, pass } = config.rabbitmq;
      const url = `amqp://${user}:${pass}@${host}:${port}`;

      console.log(`🔌 Connecting to RabbitMQ at ${host}:${port}...`);

      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Handle connection close
      this.connection.on("close", () => {
        console.warn("⚠️ RabbitMQ connection closed");
        this.isConnected = false;
        this.connection = null;
        this.channel = null;
        this.tryReconnect();
      });

      console.log("✅ RabbitMQ connected successfully");
      return { connection: this.connection, channel: this.channel };
    } catch (error) {
      console.error("❌ Failed to connect to RabbitMQ:", error);
      this.isConnected = false;
      this.connection = null;
      this.channel = null;
      throw error;
    }
  }

  private async tryReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(" Max reconnect attempts reached for RabbitMQ");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(
      ` Reconnecting to RabbitMQ in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error("Reconnect failed:", error);
        this.tryReconnect();
      }
    }, delay);
  }

  async getChannel(): Promise<Channel> {
    if (!this.channel || !this.isConnected) {
      await this.connect();
    }
    return this.channel!;
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      this.connection = null;
      this.channel = null;
      console.log("🔌 RabbitMQ connection closed");
    } catch (error) {
      console.error("Error closing RabbitMQ connection:", error);
    }
  }

  isConnectedToRabbitMQ(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const rabbitMQ = new RabbitMQConnection();
