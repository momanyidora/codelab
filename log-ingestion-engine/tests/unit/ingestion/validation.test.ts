import { describe, it, expect } from "vitest";
import { LogValidator } from "../../../src/ingestion/logValidator.js";

describe("LogValidator", () => {
  const validator = new LogValidator();

  it("should validate valid log", () => {
    const validLog = {
      timestamp: "2026-08-24T10:20:00Z",
      service: "claims",
      level: "ERROR",
      message: "Claim failed",
    };

    const result = validator.validate(validLog);
    expect(result.valid).toBe(true);
    expect(result.log).toEqual(validLog);
  });

  it("should reject invalid level", () => {
    const invalidLog = {
      timestamp: "2026-08-24T10:20:00Z",
      service: "claims",
      level: "BAD",
      message: "Claim failed",
    };

    const result = validator.validate(invalidLog);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "level",
      reason: "must be one of INFO/WARN/ERROR/DEBUG",
    });
  });

  it("should reject missing timestamp", () => {
    const invalidLog = {
      service: "claims",
      level: "ERROR",
      message: "Claim failed",
    };

    const result = validator.validate(invalidLog);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "timestamp",
      reason: "is required",
    });
  });
});
