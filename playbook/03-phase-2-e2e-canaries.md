# Phase 2 – E2E Canaries (Synthetic)

## Objective
Detect **functional and performance regressions** before user traffic does.
These canaries are blocking signals, not smoke tests.

## What to Canary
Select **critical user flows**:
- Revenue-impacting
- State-mutating
- Frequently used

Rule: if it breaks and users notice within minutes, it belongs here.

Limit to a small, stable set. Coverage is less important than signal quality.

## Instrumentation
Each flow must produce:
- Functional pass/fail
- Step-level timing

### Performance Rules
- Track **p95** per step.
- Enforce:
  - Historical p95 baseline
  - Hard upper bound (absolute cap)

Both must be satisfied. Either violation fails the canary.

## Execution Model
- Run on:
  - Every release candidate
  - Scheduled intervals (to detect drift without deploys)
- Environment:
  - Production-like
  - Isolated credentials
  - Deterministic data setup

## Gating
- Any canary failure **blocks the release**.
- No retries to “see if it passes”.
- Flakiness is treated as a system defect, not test noise.

## Responsibilities
- **Product**: define which flows are critical.
- **Engineering**: keep selectors stable and deterministic.
- **Platform**: ensure environments are representative.
- **Release owner**: owns the block decision and escalation.

## Failure Modes & Pivots
- **Flaky failures**
  - Pivot: remove non-deterministic steps, stabilize data, tighten selectors.
- **Baseline drift**
  - Pivot: re-baseline explicitly after confirmed intentional changes.
- **Too many false positives**
  - Pivot: reduce scope or split flows; do not relax thresholds blindly.
- **Infrastructure noise**
  - Pivot: adjust hard caps, not relative baselines.

## When to Pivot
- Canary blocks >20% of releases without real regressions.
- Failures cannot be explained within one investigation cycle.
- Performance noise dominates functional signal.

If a canary is ignored, it is already dead. Fix or remove it.
