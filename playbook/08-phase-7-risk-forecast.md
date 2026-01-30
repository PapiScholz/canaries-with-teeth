# Phase 7: Risk Forecast

Purpose: Synthesize a deterministic risk score (0–100) from all normalized signals for release gating.

Signals Produced:
- Risk score (0–100)
- Component breakdown (UDI, function health, friction, trends)

Deterministic Rules:
- BLOCK if risk score > 70
- SOFT_BLOCK if risk score ∈ [51–70]
- ALLOW if ≤ 50

Gating Impact:
- BLOCK/SOFT_BLOCK/ALLOW per contract

Failure Modes & Pivots:
- Input field mismatch → block, fix integration
- Score drift → update weights in contract
