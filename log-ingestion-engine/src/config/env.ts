import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  env: process.env.ENV || "production",

  // Rate limiting (REQ-003)
  rateLimit: parseInt(process.env.RATE_LIMIT || "1000", 10),

  // Channel (REQ-004)
  rawLogBuffer: parseInt(process.env.RAW_LOG_BUFFER || "10000", 10),
  consumerBatchSize: parseInt(process.env.CONSUMER_BATCH_SIZE || "50", 10),

  // RabbitMQ - Native approach (REQ-007)
  rabbitmq: {
    host: process.env.RABBITMQ_HOST || "localhost",
    port: parseInt(process.env.RABBITMQ_PORT || "5672", 10),
    managementPort: parseInt(
      process.env.RABBITMQ_MANAGEMENT_PORT || "15672",
      10,
    ),
    user: process.env.RABBITMQ_USER || "guest",
    pass: process.env.RABBITMQ_PASS || "guest",
    timeout: parseInt(process.env.RABBITMQ_TIMEOUT || "5000", 10),
  },

  // SQLite (REQ-008)
  sqlite: {
    batchSize: parseInt(process.env.SQLITE_BATCH_SIZE || "100", 10),
    batchInterval: parseInt(process.env.SQLITE_BATCH_INTERVAL || "1000", 10),
    dataDir: process.env.SQLITE_DATA_DIR || "./data",
  },

  // Dead letter (REQ-009)
  deadLetter: {
    filePath: process.env.DEAD_LETTER_FILE || "./dead-letter/logs-failed.json",
    maxSizeMB: 10,
  },

  // Retry (REQ-009)
  retry: {
    maxAttempts: 3,
    backoffDelays: [1000, 5000, 10000],
  },
};
