# Runbook: Release Blocks

Purpose: Define deterministic, auditable steps for handling release blocks due to canary or risk score failures.

## When E2E Canary Fails
1. Halt release pipeline immediately.
2. Notify designated canary owner (see on-call list).
3. Owner investigates root cause.
4. Document findings in incident log.
5. Release remains blocked until:
   - Canary passes, OR
   - Approved override (see Overrides section).

**Owner:** Canary owner (see on-call list)
**Release stays blocked:** Until canary passes or override is approved.

## When Risk Score is High
### RiskScore 51–70 (SOFT_BLOCK)
1. Halt release pipeline (soft block).
2. Notify risk owner and release manager.
3. Owner reviews risk inputs and documents findings.
4. Escalate to release manager for override decision.
5. Release remains blocked until:
   - Risk score ≤ 50, OR
   - Approved override.

### RiskScore >70 (BLOCK)
1. Halt release pipeline (hard block).
2. Notify risk owner and release manager.
3. Owner investigates and documents findings.
4. Escalate to release manager for override decision.
5. Release remains blocked until:
   - Risk score ≤ 70, OR
   - Approved override.

## Overrides
- **Allowed:** Only for documented, reviewed cases with explicit justification.
- **NOT allowed:** For silent failures, missing data, or unknown root cause.
- **Required justification fields:**
  - Reason for override
  - Approver name
  - Incident reference
  - Timestamp

## Accountability
- **Override approval:** Release manager or higher
- **Post-mortem responsibility:** Owner of blocked signal (canary or risk)
