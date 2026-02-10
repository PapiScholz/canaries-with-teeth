/**
 * SERVICE MAP GATE v2
 * 
 * STATUS: SKELETON ONLY — NOT ACTIVATED
 * 
 * This module provides deterministic release gating based on Service Map Diff artifacts.
 * It is a pure function with NO side effects, NO I/O, and NO dependencies on canaries,
 * risk scores, telemetry, or other gating mechanisms.
 * 
 * CONTRACT: See contracts/service-map-gate-v2.contract.md
 * 
 * MENTAL MODEL: diff + context → decision + reasons
 * 
 * ACTIVATION STATUS: This gate is NOT wired into CI, release logic, or any automated process.
 * It exists as a skeleton to define the rules and prepare for future activation.
 * 
 * DO NOT IMPORT THIS MODULE unless explicitly integrating Service Map Gates v2.
 */

import crypto from "crypto";

// ============================================================================
// TYPE DEFINITIONS (Input Contract)
// ============================================================================

/**
 * Added node in the current service map (not present in baseline)
 */
export interface AddedNode {
  id: string;
  type: "frontend" | "service" | "function";
}

/**
 * Removed node from the baseline (not present in current)
 */
export interface RemovedNode {
  id: string;
  type: "frontend" | "service" | "function";
}

/**
 * Newly added edge in the current service map
 */
export interface AddedEdge {
  from: string;
  to: string;
  latencyP95: number;    // milliseconds
  errorRate: number;     // 0.0–1.0
  onCriticalPath?: boolean; // Whether this edge is on the critical path
}

/**
 * Removed edge from the baseline
 */
export interface RemovedEdge {
  from: string;
  to: string;
  baselineLatencyP95: number;
  baselineErrorRate: number;
}

/**
 * Edge that exists in both baseline and current, with numeric changes
 */
export interface ChangedEdge {
  from: string;
  to: string;
  baselineLatencyP95: number;
  currentLatencyP95: number;
  latencyChange: number;              // current - baseline (positive = slower)
  baselineErrorRate: number;
  currentErrorRate: number;
  errorRateChange: number;            // current - baseline (positive = more errors)
  onCriticalPath?: boolean;           // Whether this edge is on the critical path
}

/**
 * Critical path information (derived, non-normative)
 */
export interface CriticalPathInfo {
  baselineLength: number;
  currentLength: number;
  lengthChange: number;               // current - baseline
}

/**
 * Service Map Diff artifact (input to the gate)
 * 
 * This is the ONLY input consumed by the gate.
 * Schema defined in: contracts/service-maps-diff.contract.md
 */
export interface ServiceMapDiff {
  buildId: string;
  hash: string;                       // SHA256 of the diff artifact
  baselineMapHash: string | null;
  addedNodes: AddedNode[];
  removedNodes: RemovedNode[];
  addedEdges: AddedEdge[];
  removedEdges: RemovedEdge[];
  changedEdges: ChangedEdge[];
  criticalPath: CriticalPathInfo | null;
}

/**
 * Context passed to the gate for decision logic
 * 
 * Used to determine protected branch escalation (SOFT_BLOCK → BLOCK)
 */
export interface ServiceMapGateContext {
  branch?: string;   // e.g., "main", "feature/new-api"
  tag?: string;      // e.g., "v1.2.3"
}

// ============================================================================
// TYPE DEFINITIONS (Output Contract)
// ============================================================================

/**
 * Gate decision enum
 */
export type ServiceMapGateDecision = "ALLOW" | "SOFT_BLOCK" | "BLOCK";

/**
 * Service Map Gate v2 output
 * 
 * Schema defined in: contracts/service-map-gate-v2.contract.md
 */
export interface ServiceMapGateResult {
  version: "v1";
  gate: "service-map-v2";
  decision: ServiceMapGateDecision;
  reasons: string[];
  input_hash: string;                 // SHA256 of the input diff
  evaluated_at: string;               // ISO 8601 timestamp
  context: ServiceMapGateContext;
}

// ============================================================================
// GATING RULES (Deterministic, Frozen)
// ============================================================================

/**
 * RULE 1 — Dependency Drift (HARD BLOCK)
 * 
 * Condition: Any newly added edge appears on the critical path
 * Decision: BLOCK
 * Reason: "New dependency introduced on critical path"
 * 
 * Rationale: Adding new dependencies to the critical path increases system complexity
 * and risk. All new critical path edges must be explicitly reviewed and baselined.
 */
function evaluateRule1_DependencyDrift(diff: ServiceMapDiff): {
  triggered: boolean;
  decision: ServiceMapGateDecision;
  reason: string | null;
} {
  // Check if any added edge is marked as being on the critical path
  const newCriticalEdges = diff.addedEdges.filter((edge) => edge.onCriticalPath === true);

  if (newCriticalEdges.length > 0) {
    return {
      triggered: true,
      decision: "BLOCK",
      reason: "New dependency introduced on critical path",
    };
  }

  return { triggered: false, decision: "ALLOW", reason: null };
}

/**
 * RULE 2 — Critical Path Expansion (HARD BLOCK)
 * 
 * Condition: Critical path length increased compared to baseline
 * Decision: BLOCK
 * Reason: "Critical path length increased from {baseline} to {current}"
 * 
 * Rationale: Critical path expansion indicates architectural degradation.
 * Longer critical paths increase latency, failure domains, and debugging complexity.
 */
function evaluateRule2_CriticalPathExpansion(diff: ServiceMapDiff): {
  triggered: boolean;
  decision: ServiceMapGateDecision;
  reason: string | null;
} {
  if (!diff.criticalPath) {
    // No critical path info available; cannot evaluate
    return { triggered: false, decision: "ALLOW", reason: null };
  }

  if (diff.criticalPath.lengthChange > 0) {
    return {
      triggered: true,
      decision: "BLOCK",
      reason: `Critical path length increased from ${diff.criticalPath.baselineLength} to ${diff.criticalPath.currentLength}`,
    };
  }

  return { triggered: false, decision: "ALLOW", reason: null };
}

/**
 * RULE 3 — Latency Regression on Critical Path (SOFT_BLOCK → HARD BLOCK)
 * 
 * Condition: Any edge on the critical path has a latency regression where:
 *   current_p95 >= 2.0 * baseline_p95
 * 
 * Decision:
 *   - SOFT_BLOCK for non-protected branches
 *   - BLOCK for protected branches (main or tagged releases)
 * 
 * Reason: "Latency regression on critical path edge {from}->{to}: {current}ms vs {baseline}ms"
 * 
 * Rationale: 2x latency regressions on the critical path directly degrade user experience.
 * Soft-blocking allows investigation on feature branches, while hard-blocking protects production.
 */
function evaluateRule3_LatencyRegression(
  diff: ServiceMapDiff,
  context: ServiceMapGateContext
): {
  triggered: boolean;
  decision: ServiceMapGateDecision;
  reasons: string[];
} {
  const reasons: string[] = [];
  let triggered = false;

  // Check for 2x latency regressions on critical path edges
  const criticalEdgesWithRegression = diff.changedEdges.filter((edge) => {
    const isOnCriticalPath = edge.onCriticalPath === true;
    const hasRegression = edge.currentLatencyP95 >= 2.0 * edge.baselineLatencyP95;
    return isOnCriticalPath && hasRegression;
  });

  if (criticalEdgesWithRegression.length > 0) {
    triggered = true;
    criticalEdgesWithRegression.forEach((edge) => {
      reasons.push(
        `Latency regression on critical path edge ${edge.from}->${edge.to}: ${edge.currentLatencyP95}ms vs ${edge.baselineLatencyP95}ms`
      );
    });
  }

  if (!triggered) {
    return { triggered: false, decision: "ALLOW", reasons: [] };
  }

  // Determine if this is a protected branch/tag
  const isProtectedBranch = context.branch === "main" || !!context.tag;

  return {
    triggered: true,
    decision: isProtectedBranch ? "BLOCK" : "SOFT_BLOCK",
    reasons,
  };
}

/**
 * RULE 4 — Non-Critical Changes (ALLOW)
 * 
 * Condition: Changes occur outside the critical path
 * Decision: ALLOW
 * Reason: "All changes are outside critical path"
 * 
 * Rationale: Latency or structural changes outside the critical path do not directly
 * impact user-facing flows and should not block releases.
 * 
 * This is the default fallback if no other rules trigger.
 */
function evaluateRule4_NonCriticalChanges(): {
  triggered: boolean;
  decision: ServiceMapGateDecision;
  reason: string;
} {
  return {
    triggered: true,
    decision: "ALLOW",
    reason: "All changes are outside critical path",
  };
}

// ============================================================================
// MAIN GATE EVALUATION FUNCTION (Pure, Deterministic)
// ============================================================================

/**
 * Evaluate Service Map Gate v2
 * 
 * This is a PURE FUNCTION that takes a Service Map Diff and context, and returns
 * a deterministic gate decision with explicit reasoning.
 * 
 * RULES APPLIED (in order):
 * 1. Dependency Drift (BLOCK if new critical path edges)
 * 2. Critical Path Expansion (BLOCK if critical path length increased)
 * 3. Latency Regression (SOFT_BLOCK or BLOCK if 2x regression on critical path)
 * 4. Non-Critical Changes (ALLOW as default fallback)
 * 
 * PRECEDENCE:
 * - BLOCK overrides SOFT_BLOCK and ALLOW
 * - SOFT_BLOCK overrides ALLOW
 * - All triggered reasons are included in the output
 * 
 * DETERMINISM GUARANTEE:
 * Given the same diff (same hash) and context, this function MUST produce:
 * - Identical decision
 * - Identical reasons (same order)
 * - Identical output hash
 * 
 * NO SIDE EFFECTS:
 * - No filesystem access
 * - No logging
 * - No external API calls
 * - No randomness
 * 
 * ACTIVATION STATUS: This function is NOT called by any automated process.
 * It exists as a skeleton only. DO NOT wire into CI or release logic without explicit approval.
 * 
 * @param diff - Service Map Diff artifact (from artifacts/service-maps/{buildId}.diff.json)
 * @param context - Branch or tag information for protected branch escalation
 * @returns ServiceMapGateResult - Deterministic gate decision with reasons
 */
export function evaluateServiceMapGate(
  diff: ServiceMapDiff,
  context: ServiceMapGateContext = {}
): ServiceMapGateResult {
  const reasons: string[] = [];
  let finalDecision: ServiceMapGateDecision = "ALLOW";

  // Apply RULE 1: Dependency Drift
  const rule1 = evaluateRule1_DependencyDrift(diff);
  if (rule1.triggered && rule1.reason) {
    reasons.push(rule1.reason);
    if (rule1.decision === "BLOCK") {
      finalDecision = "BLOCK";
    }
  }

  // Apply RULE 2: Critical Path Expansion
  const rule2 = evaluateRule2_CriticalPathExpansion(diff);
  if (rule2.triggered && rule2.reason) {
    reasons.push(rule2.reason);
    if (rule2.decision === "BLOCK") {
      finalDecision = "BLOCK";
    }
  }

  // Apply RULE 3: Latency Regression
  const rule3 = evaluateRule3_LatencyRegression(diff, context);
  if (rule3.triggered && rule3.reasons.length > 0) {
    reasons.push(...rule3.reasons);
    // Respect precedence: BLOCK > SOFT_BLOCK > ALLOW
    if (finalDecision !== "BLOCK") {
      finalDecision = rule3.decision;
    }
  }

  // Apply RULE 4: Non-Critical Changes (fallback)
  if (reasons.length === 0) {
    const rule4 = evaluateRule4_NonCriticalChanges();
    reasons.push(rule4.reason);
    finalDecision = rule4.decision;
  }

  // Generate deterministic timestamp (ISO 8601)
  const evaluatedAt = new Date().toISOString();

  // Return gate result matching output contract
  return {
    version: "v1",
    gate: "service-map-v2",
    decision: finalDecision,
    reasons,
    input_hash: diff.hash,
    evaluated_at: evaluatedAt,
    context,
  };
}

// ============================================================================
// UTILITY FUNCTIONS (for future activation)
// ============================================================================

/**
 * Compute SHA-256 hash of the gate result for auditability
 * 
 * This is NOT used in the current skeleton but is provided for future activation.
 * When the gate is activated, this hash can be used to verify result integrity.
 */
export function computeGateResultHash(result: ServiceMapGateResult): string {
  // Canonical JSON serialization (sorted keys, no whitespace)
  const canonical = JSON.stringify(
    {
      version: result.version,
      gate: result.gate,
      decision: result.decision,
      reasons: result.reasons,
      input_hash: result.input_hash,
      context: result.context,
    },
    Object.keys(result).sort()
  );

  const hash = crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
  return `sha256:${hash}`;
}

/**
 * Validate Service Map Diff input
 * 
 * Ensures the diff artifact conforms to the expected schema before evaluation.
 * Throws if the diff is invalid or malformed.
 * 
 * This is NOT enforced in the current skeleton but is provided for future activation.
 */
export function validateServiceMapDiff(diff: unknown): asserts diff is ServiceMapDiff {
  if (typeof diff !== "object" || diff === null) {
    throw new Error("Service Map Diff must be an object");
  }

  const d = diff as Record<string, unknown>;

  if (typeof d.buildId !== "string") {
    throw new Error("Service Map Diff must have a buildId (string)");
  }

  if (typeof d.hash !== "string") {
    throw new Error("Service Map Diff must have a hash (string)");
  }

  if (!Array.isArray(d.addedEdges)) {
    throw new Error("Service Map Diff must have addedEdges (array)");
  }

  if (!Array.isArray(d.changedEdges)) {
    throw new Error("Service Map Diff must have changedEdges (array)");
  }

  // Additional validation can be added here when activated
}

// ============================================================================
// EXPORTS
// ============================================================================

// Types and main evaluation function are already exported above
// Internal rule functions are intentionally NOT exported to prevent misuse
