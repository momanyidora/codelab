export interface AlertCondition {
  name: string;
  check: () => boolean;
  message: string;
  severity: "warning" | "critical";
  cooldown: number; 
}

export interface AlertState {
  active: boolean;
  lastTriggered: number;
  count: number;
}

export interface AlertConfig {
  errorRateThreshold: number;
  queueBacklogThreshold: number; 
  throughputZeroThreshold: number; 
  deadLetterThreshold: number; 
  checkInterval: number; 
  cooldownSeconds: number;
}
