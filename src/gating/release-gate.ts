// release-gate.ts
// Deterministic release gating logic for CI/CD. No external deps. No heuristics.

export type ReleaseGateDecision = "ALLOW" | "SOFT_BLOCK" | "BLOCK";

export interface ReleaseGateInputs {
  canaryPassed: boolean;
  riskScore: number; // 0–100
}

export interface ReleaseGateResult {
  decision: ReleaseGateDecision;
  reasons: string[];
  inputs: ReleaseGateInputs;
}

/**
 * Applies hard release gating policy:
 * - If E2E canary fails → BLOCK
 * - Else if riskScore > 70 → BLOCK
 * - Else if riskScore between 51 and 70 → SOFT_BLOCK
 * - Else → ALLOW
 * All decisions are deterministic and auditable.
 */
export function evaluateReleaseGate(inputs: ReleaseGateInputs): ReleaseGateResult {
  const reasons: string[] = [];
  let decision: ReleaseGateDecision = "ALLOW";

  if (!inputs.canaryPassed) {
    decision = "BLOCK";
    reasons.push("E2E canary failed");
  } else if (inputs.riskScore > 70) {
    decision = "BLOCK";
    reasons.push(`Risk score ${inputs.riskScore} > 70`);
  } else if (inputs.riskScore >= 51 && inputs.riskScore <= 70) {
    decision = "SOFT_BLOCK";
    reasons.push(`Risk score ${inputs.riskScore} between 51 and 70`);
  } else {
    decision = "ALLOW";
    reasons.push("All gating conditions passed");
  }

  return {
    decision,
    reasons,
    inputs,
  };
}
