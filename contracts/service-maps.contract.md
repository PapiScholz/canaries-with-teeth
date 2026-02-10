# Service Maps Contract v1

**STATUS: OBSERVATIONAL SNAPSHOT ONLY**

Service Maps v1 describes the real architecture exercised by a build, inferred deterministically from execution evidence. They are informational and observational only. **No field in this contract implies or supports any release decision.**

## Purpose
Expose the real architecture a build executed. Service Maps are deterministic snapshots of topology and performance inferred from build execution, aggregated passively across the test run.

Not a request-level trace. Not sampling-based. Not instrumentation-heavy.
Never a basis for gating or critical decisions until v2 is explicitly released.

## Data Model (STRICT)

```typescript
// OBSERVED DATA: Derived deterministically from execution evidence only
export interface ServiceNode {
  id: string              // e.g. "frontend", "api", "fn:createOrder"
                          // Deterministic, canonical ID
  type: "frontend" | "service" | "function"
                          // Type inferred from evidence
}

// OBSERVED DATA: Aggregated metrics from all requests during build
export interface ServiceEdge {
  from: string            // node id (origin of calls)
  to: string              // node id (destination)
  latencyP95: number      // P95 latency in milliseconds (observed metric)
  errorRate: number       // Error rate 0.0–1.0 (observed metric)
}

// OBSERVATIONAL SNAPSHOT: No interpretation or severity judgment
export interface ServiceMap {
  buildId: string         // Immutable build identifier
  nodes: ServiceNode[]    // Canonical sorted order (deterministic)
  edges: ServiceEdge[]    // Canonical sorted order (deterministic)
  hash: string            // SHA256 hex digest for determinism validation
}
```

## Determinism Guarantee

Given identical network observations and function metrics, Service Maps MUST produce:
- Identical node IDs and ordering
- Identical edge ordering
- Identical hash digests

Determinism enables:
- Replay validation (same buildId → same map)
- Artifact integrity checking
- Baseline comparison (diff generation)
- Future gating logic (if/when v2 activates)

NO timestamps, UUIDs, environment variables, or non-deterministic operations may affect the output.

## How the Map is Built

### Frontend (Inferred from Canary Execution)
- Always create a `frontend` node
- Observe network calls during the canary (from telemetry or browser devtools)
- Infer edges to detected services:
  - Edge: frontend → <service-name>
  - Aggregate latency (p95) and error rate per destination
  - Error rate = (error responses) / (total requests)
- No suppression, filtering, or judgment of importance
- All evidence is preserved in the map

### Backend (Inferred from Function Health Metrics)
- Each tracked function becomes a ServiceNode (type: function)
- Extract `latencyMsP95` → `latencyP95`
- Extract error rate from function health data
- Topology: services call functions
- No inferred calls without execution evidence

### No Inferred Nodes Without Execution Evidence
- Only create nodes for services/functions that were actually observed
- No speculative topology
- No assumptions about infrastructure

## Aggregation Rules

### Per Build
- One Service Map per buildId
- Deterministic ordering (nodes and edges sorted by id)
- NO timestamps or temporal markers

### Latency (P95)
- Aggregate from all requests to that destination during the build run
- Unit: milliseconds
- No interpretation of "acceptable" latency in this contract
- Derived from observed metric; separate from any future severity judgment

### Error Rate
- errorRate = (4xx + 5xx responses) / (total requests to that destination)
- If no errors: 0.0
- If all fail: 1.0
- Derived from observed failures; separate from any future severity judgment

## Temporal Model

- Captured once per build
- Aggregated across entire canary/test run
- Single snapshot, not time-series
- All observations merged by destination

## Persistence

### Location
```
artifacts/service-maps/{buildId}.json
```

### Always Write
- Even if canary or gate fails
- Allows post-mortem analysis
- Never contingent on test result

### Format
```json
{
  "buildId": "abc123",
  "hash": "sha256(canonical-json-ordering)",
  "nodes": [
    { "id": "frontend", "type": "frontend" },
    { "id": "api", "type": "service" }
  ],
  "edges": [
    { "from": "frontend", "to": "api", "latencyP95": 150, "errorRate": 0 }
  ]
}
```

### Canonical Ordering
- Nodes sorted by `id` (lexicographic)
- Edges sorted by `from`, then `to` (lexicographic)
- JSON serialized with no extra whitespace
- Same input → same hash

## Gating Impact (v1)

### Strictly Prohibited In v1
- Service Maps are **observational only**
- No release gates based on Service Maps
- No thresholds, no severity classification
- No block or soft-block decisions
- No configuration, flags, or tunables
- No abstractions that could enable gating

### Immutable v1 Contract
- If this contract changes, it is a breaking change
- Any deviation is a bug
- Any use in gating before v2 activation is a violation

## Non-Goals (v1)

- Distributed tracing
- Request-level spans
- Sampling
- User configuration
- Runtime agents
- OpenTelemetry integration

## Operational Interpretation

Service Maps answer:
- "What did this build actually call?"
- "What was the latency to each dependency?"
- "Did any dependency have errors?"

They do not answer:
- "Which request failed?" (use detailed logs)
- "What caused the latency?" (use profiling)
- "Why did the error happen?" (use root cause analysis)
