# Friction Budget Contract

## Purpose
Quantify user friction and enforce budget limits.

## Inputs (explicit fields)
- friction_events
- user_sessions
- friction_type

## Calculation (or evaluation logic)
- Friction rate = friction_events / user_sessions
- TODO: Define friction_type weights

## Output range
- 0.0 to 1.0 (float)

## Operational interpretation
- Exceeding friction budget blocks release

## Gating impact
- Release is blocked if friction rate > budget

## Non-goals / what this contract does NOT do
- Does not explain friction causes
- Does not budget for non-user-facing events
