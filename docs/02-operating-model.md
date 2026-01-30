# Operating Model

This document defines the day-to-day operational flow for the canaries-with-teeth framework. All actions are deterministic and auditable.

## Signals Monitored
- Synthetic canary results (E2E, perf)
- In-app telemetry (contracted events)
- Aggregated daily facts
- Risk score (normalized, deterministic)

## Release-Blocking Signals
- Any failed synthetic canary
- Risk score above threshold (see risk-score.contract.md)
- Schema or contract drift

## Human Intervention
- Only permitted for root-cause analysis or contract updates
- Not permitted for routine release gating or threshold overrides
- All interventions must be auditable

## Normal Deploy Flow
1. Run all synthetic canaries (CI and scheduled)
2. Aggregate telemetry and daily facts
3. Calculate risk score
4. Evaluate release gates:
   - If all gates pass, proceed to deploy
   - If any gate fails, block release
5. Log all decisions and outcomes

## Degraded Deploy Flow
- If a canary or risk gate fails:
  - Block release automatically
  - Notify responsible team
  - Human review required for override (must be logged)
- No auto-rollback unless explicitly defined in contracts

## Notes
- No dashboards are required for gating; all decisions are contract-driven
- All signals must be versioned and schema-validated
