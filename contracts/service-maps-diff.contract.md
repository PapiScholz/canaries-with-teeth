# Service Maps Diff Contract v1

**STATUS: FACTS ONLY. NO INTERPRETATION OR DECISIONS.**

Service Maps Diff v1 is a first-class artifact that describes structural and numeric changes between a current Service Map and a baseline Service Map. It contains facts only: added nodes, removed nodes, added edges, removed edges, and numeric deltas on latency and error rates.

Service Maps Diff is deterministic, replayable, and designed to be the sole input to future Service-Map-based release gates (if v2 activates). It MUST NOT encode decisions, thresholds, severity, or recommendations.

## Purpose

- Expose architectural and performance change
- Enable evidence-based analysis of what changed
- Provide input for future gating decisions (v2)
- Support post-mortem analysis and debugging
- Maintain strict separation between observation and decision

## Data Model (STRICT)

```typescript
// FACTS: Changes in topology
interface AddedNode {
  id: string;
  type: "frontend" | "service" | "function";
}

interface RemovedNode {
  id: string;
  type: "frontend" | "service" | "function";
}

// FACTS: Changes in edges (new edges)
interface AddedEdge {
  from: string;
  to: string;
  latencyP95: number;    // milliseconds in current map
  errorRate: number;     // 0.0–1.0 in current map
}

// FACTS: Changes in edges (removed edges)
interface RemovedEdge {
  from: string;
  to: string;
  baselineLatencyP95: number;   // milliseconds in baseline map
  baselineErrorRate: number;    // 0.0–1.0 in baseline map
}

// FACTS: Changes in edges (numeric deltas)
interface ChangedEdge {
  from: string;
  to: string;
  baselineLatencyP95: number;
  currentLatencyP95: number;
  latencyChange: number;              // current - baseline (positive = slower)
  baselineErrorRate: number;
  currentErrorRate: number;
  errorRateChange: number;            // current - baseline (positive = more errors)
}

// DERIVED: Critical path information (non-normative, may be null)
// Explicitly marked as non-normative. No field implies a decision.
interface CriticalPathInfo {
  baselineLength: number;             // number of edges in baseline critical path
  currentLength: number;              // number of edges in current critical path
  lengthChange: number;               // current - baseline
}

// OBSERVATION DIFF: Facts about what changed
interface ServiceMapDiff {
  buildId: string;
  hash: string;                       // SHA256 hex digest for determinism validation
  baselineMapHash: string | null;     // Hash of baseline map, null if no baseline
  addedNodes: AddedNode[];            // Canonical sorted order
  removedNodes: RemovedNode[];        // Canonical sorted order
  addedEdges: AddedEdge[];            // Canonical sorted order
  removedEdges: RemovedEdge[];        // Canonical sorted order
  changedEdges: ChangedEdge[];        // Canonical sorted order
  criticalPath: CriticalPathInfo | null;  // Non-normative derived field
}
```

## How the Diff is Built

### Baseline Comparison
- Baseline Service Map: previous stable build, frozen in artifacts
- Current Service Map: newly built from current execution
- Baseline is loaded from `artifacts/service-maps/{baselineBuildId}.json`

### Structural Changes (Nodes)
- **Added nodes**: Present in current but not in baseline
- **Removed nodes**: Present in baseline but not in current
- No interpretation of significance; structural changes are facts

### Structural Changes (Edges)
- **Added edges**: New connections in current map
- **Removed edges**: Connections no longer in current map
- All facts, no severity judgment

### Numeric Changes (Edges)
- **Changed edges**: Edges present in both maps with different metrics
- **latencyChange** = currentLatencyP95 - baselineLatencyP95
  - Positive: latency increased (slower)
  - Negative: latency decreased (faster)
- **errorRateChange** = currentErrorRate - baselineErrorRate
  - Positive: error rate increased (worse)
  - Negative: error rate decreased (better)
- No "acceptable" threshold; all changes are facts

### Derived Fields (Non-Normative)
- **criticalPath**: Optional. If computed, shows longest path through graph.
  - May be null (not computed in v1)
  - Explicitly marked as non-normative
  - NO field in critical path implies a release decision
  - Existing in the contract does not enable gating

## Determinism Guarantee

Given identical current and baseline Service Maps, diffs MUST produce:
- Identical added/removed nodes (in canonical order)
- Identical added/removed/changed edges (in canonical order)
- Identical numeric deltas
- Identical hash digest

Determinism enables:
- Replay validation (same maps → same diff)
- Artifact integrity checking
- Future gating implementation (if v2 activates)

NO timestamps, UUIDs, or non-deterministic operations may affect the output.

## Aggregation Rules

### Per Build
- One diff per buildId
- Baseline buildId is immutable (recorded in `baselineMapHash`)
- If baseline changes, diff must be recomputed

### Canonical Ordering
- Nodes sorted by `id` (lexicographic)
- Edges sorted by `from`, then `to` (lexicographic)
- JSON serialized with no extra whitespace
- Same inputs → same hash

## Temporal Model

- Captured once per build
- Baseline is fixed (does not change after selection)
- Diff aggregates all changes between baseline and current
- Single snapshot, not time-series

## Persistence

### Location
```
artifacts/service-maps/{buildId}.diff.json
```

### Always Write
- Even if canary or gate fails
- Baseline may be absent on first run (null is valid)
- Allows post-mortem analysis
- Replay mechanism depends on artifacts

### Format
```json
{
  "buildId": "abc123",
  "hash": "sha256(canonical-json-ordering)",
  "baselineMapHash": "sha256(...baseline...)" or null,
  "addedNodes": [ { "id": "newservice", "type": "service" } ],
  "removedNodes": [],
  "addedEdges": [],
  "removedEdges": [],
  "changedEdges": [
    {
      "from": "frontend",
      "to": "api",
      "baselineLatencyP95": 150,
      "currentLatencyP95": 200,
      "latencyChange": 50,
      "baselineErrorRate": 0,
      "currentErrorRate": 0.01,
      "errorRateChange": 0.01
    }
  ],
  "criticalPath": null
}
```

## Gating Impact (v1)

### Strictly Prohibited In v1
- No release gates based on diffs
- No thresholds, severity classification, or recommendations
- No block or soft-block decisions
- No configuration, flags, or tunables
- Diffs are informational and observational only

### Immutable v1 Contract
- If this contract changes, it is a breaking change
- Any deviation is a bug
- Any use in gating before v2 activation is a violation

### For v2 (Future, Not v1)
- Service Maps Diff will be the ONLY input to Service-Map-based gates
- Gates will consume added/removed nodes, added/removed edges, and numeric deltas
- No logic will reanalyze raw network data
- Gates will be explicit, deterministic, and conservative
- Gates will NOT activate unless v2 is formally released

## Non-Goals (v1)

- Distributed tracing
- Request-level spans
- Temporal trends or forecasting
- Severity scoring or severity classification
- Recommendation generation
- Auto-remediation or auto-rollback
- Configuration or tuning
- ML or heuristics

## Operational Interpretation

Service Maps Diff answers:
- "What nodes were added or removed?"
- "What edges were added or removed?"
- "How did latency and error rates change?"

It does NOT answer:
- "Is this change acceptable?" (not for v1)
- "Should we block the release?" (not for v1)
- "How critical is this change?" (not for v1)
- "What should the team do?" (not for v1)

## Examples

### Scenario: Latency Increase on Critical Path
```json
{
  "buildId": "release-v2.1.0",
  "hash": "abc...",
  "baselineMapHash": "xyz...",
  "addedNodes": [],
  "removedNodes": [],
  "addedEdges": [],
  "removedEdges": [],
  "changedEdges": [
    {
      "from": "frontend",
      "to": "payment",
      "baselineLatencyP95": 200,
      "currentLatencyP95": 450,
      "latencyChange": 250,
      "baselineErrorRate": 0,
      "currentErrorRate": 0,
      "errorRateChange": 0
    }
  ],
  "criticalPath": null
}
```

**Interpretation**: Payment service latency increased 250ms. For v1, this is a fact. In v2, gates would decide whether this is acceptable.

### Scenario: New Service Introduced
```json
{
  "buildId": "release-v2.2.0",
  "hash": "def...",
  "baselineMapHash": "xyz...",
  "addedNodes": [
    { "id": "analytics", "type": "service" }
  ],
  "removedNodes": [],
  "addedEdges": [
    { "from": "frontend", "to": "analytics", "latencyP95": 50, "errorRate": 0 }
  ],
  "removedEdges": [],
  "changedEdges": [],
  "criticalPath": null
}
```

**Interpretation**: A new analytics service is now called from the frontend. For v1, this is a fact. In v2, gates would decide whether this affects risk.

### Scenario: No Baseline (First Run)
```json
{
  "buildId": "release-v1.0.0",
  "hash": "ghi...",
  "baselineMapHash": null,
  "addedNodes": [
    { "id": "frontend", "type": "frontend" },
    { "id": "api", "type": "service" }
  ],
  "removedNodes": [],
  "addedEdges": [
    { "from": "frontend", "to": "api", "latencyP95": 150, "errorRate": 0 }
  ],
  "removedEdges": [],
  "changedEdges": [],
  "criticalPath": null
}
```

**Interpretation**: No baseline exists. Everything in the current map is recorded as "added". This is an initial fingerprint.
