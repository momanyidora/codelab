import express from "express";
import { config } from "./config/env.js";
import { LogIngestor } from "./ingestion/logIngestor.js";
import { metricsCollector } from "./monitoring/metrics.js";
import { queueMetrics } from "./monitoring/queueMetrics.js";
import { alertManager } from "./alerts/alertManager.js";
import dashboardRouter from "./routes/dashboard.js";

const app = express();
const port = config.port;

// Content-Type check middleware
app.use((req, res, next) => {
  if (req.path === "/logs") {
    const contentType = req.headers["content-type"];
    if (!contentType?.includes("application/json")) {
      return res.status(415).json({
        error: "Unsupported Media Type",
        message: "Content-Type must be application/json",
      });
    }
  }
  next();
});

// Parse JSON with 1MB limit
app.use(express.json({ limit: "1mb" }));

const logIngestor = new LogIngestor();

// ============================================================
// METRICS ROUTES (REQ-010) - MUST BE REGISTERED BEFORE ANY ERROR HANDLING
// ============================================================

// GET /metrics - Returns all metrics as JSON
app.get("/metrics", (req, res) => {
  try {
    const metrics = logIngestor.getMetrics();
    res.json({
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting metrics:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve metrics",
    });
  }
});

// GET /metrics/health - Simple health check
app.get("/metrics/health", (req, res) => {
  res.json({
    status: "healthy",
    total_logs: metricsCollector.getTotalLogs(),
    queue_backlog: metricsCollector.getQueueBacklog(),
    timestamp: new Date().toISOString(),
  });
});


// Mount dashboard at /dashboard
app.use("/dashboard", dashboardRouter);
// Or if dashboardRouter has routes defined, use it directly:
// app.use(dashboardRouter);

app.post("/logs", async (req, res) => {
  try {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    if (contentLength > 1024 * 1024) {
      return res.status(413).json({
        error: "Payload Too Large",
        message: "Max payload size is 1MB",
      });
    }

    const body = req.body;
    if (!Array.isArray(body)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Request body must be a JSON array",
      });
    }

    const sourceIp =
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.ip ||
      "unknown";

    const result = await logIngestor.ingestBatch(body, sourceIp);

    if (result.rateLimited) {
      return res
        .status(429)
        .set("Retry-After", String(result.retryAfter || 1))
        .json({
          error: "Too Many Requests",
          message: "Rate limit exceeded",
          retryAfter: result.retryAfter,
        });
    }

    if (result.failed > 0 && result.accepted === 0) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.errors,
      });
    }

    const response: any = {
      status: "accepted",
      batchId: result.batchId,
      accepted: result.accepted,
      failed: result.failed,
    };

    if (result.errors.length > 0) {
      response.errors = result.errors;
    }

    return res.status(202).json(response);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Malformed JSON",
        details: error.message,
      });
    }

    if (error instanceof Error && error.message === "ingestion overloaded") {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "ingestion overloaded",
      });
    }

    console.error("Error processing logs:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to process logs",
    });
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", (req, res) => {
  res.json({ status: "healthy", env: config.env });
});

// ============================================================
// START SERVICES
// ============================================================

// Start queue metrics monitoring
queueMetrics.startMonitoring();

// Start alert manager (REQ-013)
alertManager.start();

// ============================================================
// START SERVER
// ============================================================

const server = app.listen(port, () => {
  console.log(`🚀 Log Ingestion Engine running on port ${port}`);
  console.log(`📊 Rate limit: ${config.rateLimit}/sec per IP`);
  console.log(`📦 Channel buffer: ${config.rawLogBuffer}`);
  console.log(`🔄 Environment: ${config.env}`);
  console.log(`📈 Metrics available at: http://localhost:${port}/metrics`);
  console.log(`📊 Dashboard available at: http://localhost:${port}/dashboard`);
  console.log(`🔔 Alert manager started`);
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  alertManager.stop();
  queueMetrics.stopMonitoring();
  await logIngestor.shutdown();
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  alertManager.stop();
  queueMetrics.stopMonitoring();
  await logIngestor.shutdown();
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});
