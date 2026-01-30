// run-release-gate.ts
// Minimal CLI for release gating. No external deps. No framework.
import { evaluateReleaseGate } from "./release-gate";

function parseEnvBool(value: string | undefined): boolean {
  // Accepts 'true' (case-insensitive) as true, everything else as false
  return value !== undefined && value.toLowerCase() === "true";
}

function parseEnvNumber(value: string | undefined): number {
  if (!value || isNaN(Number(value))) {
    throw new Error(`Invalid or missing RISK_SCORE: ${value}`);
  }
  return Number(value);
}

function main() {
  const canaryPassed = parseEnvBool(process.env.CANARY_PASSED);
  const riskScore = parseEnvNumber(process.env.RISK_SCORE);

  const result = evaluateReleaseGate({ canaryPassed, riskScore });

  // Print decision and reasons
  console.log(result.decision);
  result.reasons.forEach(r => console.log(r));

  // Exit codes: 0 (ALLOW), 10 (SOFT_BLOCK), 20 (BLOCK)
  if (result.decision === "ALLOW") {
    process.exit(0);
  } else if (result.decision === "SOFT_BLOCK") {
    process.exit(10);
  } else {
    process.exit(20);
  }
}

main();
