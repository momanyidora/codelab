export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export interface RawLog {
  timestamp: string;
  service: string;
  level: LogLevel;
  message: string;
}

export interface RawLogMessage {
  log: RawLog;
  sourceIp: string;
}
export interface EnrichedLog extends RawLog {
  received_at: string;
  source_ip: string;
  env: string;
}

export interface ValidationError {
  field: string;
  reason: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  log?: RawLog;
}

export interface BatchResponse {
  status: "accepted";
  batchId: string;
}

export interface RoutingRule {
  name: string;
  condition: {
    field: keyof RawLog;
    operator: "equals" | "contains" | "starts_with";
    value: string;
  };
  destination: "service1" | "service2" | "service3";
}


export interface RabbitMQMessage {
  payload: string;
  payload_encoding: string;
  properties: {
    delivery_mode: number;
    content_type: string;
  };
}