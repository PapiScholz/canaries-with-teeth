# Service Map Gate v2 — SKELETON ONLY (NOT ACTIVATED)

## Status: DESIGN + IMPLEMENTATION COMPLETE, ZERO ACTIVATION

This directory contains the **Service Map Gate v2** implementation, which is a deterministic release gate based on Service Map Diff artifacts.

**⚠️ CRITICAL: This gate is NOT activated and MUST NOT be wired into CI, release logic, or any automated process without explicit approval.**

---

## What Is Service Map Gate v2?

Service Map Gate v2 is a **pure function** that evaluates Service Map Diff artifacts to produce deterministic release decisions:

```
diff + context → decision + reasons
```

### Mental Model
- **Input**: Service Map Diff artifact (from `artifacts/service-maps/{buildId}.diff.json`)
- **Context**: Branch or tag information (e.g., `{ branch: "main" }`)
- **Output**: Gate decision (`ALLOW`, `SOFT_BLOCK`, or `BLOCK`) with explicit reasons

### Design Principles
- ✅ Pure function (no side effects, no I/O)
- ✅ Deterministic (same input → same output)
- ✅ Isolated (no dependencies on canaries, risk scores, telemetry, or dashboards)
- ✅ ML-free, heuristic-free, configuration-free
- ✅ Frozen rules (no tuning knobs)

---

## Gating Rules

The gate applies **four deterministic rules** in order:

### RULE 1 — Dependency Drift (HARD BLOCK)
**Trigger**: Any newly added edge appears on the critical path  
**Decision**: `BLOCK`  
**Reason**: `"New dependency introduced on critical path"`

### RULE 2 — Critical Path Expansion (HARD BLOCK)
**Trigger**: Critical path length increased compared to baseline  
**Decision**: `BLOCK`  
**Reason**: `"Critical path length increased from {baseline} to {current}"`

### RULE 3 — Latency Regression on Critical Path (SOFT_BLOCK → HARD BLOCK)
**Trigger**: Any edge on the critical path has a latency regression where `current_p95 >= 2.0 * baseline_p95`  
**Decision**:
- `SOFT_BLOCK` for non-protected branches (feature branches)
- `BLOCK` for protected branches (`main` or tagged releases)  
**Reason**: `"Latency regression on critical path edge {from}->{to}: {current}ms vs {baseline}ms"`

### RULE 4 — Non-Critical Changes (ALLOW)
**Trigger**: Changes occur outside the critical path  
**Decision**: `ALLOW`  
**Reason**: `"All changes are outside critical path"`

### Precedence
- `BLOCK` overrides `SOFT_BLOCK` and `ALLOW`
- `SOFT_BLOCK` overrides `ALLOW`
- All triggered reasons are included in the output

---

## Contract

The full contract is documented in:  
**[contracts/service-map-gate-v2.contract.md](../../contracts/service-map-gate-v2.contract.md)**

Key details:
- **Version**: v1
- **Input**: Service Map Diff artifact (schema-validated)
- **Output**: Gate result with decision, reasons, input hash, timestamp, and context
- **Determinism**: Same input → same output (guaranteed)

---

## Implementation

### File
[`src/gating/service-map-gate-v2.ts`](./service-map-gate-v2.ts)

### Main Function
```typescript
export function evaluateServiceMapGate(
  diff: ServiceMapDiff,
  context: ServiceMapGateContext = {}
): ServiceMapGateResult
```

### Example Usage (NOT ACTIVATED — FOR REFERENCE ONLY)
```typescript
import { evaluateServiceMapGate } from "./service-map-gate-v2";

// Load diff artifact (this would be done by integration code, NOT manual)
const diff = JSON.parse(readFileSync("artifacts/service-maps/abc123.diff.json", "utf-8"));

// Evaluate gate
const result = evaluateServiceMapGate(diff, { branch: "main" });

console.log(result.decision); // "ALLOW" | "SOFT_BLOCK" | "BLOCK"
console.log(result.reasons);  // ["Latency regression on critical path edge ..."]
```

**⚠️ THIS CODE IS NOT EXECUTED ANYWHERE. It is a skeleton for future activation.**

---

## Activation Checklist (NOT DONE — OUT OF SCOPE)

Before this gate can be activated, the following integration work is required:

### 1. CI Integration
- [ ] Wire gate into release workflow (e.g., `.github/workflows/release.yml`)
- [ ] Load Service Map Diff artifact from `artifacts/service-maps/{buildId}.diff.json`
- [ ] Pass branch/tag context correctly
- [ ] Write gate result to `artifacts/gates/service-map-v2/{buildId}.decision.json`

### 2. Aggregation Integration
- [ ] Aggregate gate decision with existing gates (canary, risk score)
- [ ] Define precedence (e.g., any BLOCK → overall BLOCK)
- [ ] Update release logic to honor Service Map Gate v2 decisions

### 3. Dashboard Integration (Optional)
- [ ] Display gate decision in canary dashboard
- [ ] Show reasons and diff details
- [ ] Provide drill-down to Service Map Diff artifact

### 4. Testing
- [ ] Unit tests for all gating rules
- [ ] Integration tests with real diff artifacts
- [ ] End-to-end tests in CI

### 5. Documentation
- [ ] Update README.md to mention Service Map Gate v2
- [ ] Update playbook with activation instructions
- [ ] Add runbook for handling BLOCK decisions

**NONE OF THESE STEPS ARE COMPLETE. The gate is a skeleton only.**

---

## Current State

| Component | Status |
|-----------|--------|
| Contract Definition | ✅ COMPLETE |
| TypeScript Implementation | ✅ COMPLETE |
| Unit Tests | ❌ NOT STARTED |
| CI Integration | ❌ NOT STARTED |
| Aggregation Logic | ❌ NOT STARTED |
| Dashboard Integration | ❌ NOT STARTED |
| Activation | ❌ NOT STARTED |

**Overall Status**: **SKELETON ONLY — NOT ACTIVATED**

---

## Guarantees

### What This Implementation Guarantees
- ✅ Pure function (no side effects)
- ✅ Deterministic (same input → same output)
- ✅ Isolated (no dependencies on other systems)
- ✅ Schema-compliant (matches contract exactly)
- ✅ Frozen rules (no configuration or heuristics)

### What This Implementation Does NOT Guarantee
- ❌ Execution (not wired into CI)
- ❌ Integration (not connected to release logic)
- ❌ Visibility (not shown in dashboards)
- ❌ Testing (no unit or integration tests yet)

---

## Related Files

- **Contract**: [`contracts/service-map-gate-v2.contract.md`](../../contracts/service-map-gate-v2.contract.md)
- **Implementation**: [`src/gating/service-map-gate-v2.ts`](./service-map-gate-v2.ts)
- **Service Map Diff Contract**: [`contracts/service-maps-diff.contract.md`](../../contracts/service-maps-diff.contract.md)
- **Service Map Contract**: [`contracts/service-maps.contract.md`](../../contracts/service-maps.contract.md)
- **Existing Release Gate**: [`src/gating/release-gate.ts`](./release-gate.ts)

---

## FAQ

### Q: Can I use this gate now?
**A**: No. It is not activated and not wired into any automated process. It exists as a skeleton for future activation.

### Q: Why is it not activated?
**A**: This work is scoped as **DESIGN + SKELETON ONLY**. Activation requires explicit integration work, testing, and approval.

### Q: How do I activate it?
**A**: Follow the **Activation Checklist** above. This is OUT OF SCOPE for the current phase.

### Q: Will this replace existing gates?
**A**: No. Service Map Gate v2 is designed to **complement** existing gates (canary, risk score), not replace them.

### Q: What if I want to change the rules?
**A**: Changing the gating rules is a **BREAKING CHANGE** and requires a new contract version (e.g., v2). The current rules are **frozen**.

### Q: Why are the rules frozen?
**A**: Determinism and reproducibility require stable semantics. Changing rules changes system meaning, which requires explicit versioning.

---

## Summary

**Service Map Gate v2 is ready to plug in, but harmless until explicitly activated.**

- It is a **pure function** with **frozen rules** and **deterministic behavior**.
- It is **completely isolated** from all other systems.
- It is **NOT executed** anywhere in the current codebase.
- Activation requires **explicit integration work** and is **OUT OF SCOPE** for this phase.

**Do NOT wire this gate into CI or release logic without explicit approval.**
