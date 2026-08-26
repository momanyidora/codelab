// REQ-002: Log validation
import type {
  RawLog,
  LogLevel,
  ValidationResult,
  ValidationError,
} from "../types/log.js";

const VALID_LEVELS: LogLevel[] = ["INFO", "WARN", "ERROR", "DEBUG"];

// Stricter ISO 8601 validation
function isValidISO8601(dateStr: string): boolean {
  // Check if it matches ISO 8601 format
  // This handles: 2026-08-24T10:20:00Z, 2026-08-24T10:20:00.123Z, etc.
  const isoRegex =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  if (!isoRegex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return (
    !isNaN(date.getTime()) &&
    date.toISOString().startsWith(dateStr.substring(0, 10))
  );
}

export class LogValidator {
  validate(log: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Check timestamp (ISO 8601)
    if (log.timestamp === undefined || log.timestamp === null) {
      errors.push({ field: "timestamp", reason: "is required" });
    } else if (typeof log.timestamp !== "string") {
      errors.push({ field: "timestamp", reason: "must be a string" });
    } else if (!isValidISO8601(log.timestamp)) {
      errors.push({
        field: "timestamp",
        reason: "must be valid ISO 8601 format",
      });
    }

    // Check service (string, max 100 chars)
    if (log.service === undefined || log.service === null) {
      errors.push({ field: "service", reason: "is required" });
    } else if (typeof log.service !== "string") {
      errors.push({ field: "service", reason: "must be a string" });
    } else if (log.service.length > 100) {
      errors.push({
        field: "service",
        reason: "must be at most 100 characters",
      });
    }

    // Check level (must be INFO/WARN/ERROR/DEBUG)
    if (log.level === undefined || log.level === null) {
      errors.push({ field: "level", reason: "is required" });
    } else if (!VALID_LEVELS.includes(log.level)) {
      errors.push({
        field: "level",
        reason: "must be one of INFO/WARN/ERROR/DEBUG",
      });
    }

    // Check message (string, max 10000 chars)
    if (log.message === undefined || log.message === null) {
      errors.push({ field: "message", reason: "is required" });
    } else if (typeof log.message !== "string") {
      errors.push({ field: "message", reason: "must be a string" });
    } else if (log.message.length > 10000) {
      errors.push({
        field: "message",
        reason: "must be at most 10000 characters",
      });
    }

    if (errors.length > 0) {
      return {
        valid: false,
        errors,
      };
    }

    return {
      valid: true,
      log: log as RawLog,
    };
  }

  validateBatch(logs: any[]): {
    valid: RawLog[];
    invalid: { log: any; errors: ValidationError[] }[];
  } {
    const valid: RawLog[] = [];
    const invalid: { log: any; errors: ValidationError[] }[] = [];

    // Handle null/undefined items in array
    if (!Array.isArray(logs)) {
      return { valid, invalid };
    }

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // Handle non-object entries (null, undefined, primitive values)
      if (log === null || log === undefined || typeof log !== "object") {
        invalid.push({
          log,
          errors: [{ field: "root", reason: "must be a valid log object" }],
        });
        continue;
      }

      const result = this.validate(log);
      if (result.valid && result.log) {
        valid.push(result.log);
      } else if (result.errors) {
        invalid.push({ log, errors: result.errors });
      }
    }

    return { valid, invalid };
  }
}
