import { Router } from "express";
import { metricsCollector } from "../monitoring/metrics.js";

const router = Router();

router.get("/", (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();

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

router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    total_logs: metricsCollector.getTotalLogs(),
    queue_backlog: metricsCollector.getQueueBacklog(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
