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
 *
 * DETERMINISM GUARANTEE: Same inputs → identical outputs, hashes, and ordering
 */

import { createHash } from "crypto";
import {
  ServiceMap,
  ServiceNode,
  ServiceEdge,
  ServiceMapDiff,
  NetworkObservation,
  DestinationMetrics,
  AddedEdge,
  RemovedEdge,
  ChangedEdge,
  AddedNode,
  RemovedNode,
} from "./types";

/**
 * Build a Service Map from network observations and function metrics
 * Deterministic: identical inputs produce identical outputs and hash
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

  // Compute deterministic hash of the map (canonical ordering guaranteed)
  const canonicalJson = JSON.stringify({ buildId, nodes, edges });
  const hash = computeHash(canonicalJson);

  return {
    buildId,
    hash,
    nodes,
    edges,
  };
}

/**
 * Compute Service Map Diff comparing current to baseline
 * Deterministic: same inputs produce identical diff and hash
 */
export function buildServiceMapDiff(
  buildId: string,
  currentMap: ServiceMap,
  baselineMap: ServiceMap | null
): ServiceMapDiff {
  const addedNodes: AddedNode[] = [];
  const removedNodes: RemovedNode[] = [];
  const addedEdges: AddedEdge[] = [];
  const removedEdges: RemovedEdge[] = [];
  const changedEdges: ChangedEdge[] = [];

  // If no baseline, everything in current is "added"
  if (!baselineMap) {
    for (const node of currentMap.nodes) {
      addedNodes.push({ id: node.id, type: node.type });
    }
    for (const edge of currentMap.edges) {
      addedEdges.push({
        from: edge.from,
        to: edge.to,
        latencyP95: edge.latencyP95,
        errorRate: edge.errorRate,
      });
    }
  } else {
    // Compare nodes
    const baselineNodeIds = new Set(baselineMap.nodes.map((n) => n.id));
    const currentNodeIds = new Set(currentMap.nodes.map((n) => n.id));

    for (const node of currentMap.nodes) {
      if (!baselineNodeIds.has(node.id)) {
        addedNodes.push({ id: node.id, type: node.type });
      }
    }

    for (const node of baselineMap.nodes) {
      if (!currentNodeIds.has(node.id)) {
        removedNodes.push({ id: node.id, type: node.type });
      }
    }

    // Compare edges
    const baselineEdgeMap = new Map<string, ServiceEdge>();
    for (const edge of baselineMap.edges) {
      baselineEdgeMap.set(`${edge.from}→${edge.to}`, edge);
    }

    const currentEdgeMap = new Map<string, ServiceEdge>();
    for (const edge of currentMap.edges) {
      currentEdgeMap.set(`${edge.from}→${edge.to}`, edge);
    }

    // Added and changed edges
    for (const edge of currentMap.edges) {
      const key = `${edge.from}→${edge.to}`;
      const baselineEdge = baselineEdgeMap.get(key);

      if (!baselineEdge) {
        addedEdges.push({
          from: edge.from,
          to: edge.to,
          latencyP95: edge.latencyP95,
          errorRate: edge.errorRate,
        });
      } else if (
        baselineEdge.latencyP95 !== edge.latencyP95 ||
        baselineEdge.errorRate !== edge.errorRate
      ) {
        changedEdges.push({
          from: edge.from,
          to: edge.to,
          baselineLatencyP95: baselineEdge.latencyP95,
          currentLatencyP95: edge.latencyP95,
          latencyChange: edge.latencyP95 - baselineEdge.latencyP95,
          baselineErrorRate: baselineEdge.errorRate,
          currentErrorRate: edge.errorRate,
          errorRateChange: edge.errorRate - baselineEdge.errorRate,
        });
      }
    }

    // Removed edges
    for (const edge of baselineMap.edges) {
      const key = `${edge.from}→${edge.to}`;
      if (!currentEdgeMap.has(key)) {
        removedEdges.push({
          from: edge.from,
          to: edge.to,
          baselineLatencyP95: edge.latencyP95,
          baselineErrorRate: edge.errorRate,
        });
      }
    }
  }

  // Sort deterministically
  addedNodes.sort((a, b) => a.id.localeCompare(b.id));
  removedNodes.sort((a, b) => a.id.localeCompare(b.id));
  addedEdges.sort((a, b) => {
    const cmp = a.from.localeCompare(b.from);
    return cmp !== 0 ? cmp : a.to.localeCompare(b.to);
  });
  removedEdges.sort((a, b) => {
    const cmp = a.from.localeCompare(b.from);
    return cmp !== 0 ? cmp : a.to.localeCompare(b.to);
  });
  changedEdges.sort((a, b) => {
    const cmp = a.from.localeCompare(b.from);
    return cmp !== 0 ? cmp : a.to.localeCompare(b.to);
  });

  // TODO(v2): Compute critical path if needed
  // For v1, leave as null (non-normative)
  const criticalPath = null;

  // Compute deterministic hash
  const diffContent = {
    buildId,
    addedNodes,
    removedNodes,
    addedEdges,
    removedEdges,
    changedEdges,
    criticalPath,
  };
  const canonicalJson = JSON.stringify(diffContent);
  const hash = computeHash(canonicalJson);

  return {
    buildId,
    hash,
    baselineMapHash: baselineMap?.hash || null,
    addedNodes,
    removedNodes,
    addedEdges,
    removedEdges,
    changedEdges,
    criticalPath,
  };
}

/**
 * Validate determinism: replay must produce identical map and hash
 * Returns true if valid, false if hash mismatch indicates corruption or non-determinism
 */
export function validateDeterminismMap(
  mapWithHash: ServiceMap & { hash: string }
): boolean {
  const { hash: originalHash, ...mapContent } = mapWithHash;
  const canonicalJson = JSON.stringify({
    buildId: mapContent.buildId,
    nodes: mapContent.nodes,
    edges: mapContent.edges,
  });
  const recomputedHash = computeHash(canonicalJson);
  return recomputedHash === originalHash;
}

/**
 * Validate determinism: diff must produce identical hash
 */
export function validateDeterminismDiff(
  diffWithHash: ServiceMapDiff & { hash: string }
): boolean {
  const { hash: originalHash, ...diffContent } = diffWithHash;
  const canonicalJson = JSON.stringify({
    buildId: diffContent.buildId,
    addedNodes: diffContent.addedNodes,
    removedNodes: diffContent.removedNodes,
    addedEdges: diffContent.addedEdges,
    removedEdges: diffContent.removedEdges,
    changedEdges: diffContent.changedEdges,
    criticalPath: diffContent.criticalPath,
  });
  const recomputedHash = computeHash(canonicalJson);
  return recomputedHash === originalHash;
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
 * Deterministic: same values produce identical P95
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
 * Deterministic: same input produces identical output
 */
function round(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Compute SHA256 hash of canonical JSON
 * Used for determinism validation and replay support
 */
export function computeHash(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

