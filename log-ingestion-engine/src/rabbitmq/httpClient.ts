import { config } from "../config/env.js";

interface RabbitMQConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

export class RabbitMQHTTPClient {
  private baseUrl: string;
  private auth: string;

  constructor() {
    const { host, port, user, pass } = config.rabbitmq;

    const managementPort = process.env.RABBITMQ_MANAGEMENT_PORT || "15672";
    this.baseUrl = `http://${host}:${managementPort}/api`;
    this.auth = Buffer.from(`${user}:${pass}`).toString("base64");
  }
  private async request(
    method: string,
    path: string,
    body?: any,
  ): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${this.auth}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`RabbitMQ API error (${response.status}): ${text}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async createExchange(
    name: string,
    type: string = "direct",
    durable: boolean = true,
  ): Promise<void> {
    const path = `/exchanges/%2F/${encodeURIComponent(name)}`;
    await this.request("PUT", path, {
      type,
      durable,
      auto_delete: false,
      internal: false,
      arguments: {},
    });
  }

  async deleteExchange(name: string): Promise<void> {
    const path = `/exchanges/%2F/${encodeURIComponent(name)}`;
    await this.request("DELETE", path);
  }

  async listExchanges(): Promise<any[]> {
    return this.request("GET", "/exchanges");
  }

  async createQueue(name: string, durable: boolean = true): Promise<void> {
    const path = `/queues/%2F/${encodeURIComponent(name)}`;
    await this.request("PUT", path, {
      durable,
      auto_delete: false,
      arguments: {},
    });
  }

  async deleteQueue(name: string): Promise<void> {
    const path = `/queues/%2F/${encodeURIComponent(name)}`;
    await this.request("DELETE", path);
  }

  async listQueues(): Promise<any[]> {
    return this.request("GET", "/queues");
  }

  async getQueue(name: string): Promise<any> {
    const path = `/queues/%2F/${encodeURIComponent(name)}`;
    return this.request("GET", path);
  }

  async bindQueue(
    exchange: string,
    queue: string,
    routingKey: string,
  ): Promise<void> {
    const path = `/bindings/%2F/e/${encodeURIComponent(exchange)}/q/${encodeURIComponent(queue)}`;
    await this.request("POST", path, {
      routing_key: routingKey,
      arguments: {},
    });
  }

  async listBindings(): Promise<any[]> {
    return this.request("GET", "/bindings");
  }

  async publishMessage(
    exchange: string,
    routingKey: string,
    message: any,
  ): Promise<any> {
    const path = `/exchanges/%2F/${encodeURIComponent(exchange)}/publish`;
    return this.request("POST", path, {
      vhost: "/",
      name: exchange,
      properties: {
        delivery_mode: 2, // persistent
        content_type: "application/json",
      },
      routing_key: routingKey,
      payload: JSON.stringify(message),
      payload_encoding: "string",
    });
  }

  async getMessages(
    queue: string,
    count: number = 50,
    ackMode: string = "ack_requeue_false",
  ): Promise<any[]> {
    const path = `/queues/%2F/${encodeURIComponent(queue)}/get`;
    return this.request("POST", path, {
      count,
      ackmode: ackMode,
      encoding: "auto",
      truncate: 50000,
    });
  }

  async health(): Promise<any> {
    return this.request("GET", "/health/checks/alarms");
  }

  async overview(): Promise<any> {
    return this.request("GET", "/overview");
  }

  async connections(): Promise<any[]> {
    return this.request("GET", "/connections");
  }

  async consumers(): Promise<any[]> {
    return this.request("GET", "/consumers");
  }
}

// Singleton instance
export const rabbitmqHTTP = new RabbitMQHTTPClient();
