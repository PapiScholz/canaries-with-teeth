# Phase 8: Release Gates

Purpose: Enforce all gating contracts and make deterministic, auditable release decisions.

Signals Produced:
- Release decision (ALLOW, SOFT_BLOCK, BLOCK)
- Decision reasons (array)

Deterministic Rules:
- BLOCK if any canary fails or risk score > 70
- SOFT_BLOCK if risk score ∈ [51–70]
- ALLOW otherwise
- Log all decisions and reasons

Gating Impact:
- BLOCK/SOFT_BLOCK/ALLOW per contract

Failure Modes & Pivots:
- Logging failure → block release
- Contract drift → block, require fix
