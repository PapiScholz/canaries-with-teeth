# Function Health Contract

## Purpose
Deterministically track health of critical user-facing functions for release gating.

## Inputs (explicit fields)
- functionId (string)
- invocationCount (integer)
- errorCount (integer)
- latencyMsP95 (number, ms)
- coldStartMs (number, ms)
- logicalDrift (number, 0–1)

## Deterministic Calculation
- errorRate = errorCount / invocationCount
- HealthStatus is assigned as follows (all thresholds explicit):
	- BLOCK if errorRate > 0.05 OR latencyMsP95 > 2000 OR coldStartMs > 5000 OR logicalDrift > 0.2
	- WARN if errorRate ∈ (0.01, 0.05] OR latencyMsP95 ∈ (1000, 2000] OR coldStartMs ∈ (2000, 5000] OR logicalDrift ∈ (0.1, 0.2]
	- OK otherwise

## Explicit Thresholds
- errorRate: OK ≤ 0.01, WARN (0.01–0.05], BLOCK > 0.05
- latencyMsP95: OK ≤ 1000, WARN (1000–2000], BLOCK > 2000
- coldStartMs: OK ≤ 2000, WARN (2000–5000], BLOCK > 5000
- logicalDrift: OK ≤ 0.1, WARN (0.1–0.2], BLOCK > 0.2

## Output Fields
- healthStatus: OK | WARN | BLOCK
- All input fields above

## Operational Interpretation
- Any function with healthStatus BLOCK must block release
- WARN triggers alert but does not block
- OK is required for all critical functions to allow release

## Gating Impact
- BLOCK if any critical function healthStatus == BLOCK
- Log all BLOCK/WARN reasons

## Non-goals
- No root cause analysis
- No non-critical function tracking
