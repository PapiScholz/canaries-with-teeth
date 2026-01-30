# Risk Score Contract

## Purpose
Provide a single deterministic signal (0–100) that summarizes product and system risk for **release gating**.
The score is **ML-free**, auditable, reproducible, and explainable.  
Primary use: block or allow releases based on observed degradation, not intuition.

## Inputs
All inputs are derived from existing frozen contracts.

1. **UDI (UI Degradation Index)**
   - Daily aggregate (avg + p95).
   - Range: 0–100 (higher = worse).

2. **Function Health**
   - Aggregated backend health signal.
   - Components: latency, cold starts, logical drift.
   - Normalized to 0–100 (higher = worse).

3. **Friction Budgets**
   - % of critical flows exceeding defined budgets.
   - Normalized to 0–100 (higher = worse).

4. **Trends**
   - 7-day slope for UDI and Function Health.
   - Captures *direction*, not just absolute state.

## Calculation
The score is a weighted sum of normalized components plus trend penalties.

### Base Score (80%)
- UDI: **35%**
- Function Health: **30%**
- Friction Budgets: **15%**

### Trend Modifier (20%)
- UDI trend (7-day slope): **12%**
- Function Health trend (7-day slope): **8%**

### Formula (conceptual)
riskScore =
0.35 * UDI +
0.30 * FunctionHealth +
0.15 * Friction +
0.12 * Trend(UDI) +
0.08 * Trend(FunctionHealth)

- All components are clamped to 0–100.
- Trend inputs are normalized so that:
  - Stable or improving trends → near 0 contribution.
  - Sustained degradation → proportional penalty.

## Output Range
- **0–100 integer**
- Rounded, deterministic.
- Same inputs always yield the same output.

## Operational Interpretation
| Range | Meaning | Action |
|-----|--------|--------|
| 0–30 | Healthy | Release allowed |
| 31–50 | Elevated | Release allowed, monitor |
| 51–70 | High risk | Release requires explicit approval |
| >70 | Critical | Release blocked |

## Gating Impact
- **riskScore > 70** → automatic release block.
- **riskScore 51–70** → soft gate (human override required).
- **riskScore ≤ 50** → no gating impact.

Gating decisions are **binary and explicit**.  
No smoothing, no heuristics, no exceptions.

## Non-Goals
- No machine learning or probabilistic models.
- No per-user personalization.
- No silent auto-adjustment of weights.
- No replacement for root-cause analysis.

Any change to weights, thresholds, or formula requires a contract revision.
