/**
 * Service Map Builder v1
 *
 * Builds a deterministic map from:
 * - Network requests captured during canary execution
 * - Function health metrics (future)
 *
 * Infers:
 * - frontend node (always present)
 * - service nodes (from observed network calls)
 * - edges with aggregated p95 latency and error rate
 */

import {
  ServiceMap,
  ServiceNode,
  ServiceEdge,
  NetworkObservation,
  DestinationMetrics,
} from "./types";

/**
 * Build a Service Map from network observations and function metrics
 */
export function buildServiceMap(
  buildId: string,
  networkObservations: NetworkObservation[],
  functionMetrics?: Record<string, any>
): ServiceMap {
  const nodes: ServiceNode[] = [];
  const edgeMap: Map<string, DestinationMetrics> = new Map();

  // Always add frontend node
  nodes.push({ id: "frontend", type: "frontend" });

  // Process network observations (from canary execution)
  for (const obs of networkObservations) {
    const serviceName = extractServiceName(obs.url);
    if (!serviceName) continue;

    // Ensure service node exists
    if (!nodes.find((n) => n.id === serviceName)) {
      nodes.push({ id: serviceName, type: "service" });
    }

    // Accumulate metrics to this service
    const edgeKey = `frontend→${serviceName}`;
    const metrics = edgeMap.get(edgeKey) || {
      totalRequests: 0,
      errorCount: 0,
      latencies: [],
    };

    metrics.totalRequests += 1;
    metrics.latencies.push(obs.latencyMs);
    if (obs.statusCode >= 400) {
      metrics.errorCount += 1;
    }

    edgeMap.set(edgeKey, metrics);
  }

  // Process function health metrics (if provided)
  if (functionMetrics) {
    for (const [funcId, metrics] of Object.entries(functionMetrics)) {
      const nodeId = `fn:${funcId}`;
      // Add function node if not already present
      if (!nodes.find((n) => n.id === nodeId)) {
        nodes.push({ id: nodeId, type: "function" });
      }

      // For v1, assume functions are called from "api" service or we infer from metrics
      // This could be extended later with explicit call graph data
    }
  }

  // Build edges from accumulated metrics
  const edges: ServiceEdge[] = [];
  for (const [edgeKey, metrics] of edgeMap.entries()) {
    const [from, to] = parseEdgeKey(edgeKey);
    const latencyP95 = computeP95(metrics.latencies);
    const errorRate = metrics.totalRequests > 0 ? metrics.errorCount / metrics.totalRequests : 0;

    edges.push({
      from,
      to,
      latencyP95: Math.round(latencyP95),
      errorRate: round(errorRate, 4),
    });
  }

  // Sort deterministically for reproducibility
  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => {
    const fromCmp = a.from.localeCompare(b.from);
    return fromCmp !== 0 ? fromCmp : a.to.localeCompare(b.to);
  });

  return {
    buildId,
    nodes,
    edges,
  };
}

/**
 * Extract service name from URL
 * Examples:
 *   https://api.example.com/users → "api"
 *   https://example.com/api/users → "api"
 *   http://localhost:3001/orders → "orders" (heuristic)
 */
function extractServiceName(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname || "";
    const pathname = parsed.pathname || "";

    // Try hostname-based extraction
    if (hostname.includes("api")) return "api";
    if (hostname.includes("auth")) return "auth";
    if (hostname.includes("search")) return "search";
    if (hostname.includes("payment")) return "payment";

    // Try path-based extraction (first path segment)
    const segments = pathname.split("/").filter((s) => s.length > 0);
    if (segments.length > 0) {
      const first = segments[0].toLowerCase();
      // Filter out common file extensions and query strings
      if (!/\.(js|css|png|jpg|gif|svg|ico)$/i.test(first) && first.length <= 30) {
        return first;
      }
    }

    // No service name detected
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse edge key "from→to" format
 */
function parseEdgeKey(key: string): [string, string] {
  const [from, to] = key.split("→");
  return [from || "", to || ""];
}

/**
 * Compute P95 from array of values
 */
function computeP95(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((95 / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Round number to N decimal places
 */
function round(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
