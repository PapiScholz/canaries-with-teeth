# Phase 6: Friction Budgets

Purpose: Quantify user friction in critical flows and enforce deterministic friction budgets for release gating.

Signals Produced:
- Friction score (0–100)
- Over-budget (boolean)

Deterministic Rules:
- BLOCK if friction score > budget
- ALLOW if within budget

Gating Impact:
- BLOCK on over-budget

Failure Modes & Pivots:
- Friction type misclassified → update contract
- Budget too low → update contract, rerun
