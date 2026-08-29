import { Router } from "express";
import { LogIngestor } from "../ingestion/logIngestor.js";

const router = Router();

const logIngestor = new LogIngestor();

router.post("/", async (req, res) => {
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

    const response: {
      status: string;
      batchId: string;
      accepted: number;
      failed: number;
      errors?: unknown[];
    } = {
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

export default router;
