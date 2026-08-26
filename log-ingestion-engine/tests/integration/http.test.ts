import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { LogIngestor } from "../../src/ingestion/logIngestor.js";

describe("HTTP Endpoints", () => {
  let app: express.Application;
  let server: any;
  let baseUrl: string;

  beforeAll(() => {
    app = express();

    // Add middleware to check Content-Type BEFORE JSON parsing
    app.use((req, res, next) => {
      // Skip content-type check for health/other routes
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

    // Parse JSON after content-type check
    app.use(express.json({ limit: "1mb" }));

    const logIngestor = new LogIngestor();

    app.post("/logs", async (req, res) => {
      try {
        const body = req.body;
        if (!Array.isArray(body)) {
          return res.status(400).json({ error: "Bad Request" });
        }
        const result = await logIngestor.ingestBatch(body, req.ip || "unknown");
        res.status(202).json({ status: "accepted", batchId: result.batchId });
      } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // Start server on random port for testing
    server = app.listen(0);
    const address = server.address();
    baseUrl = `http://localhost:${address.port}`;
  });

  afterAll(() => {
    server.close();
  });

  it("should return 202 for valid logs", async () => {
    const response = await fetch(`${baseUrl}/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          timestamp: "2026-08-24T10:20:00Z",
          service: "test",
          level: "INFO",
          message: "test message",
        },
      ]),
    });

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body).toHaveProperty("status", "accepted");
    expect(body).toHaveProperty("batchId");
  });

  it("should return 415 for wrong Content-Type", async () => {
    const response = await fetch(`${baseUrl}/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: "not json",
    });

    expect(response.status).toBe(415);
  });

  it("should return 400 for non-array body", async () => {
    const response = await fetch(`${baseUrl}/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ not: "an array" }),
    });

    expect(response.status).toBe(400);
  });
});
