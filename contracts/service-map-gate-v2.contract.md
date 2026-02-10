# Service Map Gate v2 Contract

## Version
**v1** (Initial Design - NOT ACTIVATED)

## Purpose
Provide a **deterministic release gate** based on Service Map structural and latency changes.
This gate evaluates service dependency drift, critical path expansion, and latency regressions to produce a binary release decision.

This gate is **ML-free**, **configuration-free**, and **heuristic-free**. It consumes ONLY the Service Map Diff artifact and makes a deterministic decision with explicit reasoning.

**STATUS: SKELETON ONLY — NOT WIRED INTO CI OR RELEASE LOGIC**

---

## Input Contract

### REQUIRED Input
- **Service Map Diff Artifact**: `artifacts/service-maps/{buildId}.diff.json`
  - Schema defined in `service-maps-diff.contract.md`
  - Must be deterministic, hashed, and validated
  - Contains structural and latency deltas between current and baseline

### REQUIRED Context
- **Branch or Tag Information**: passed explicitly as context
  - Used to determine protected branch escalation
  - Example: `{ branch: 'main' }` or `{ tag: 'v1.2.3' }`

### NO OTHER INPUTS
- Does NOT consume telemetry
- Does NOT consume canary results
- Does NOT consume risk scores
- Does NOT consume service maps directly (only the diff)

---

## Deterministic Gating Rules

The gate applies the following rules in order. If multiple rules trigger, the **most severe decision wins**.

### RULE 1 — Dependency Drift (HARD BLOCK)
**Condition**: Any newly added edge appears on the critical path  
**Decision**: `BLOCK`  
**Reason**: `"New dependency introduced on critical path"`

**Rationale**: Adding new dependencies to the critical path increases system complexity and risk. All new critical path edges must be explicitly reviewed and baselined before release.

---

### RULE 2 — Critical Path Expansion (HARD BLOCK)
**Condition**: Critical path length increased compared to baseline  
**Decision**: `BLOCK`  
**Reason**: `"Critical path length increased from {baseline} to {current}"`

**Rationale**: Critical path expansion indicates architectural degradation. Longer critical paths increase latency, failure domains, and debugging complexity.

---

### RULE 3 — Latency Regression on Critical Path (SOFT_BLOCK → HARD BLOCK)
**Condition**: Any edge on the critical path has a latency regression where:
- `current_p95 >= 2.0 * baseline_p95`

**Decision**:
- `SOFT_BLOCK` for non-protected branches  
- `BLOCK` for protected branches (`main` or tagged releases)

**Reason**: `"Latency regression on critical path edge {edgeId}: {current}ms vs {baseline}ms"`

**Rationale**: 2x latency regressions on the critical path directly degrade user experience. Soft-blocking allows investigation on feature branches, while hard-blocking protects production releases.

---

### RULE 4 — Non-Critical Changes (ALLOW)
**Condition**: Changes occur outside the critical path  
**Decision**: `ALLOW`  
**Reason**: `"All changes are outside critical path"`

**Rationale**: Latency or structural changes outside the critical path do not directly impact user-facing flows and should not block releases.

---

### Precedence
If multiple rules apply:
1. `BLOCK` overrides `SOFT_BLOCK` and `ALLOW`
2. `SOFT_BLOCK` overrides `ALLOW`
3. Reasons array includes ALL triggered rules

---

## Output Contract

### Schema
```json
{
  "version": "v1",
  "gate": "service-map-v2",
  "decision": "ALLOW | SOFT_BLOCK | BLOCK",
  "reasons": ["reason1", "reason2", ...],
  "input_hash": "sha256:{hash}",
  "evaluated_at": "ISO8601 timestamp",
  "context": {
    "branch": "string (optional)",
    "tag": "string (optional)"
  }
}
```

### Fields

#### `version` (required, string)
- Contract version identifier
- Current: `"v1"`
- Semantic changes require version bump

#### `gate` (required, string)
- Gate identifier
- Fixed value: `"service-map-v2"`
- Distinguishes this gate from v1 or other gates

#### `decision` (required, enum)
- `"ALLOW"`: No blocking conditions detected
- `"SOFT_BLOCK"`: Warning — release discouraged but not blocked
- `"BLOCK"`: Hard block — release MUST NOT proceed

#### `reasons` (required, array of strings)
- Human-readable explanations for the decision
- MUST include at least one reason if decision is not `ALLOW`
- MAY include multiple reasons if multiple rules triggered
- Examples:
  - `"New dependency introduced on critical path"`
  - `"Critical path length increased from 3 to 5"`
  - `"Latency regression on critical path edge user-service->auth-service: 450ms vs 200ms"`

#### `input_hash` (required, string)
- SHA-256 hash of the diff artifact consumed
- Format: `"sha256:{hex}"`
- Ensures reproducibility and auditability

#### `evaluated_at` (required, string)
- ISO 8601 timestamp of gate evaluation
- Example: `"2026-02-10T14:32:00Z"`

#### `context` (required, object)
- Contextual metadata passed to the gate
- Contains branch or tag information
- Example: `{ "branch": "main" }` or `{ "tag": "v1.2.3" }`

---

## Output Location
**NOT DEFINED YET** — This gate is not activated.

When activated, output will be written to:
- `artifacts/gates/service-map-v2/{buildId}.decision.json`

---

## Determinism Guarantee

Given the same:
- Service Map Diff artifact (same hash)
- Context (same branch/tag)

The gate MUST produce:
- Identical decision
- Identical reasons (same order)
- Identical output hash

No randomness. No timestamps affecting logic. No external dependencies.

---

## Implementation Requirements

### MUST
- Pure function: `diff + context → decision`
- No filesystem access
- No logging side effects
- No imports from canaries, builders, dashboards, or telemetry
- No configuration or thresholds (all rules are frozen)
- No heuristics or ML

### MUST NOT
- Touch existing gating logic
- Modify service maps, diffs, or builders
- Introduce tuning knobs or flags
- Execute automatically (skeleton only)

---

## Activation Status
**NOT ACTIVATED**

This gate exists as a skeleton and contract definition only. It is:
- NOT wired into CI
- NOT called by release logic
- NOT exposed in dashboards
- NOT included in aggregated risk decisions

Activation requires explicit integration work and is OUT OF SCOPE for this phase.

---

## Frozen Semantics
This contract defines the **meaning** of Service Map Gate v2.

Any change to:
- Gating rules
- Decision thresholds (e.g., 2.0x latency multiplier)
- Input schema expectations
- Output schema

...is a **BREAKING CHANGE** and requires a new contract version.

---

## Example Outputs

### Example 1: ALLOW
```json
{
  "version": "v1",
  "gate": "service-map-v2",
  "decision": "ALLOW",
  "reasons": ["All changes are outside critical path"],
  "input_hash": "sha256:abc123...",
  "evaluated_at": "2026-02-10T14:32:00Z",
  "context": { "branch": "feature/new-widget" }
}
```

### Example 2: SOFT_BLOCK
```json
{
  "version": "v1",
  "gate": "service-map-v2",
  "decision": "SOFT_BLOCK",
  "reasons": ["Latency regression on critical path edge user-service->auth-service: 450ms vs 200ms"],
  "input_hash": "sha256:def456...",
  "evaluated_at": "2026-02-10T14:35:00Z",
  "context": { "branch": "feature/api-refactor" }
}
```

### Example 3: BLOCK (Multiple Rules)
```json
{
  "version": "v1",
  "gate": "service-map-v2",
  "decision": "BLOCK",
  "reasons": [
    "New dependency introduced on critical path",
    "Critical path length increased from 3 to 5",
    "Latency regression on critical path edge api-gateway->database: 800ms vs 300ms"
  ],
  "input_hash": "sha256:ghi789...",
  "evaluated_at": "2026-02-10T14:40:00Z",
  "context": { "tag": "v1.2.3" }
}
```

---

## Non-Goals
This gate does NOT:
- Replace canary-based gating
- Replace risk-score-based gating
- Provide auto-remediation
- Suggest fixes or rollback strategies
- Analyze user-facing metrics (use UDI for that)
- Provide ML-based predictions

---

## Related Contracts
- `service-maps.contract.md` — Service Map structure
- `service-maps-diff.contract.md` — Diff artifact schema
- `risk-score.contract.md` — Aggregated risk signal (separate from this gate)

---

## Changelog

### v1 (2026-02-10)
- Initial contract definition
- Four deterministic gating rules
- Output schema specification
- SKELETON ONLY — NOT ACTIVATED
