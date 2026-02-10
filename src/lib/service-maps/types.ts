/**
 * Service Maps v1
 * Deterministic snapshot of architecture exercised by a build
 *
 * No request-level data. No sampling. Inferred from execution evidence only.
 */

export interface ServiceNode {
  id: string;
  type: "frontend" | "service" | "function";
}

export interface ServiceEdge {
  from: string;
  to: string;
  latencyP95: number; // milliseconds
  errorRate: number; // 0.0–1.0
}

export interface ServiceMap {
  buildId: string;
  nodes: ServiceNode[];
  edges: ServiceEdge[];
}

/**
 * Internal: helpers to aggregate network observations
 */
export interface NetworkObservation {
  url: string;
  statusCode: number;
  latencyMs: number;
  timestamp: number;
}

/**
 * Internal: accumulate latencies per destination
 */
export interface DestinationMetrics {
  totalRequests: number;
  errorCount: number;
  latencies: number[];
}
