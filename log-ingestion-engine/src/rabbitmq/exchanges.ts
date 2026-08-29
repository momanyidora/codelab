import { rabbitmqHTTP } from "./httpClient.js";

export const SERVICE_DESTINATIONS = [
  "service1",
  "service2",
  "service3",
] as const;
export type ServiceDestination = (typeof SERVICE_DESTINATIONS)[number];
export const EXCHANGE_PREFIX = "exchange_";
export const QUEUE_PREFIX = "queue_";
export const ROUTING_KEY = "log.write";

export class RabbitMQSetup {
  async setupInfrastructure(): Promise<void> {
    try {
      console.log("Setting up RabbitMQ infrastructure via HTTP API...");

      // Create exchanges and queues for each service
      for (const service of SERVICE_DESTINATIONS) {
        const exchangeName = `exchange_${service}`;
        const queueName = `queue_${service}`;

        // Create exchange
        await rabbitmqHTTP.createExchange(exchangeName, "direct", true);
        console.log(`Created exchange: ${exchangeName}`);

        // Create queue
        await rabbitmqHTTP.createQueue(queueName, true);
        console.log(`Created queue: ${queueName}`);

        // Bind queue to exchange
        await rabbitmqHTTP.bindQueue(exchangeName, queueName, ROUTING_KEY);
        console.log(
          `Bound ${exchangeName} -> ${queueName} with ${ROUTING_KEY}`,
        );
      }

      console.log("RabbitMQ infrastructure setup complete");
    } catch (error) {
      console.error("Failed to setup RabbitMQ infrastructure:", error);
      throw error;
    }
  }

  async verifySetup(): Promise<boolean> {
    try {
      const exchanges = await rabbitmqHTTP.listExchanges();
      const queues = await rabbitmqHTTP.listQueues();
      const bindings = await rabbitmqHTTP.listBindings();

      for (const service of SERVICE_DESTINATIONS) {
        const exchangeName = `exchange_${service}`;
        const queueName = `queue_${service}`;

        const exchangeExists = exchanges.some(
          (e: any) => e.name === exchangeName,
        );
        const queueExists = queues.some((q: any) => q.name === queueName);

        if (!exchangeExists || !queueExists) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Verification failed:", error);
      return false;
    }
  }
}
export async function setupRabbitMQInfrastructure(): Promise<void> {
  for (const service of SERVICE_DESTINATIONS) {
    const exchangeName = `${EXCHANGE_PREFIX}${service}`;
    const queueName = `${QUEUE_PREFIX}${service}`;

    await rabbitmqHTTP.createExchange(exchangeName, "direct", true);

    await rabbitmqHTTP.createQueue(queueName, true);

    await rabbitmqHTTP.bindQueue(exchangeName, queueName, ROUTING_KEY);

    console.log(`Created ${exchangeName} -> ${queueName}`);
  }
}