# Build ID Contract

## Purpose
Provide a stable, deterministic identifier for every deploy in order to
correlate canaries, telemetry, and risk evaluation across systems.

The Build ID is the backbone for traceability. If it breaks, correlation breaks.

---

## Inputs (explicit fields)
- build_id
- commit_hash
- build_timestamp
- environment

---

## Calculation (evaluation logic)
- build_id MUST be deterministic
- Recommended format:

  build_id = <commit_hash>-<ci_build_number>

- build_timestamp MUST represent build creation time, not deploy start
- environment MUST be explicit (e.g. prod, staging, preview)

---

## Output range
- String
- Globally unique per deploy **within the same environment**

---

## Operational interpretation
- Used to correlate:
  - E2E canaries
  - UI telemetry (UDI)
  - Function health
  - Friction budgets
  - Risk forecasts
- Enables cross-system joins and historical comparison

---

## Gating impact
- Release is blocked if:
  - build_id is missing
  - commit_hash is missing
  - build_id is duplicated within the same environment
- Telemetry without build_id is considered invalid for gating

---

## Non-goals / what this contract does NOT do
- Does not validate build artifacts
- Does not guarantee code quality
- Does not infer deployment success
- Does not replace canary signals