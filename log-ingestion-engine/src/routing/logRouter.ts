import type { RawLog, RoutingRule } from "../types/log.js";
import fs from "fs";
import yaml from "yaml";
import path from "path";

export class LogRouter {
  private rules: RoutingRule[] = [];
  private defaultDestination: "service1" | "service2" | "service3" = "service1";

  constructor(rulesPath?: string) {
    this.loadRules(
      rulesPath || path.join(process.cwd(), "src/config/rules.yaml"),
    );
  }

  loadRules(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const config = yaml.parse(content);
      this.rules = config.rules || [];
      this.defaultDestination = config.default || "service1";
      console.log(`Loaded ${this.rules.length} routing rules`);
    } catch (error) {
      console.warn("Failed to load routing rules, using defaults:", error);

      this.rules = [
        {
          name: "ERROR to service1",
          condition: { field: "level", operator: "equals", value: "ERROR" },
          destination: "service1",
        },
        {
          name: "WARN to service2",
          condition: { field: "level", operator: "equals", value: "WARN" },
          destination: "service2",
        },
      ];
    }
  }

  route(log: RawLog): "service1" | "service2" | "service3" {
    for (const rule of this.rules) {
      if (this.matchesCondition(log, rule.condition)) {
        return rule.destination;
      }
    }
    return this.defaultDestination;
  }

  private matchesCondition(
    log: RawLog,
    condition: RoutingRule["condition"],
  ): boolean {
    const fieldValue = log[condition.field];

    if (fieldValue === undefined) return false;

    const fieldStr = String(fieldValue);
    const valueStr = String(condition.value);

    switch (condition.operator) {
      case "equals":
        return fieldStr === valueStr;
      case "contains":
        return fieldStr.includes(valueStr);
      case "starts_with":
        return fieldStr.startsWith(valueStr);
      default:
        return false;
    }
  }

  reloadRules(filePath?: string): void {
    this.loadRules(filePath || path.join(process.cwd()));
  }
}
