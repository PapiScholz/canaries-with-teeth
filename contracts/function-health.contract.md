# Function Health Contract

## Purpose
Track health of critical user-facing functions.

## Inputs (explicit fields)
- function_id
- invocation_count
- error_count
- latency_p95

## Calculation (or evaluation logic)
- Health = (invocation_count - error_count) / invocation_count
- TODO: Add latency threshold logic

## Output range
- 0.0 to 1.0 (float)

## Operational interpretation
- Health < threshold blocks release

## Gating impact
- Release is blocked if any critical function health < threshold

## Non-goals / what this contract does NOT do
- Does not diagnose root cause
- Does not cover non-critical functions
