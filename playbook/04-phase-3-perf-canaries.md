# Phase 3: Perf Canaries

Purpose: Detect performance regressions using synthetic canaries with explicit p95 and hard cap thresholds.

Signals Produced:
- Canary p95 latency (ms)
- Hard cap breach (boolean)

Deterministic Rules:
- BLOCK if p95 latency > threshold or hard cap breached
- ALLOW if all canaries pass

Gating Impact:
- BLOCK on any canary fail

Failure Modes & Pivots:
- Canary flake → rerun once, then block if repeatable
- Threshold misconfiguration → update contract, rerun
