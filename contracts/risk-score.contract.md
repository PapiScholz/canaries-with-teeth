# Risk Score Contract

## Purpose
Synthesize normalized risk from all signals for gating.

## Inputs (explicit fields)
- canary_status
- function_health
- friction_budget
- telemetry_completeness

## Calculation (or evaluation logic)
- Risk score = deterministic function of inputs
- TODO: Specify formula and weights

## Output range
- 0 to 100 (integer)

## Operational interpretation
- Score > threshold blocks release

## Gating impact
- Release is blocked if risk score > threshold

## Non-goals / what this contract does NOT do
- Does not use ML or adaptive thresholds
- Does not alert or page
