# Friction Budget Contract

## Purpose
Quantify user friction in critical flows and enforce deterministic budget limits for release gating.

## Inputs (explicit fields)
- frictionTypes: array of { type: string, count: integer, weight: number (0–1) }
- userSessions: integer
- budget: number (0–100)

## Deterministic Calculation
- For each frictionType: weighted = count * weight
- score = sum(weighted for all types) / userSessions * 100
- Over-budget if score > budget

## Friction Types and Weights
- Example types: navigationError, validationError, timeout, retry, abandonment
- Each type must have explicit weight (0–1)

## Output Fields
- frictionTypes (with type, count, weight)
- score (number, 0–100)
- budget (number, 0–100)
- overBudget (boolean)
- reason (string, required if overBudget)

## Budget Evaluation Rules
- If score > budget, overBudget = true, reason required
- If score ≤ budget, overBudget = false

## Gating Thresholds
- BLOCK if overBudget == true
- Log all over-budget reasons

## Operational Interpretation
- Release is blocked if friction score exceeds budget
- All calculations are deterministic and auditable

## Non-goals
- No root cause analysis
- No non-user-facing friction
