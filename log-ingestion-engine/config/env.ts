import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  env: process.env.ENV || "production",

  // Rate limiting
  rateLimit: parseInt(process.env.RATE_LIMIT || "1000", 10),

  // Channel
  rawLogBuffer: parseInt(process.env.RAW_LOG_BUFFER || "10000", 10),
  consumerBatchSize: parseInt(process.env.CONSUMER_BATCH_SIZE || "50", 10),

  // RabbitMQ
  rabbitmq: {
    host: process.env.RABBITMQ_HOST || "localhost",
    port: parseInt(process.env.RABBITMQ_PORT || "5672", 10),
    user: process.env.RABBITMQ_USER || "guest",
    pass: process.env.RABBITMQ_PASS || "guest",
  },

  // SQLite 
  sqlite: {
    batchSize: parseInt(process.env.SQLITE_BATCH_SIZE || "100", 10),
    batchInterval: parseInt(process.env.SQLITE_BATCH_INTERVAL || "1000", 10),
  },
};
