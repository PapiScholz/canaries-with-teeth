# Phase 5: Function Health

Purpose: Track and gate on health of critical user-facing functions using explicit error, latency, cold start, and drift thresholds.

Signals Produced:
- Per-function healthStatus (OK/WARN/BLOCK)
- Error rate, latencyMsP95, coldStartMs, logicalDrift

Deterministic Rules:
- BLOCK if any healthStatus == BLOCK
- WARN triggers alert, not block

Gating Impact:
- BLOCK on any BLOCK status
- ALLOW only if all critical functions OK

Failure Modes & Pivots:
- Data missing → block release
- Thresholds too strict → update contract, rerun
