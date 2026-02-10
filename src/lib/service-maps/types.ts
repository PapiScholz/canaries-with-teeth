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
  hash: string; // SHA256 hex digest for determinism validation
  nodes: ServiceNode[];
  edges: ServiceEdge[];
}

/**
 * Service Map Diff v1 - First-class artifact describing structural and numeric change
 *
 * Facts only. No interpretation, classification, or severity judgment.
 * Baseline vs current comparison for observational purposes.
 * Input (only) for future Service-Map-based gating (if v2 activates).
 */
export interface AddedEdge {
  from: string;
  to: string;
  latencyP95: number;
  errorRate: number;
}

export interface RemovedEdge {
  from: string;
  to: string;
  baselineLatencyP95: number;
  baselineErrorRate: number;
}

export interface ChangedEdge {
  from: string;
  to: string;
  baselineLatencyP95: number;
  currentLatencyP95: number;
  latencyChange: number; // current - baseline (positive = slower)
  baselineErrorRate: number;
  currentErrorRate: number;
  errorRateChange: number; // current - baseline (positive = more errors)
}

export interface AddedNode {
  id: string;
  type: "frontend" | "service" | "function";
}

export interface RemovedNode {
  id: string;
  type: "frontend" | "service" | "function";
}

export interface CriticalPathInfo {
  baselineLength: number;
  currentLength: number;
  lengthChange: number; // current - baseline (positive = longer)
}

export interface ServiceMapDiff {
  buildId: string;
  hash: string; // SHA256 hex digest for determinism validation
  baselineMapHash: string | null; // Hash of baseline map, null if no baseline exists
  addedNodes: AddedNode[];
  removedNodes: RemovedNode[];
  addedEdges: AddedEdge[];
  removedEdges: RemovedEdge[];
  changedEdges: ChangedEdge[];
  criticalPath: CriticalPathInfo | null; // Non-normative derived field, null if not computed
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
