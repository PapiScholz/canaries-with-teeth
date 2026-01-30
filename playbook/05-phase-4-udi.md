# Phase 4: UDI

Purpose: Ensure all telemetry and canary signals are correlated to a unique deployment identifier (UDI).

Signals Produced:
- UDI field in all events
- UDI correlation in aggregates

Deterministic Rules:
- All events must include UDI
- Aggregation must group by UDI

Gating Impact:
- BLOCK if UDI missing in any event

Failure Modes & Pivots:
- UDI missing → block release, log event
- UDI collision → block, require redeploy
