export interface Metrics {
 
  total_logs_received: number;
  logs_by_level: {
    INFO: number;
    WARN: number;
    ERROR: number;
    DEBUG: number;
  };
  logs_by_service: Record<string, number>;


  error_rate: number; 
  throughput: number;
  queue_backlog: number; 
}

export interface MetricsSnapshot {
  timestamp: string;
  metrics: Metrics;
}
