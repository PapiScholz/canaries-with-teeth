# Service Maps Contract v1

## Purpose
Expose the real architecture a build executed. Service Maps are deterministic snapshots of topology and performance inferred from build execution, aggregated passively across the test run.

Not a request-level trace. Not sampling-based. Not instrumentation-heavy.

## Data Model (STRICT)

```typescript
interface ServiceNode {
  id: string              // e.g. "frontend", "api", "fn:createOrder"
  type: "frontend" | "service" | "function"
}

interface ServiceEdge {
  from: string            // node id
  to: string              // node id
  latencyP95: number      // milliseconds
  errorRate: number       // 0.0–1.0
}

interface ServiceMap {
  buildId: string
  nodes: ServiceNode[]
  edges: ServiceEdge[]
}
```

## How the Map is Built

### Frontend (Inferred from Canary Execution)
- Always create a `frontend` node
- Observe network calls during the canary (from telemetry or browser devtools)
- Infer edges to detected services:
  - Edge: frontend → <service-name>
  - Aggregate latency (p95) and error rate per destination
  - Error rate = (error responses) / (total requests)

### Backend (Inferred from Function Health Metrics)
- Each tracked function becomes a ServiceNode (type: function)
- Extract `latencyMsP95` → `latencyP95`
- Extract error rate from function health data
- Topology: services call functions

### No Inferred Nodes Without Execution Evidence
- Only create nodes for services/functions that were actually exercised
- No speculative topology

## Aggregation Rules

### Per Build
- One Service Map per buildId
- Deterministic ordering (nodes and edges sorted by id)

### Latency (P95)
- Aggregate from all requests to that destination during the build run
- Unit: milliseconds

### Error Rate
- errorRate = (4xx + 5xx responses) / (total requests to that destination)
- If no errors: 0.0
- If all fail: 1.0

## Temporal Model

- Captured once per build
- Aggregated across entire canary/test run
- Single snapshot, not time-series

## Persistence

### Location
```
artifacts/service-maps/{buildId}.json
```

### Always Write
- Even if canary or gate fails
- Allows post-mortem analysis

### Format
```json
{
  "buildId": "abc123",
  "nodes": [ { "id": "frontend", "type": "frontend" }, ... ],
  "edges": [ { "from": "frontend", "to": "api", "latencyP95": 150, "errorRate": 0 }, ... ]
}
```

## Gating Impact

### For v1
- Service Maps are **explanatory only**
- No new gates introduced
- No changes to existing release decisions
- Zero impact on canary or risk gating

## Non-Goals

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
