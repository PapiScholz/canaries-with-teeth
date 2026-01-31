
// Minimal contract for DailyRiskForecast (MODE 0 consumer only)
export interface DailyRiskForecast {
  riskScore?: number;
  components?: {
    udiZ?: number;
    frictionZ?: number;
    latencyZ?: number;
    driftZ?: number;
    errorZ?: number;
    udiTrend?: number;
  };
}

export type RiskDecision = "ALLOW" | "SOFT_BLOCK" | "BLOCK";

export interface RiskGateResult {
  decision: RiskDecision;
  topReasons: string[];
  windowDays: number;
}

export function evaluateRiskGate(
  forecast: DailyRiskForecast | null,
  opts?: { windowDays?: number }
): RiskGateResult {
  const windowDays = opts?.windowDays ?? 7;

  if (!forecast) {
    return {
      decision: "SOFT_BLOCK",
      topReasons: [
        "Insufficient telemetry data",
        "Risk forecast unavailable",
      ],
      windowDays,
    };
  }

  const reasons: string[] = [];
  const riskScore = forecast.riskScore ?? 0;
  const components = forecast.components ?? {};

  const {
    udiZ,
    frictionZ,
    latencyZ,
    driftZ,
    errorZ,
    udiTrend,
  } = components;

  if (udiZ !== undefined && udiZ > 1) reasons.push("UI degradation detected");
  if (udiTrend !== undefined && udiTrend > 0.6) reasons.push("Worsening UI trend");
  if (frictionZ !== undefined && frictionZ > 1) reasons.push("User flow friction increasing");
  if (latencyZ !== undefined && latencyZ > 1) reasons.push("Backend latency regression");
  if (driftZ !== undefined && driftZ > 0.8) reasons.push("Function behavior drift detected");
  if (errorZ !== undefined && errorZ > 1) reasons.push("Error rate above baseline");

  let decision: RiskDecision = "ALLOW";
  if (riskScore >= 75) decision = "BLOCK";
  else if (riskScore >= 50) decision = "SOFT_BLOCK";

  if (reasons.length === 0 && riskScore > 0) {
    reasons.push("Overall risk elevated");
  }

  return {
    decision,
    topReasons: reasons.slice(0, 3),
    windowDays,
  };
}
