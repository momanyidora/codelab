import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LogRouter } from "../../../src/routing/logRouter.js";
import type { RawLog, LogLevel } from "../../../src/types/log.js";
import fs from "fs";
import path from "path";

describe("LogRouter", () => {
  let router: LogRouter;
  let sampleLog: RawLog;

  beforeEach(() => {
    // Create a temporary rules file for testing
    const rulesPath = path.join(process.cwd(), "test-rules.yaml");
    const rulesContent = `
default: service1

rules:
  - name: "Route ERROR to service1"
    condition:
      field: level
      operator: equals
      value: ERROR
    destination: service1

  - name: "Route WARN to service2"
    condition:
      field: level
      operator: equals
      value: WARN
    destination: service2

  - name: "Route auth services to service3"
    condition:
      field: service
      operator: starts_with
      value: auth
    destination: service3

  - name: "Route payment services to service2"
    condition:
      field: service
      operator: contains
      value: payment
    destination: service2
`;
    fs.writeFileSync(rulesPath, rulesContent);

    router = new LogRouter(rulesPath);
    sampleLog = {
      timestamp: "2026-08-24T10:20:00Z",
      service: "test",
      level: "INFO",
      message: "Test message",
    };
  });

  afterEach(() => {
    const rulesPath = path.join(process.cwd(), "test-rules.yaml");
    if (fs.existsSync(rulesPath)) {
      fs.unlinkSync(rulesPath);
    }
  });

  it("should route ERROR logs to service1 (REQ-006)", () => {
    const log: RawLog = {
      ...sampleLog,
      level: "ERROR" as LogLevel,
    };
    const destination = router.route(log);
    expect(destination).toBe("service1");
  });

  it("should route WARN logs to service2 (REQ-006)", () => {
    const log: RawLog = {
      ...sampleLog,
      level: "WARN" as LogLevel,
    };
    const destination = router.route(log);
    expect(destination).toBe("service2");
  });

  it("should use default destination for unmatched logs (REQ-006)", () => {
    const log: RawLog = {
      ...sampleLog,
      level: "DEBUG" as LogLevel,
    };
    const destination = router.route(log);
    expect(destination).toBe("service1");
  });

  it("should route by service with starts_with (REQ-006)", () => {
    const log: RawLog = {
      ...sampleLog,
      service: "auth-service",
    };
    const destination = router.route(log);
    expect(destination).toBe("service3");
  });

  it("should route by service with contains (REQ-006)", () => {
    const log: RawLog = {
      ...sampleLog,
      service: "payment-processor",
    };
    const destination = router.route(log);
    expect(destination).toBe("service2");
  });

  it("should handle multiple rules and use first match (REQ-006)", () => {
    const log: RawLog = {
      ...sampleLog,
      level: "ERROR" as LogLevel,
      service: "auth-service",
    };
    const destination = router.route(log);
    // ERROR rule comes first, so should route to service1
    expect(destination).toBe("service1");
  });

  it("should reload rules without restart (REQ-006)", () => {
    const newRulesPath = path.join(process.cwd(), "test-rules2.yaml");
    const newRules = `
default: service2

rules:
  - name: "Route all to service2"
    condition:
      field: level
      operator: equals
      value: INFO
    destination: service2
`;
    fs.writeFileSync(newRulesPath, newRules);

    router.reloadRules(newRulesPath);

    const log: RawLog = {
      ...sampleLog,
      level: "INFO" as LogLevel,
    };
    const destination = router.route(log);
    expect(destination).toBe("service2");

    fs.unlinkSync(newRulesPath);
  });
});
