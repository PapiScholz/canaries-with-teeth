# Service Maps v1 Implementation Guide

## Overview

Service Maps v1 is now fully integrated into canaries-with-teeth. Service Maps provide a **deterministic snapshot of the architecture actually exercised by a build**, inferred from network observations and metrics collected during canary execution.

## What's New

### Core Components

#### 1. **Service Maps Contract** (`contracts/service-maps.contract.md`)
- Defines the strict data model for Service Maps
- Non-negotiable specification for nodes, edges, and aggregation rules
- Includes JSON schema for validation

#### 2. **Service Maps Data Types** (`src/lib/service-maps/`)
- **types.ts**: Defines `ServiceNode`, `ServiceEdge`, `ServiceMap` interfaces
- **builder.ts**: Implements the Service Map building logic
- **index.ts**: Exports public API

#### 3. **Canary Integration**
- Modified `e2e/default-canary.e2e.spec.js` to capture network observations
- Playwright `page.on('response')` listener tracks all HTTP requests
- Network data written to `artifacts/gating/network-observations.json`

#### 4. **Canary Runner Updates** (`e2e/run-canaries.cjs`)
- New `collectNetworkObservations()` function loads captured network data
- New `buildServiceMap()` function constructs the map from network observations
- New `extractServiceName()` and `computeP95()` helpers for data processing
- Service Map persisted to `artifacts/service-maps/{buildId}.json`

#### 5. **Dashboard Enhancement** (`dashboard/`)
- Added `service-map-section` to HTML
- New `renderServiceMap()` function displays map as collapsible tree
- New `toggleNodeDetails()` function implements progressive disclosure
- CSS styling highlights high-latency edges and error nodes

## Data Flow

```
1. Canary Execution
   ├─ Page loads and makes network calls
   ├─ Playwright captures every response
   └─ Network observations saved to JSON

2. Canary Runner
   ├─ Loads network observations
   ├─ Infers service names from URLs
   ├─ Aggregates latency (p95) and error rates
   └─ Writes Service Map to artifacts/service-maps/{buildId}.json

3. Dashboard
   ├─ Loads report.json with embedded Service Map
   ├─ Renders collapsible tree view
   ├─ Highlights high-latency and error edges
   └─ Provides progressive disclosure of architecture details
```

## Key Properties

### Zero Configuration
- Works out of the box without any setup required
- Automatically captures network calls during canary execution
- No user configuration needed

### Deterministic
- Same inputs produce identical outputs
- Aggregated across entire build execution
- Nodes and edges sorted by ID for reproducibility

### Passive
- Inferred from execution evidence only
- No speculative topology
- No instrumentation overhead

### Explanatory Only (v1)
- Service Maps do not gate releases
- Canary and risk gating remain unchanged
- Maps provide visibility into actual architecture exercised

## Network Service Name Extraction

Service names are extracted from URLs using these rules (in order):

1. **Hostname-based**: Check for keywords like "api", "auth", "search", "payment"
2. **Path-based**: Extract first path segment (e.g., `/api/users` → "api")
3. **Fallback**: Ignore if no clear service name detected

Examples:
- `https://api.example.com/users` → "api"
- `https://example.com/auth/login` → "auth"
- `http://localhost:3001/orders/123` → "orders"
- `https://cdn.example.com/image.png` → ignored (file type)

## Data Model

### ServiceNode
```typescript
{
  id: string;              // "frontend", "api", "auth", etc
  type: "frontend" | "service" | "function"
}
```

### ServiceEdge
```typescript
{
  from: string;            // source node id
  to: string;              // destination node id
  latencyP95: number;      // 95th percentile latency in ms
  errorRate: number;       // 0.0–1.0 (4 decimals)
}
```

### ServiceMap
```typescript
{
  buildId: string;
  nodes: ServiceNode[];
  edges: ServiceEdge[];
}
```

## Persistence

All Service Maps are persisted, regardless of canary or gate outcome:

```
artifacts/service-maps/{buildId}.json
```

This enables:
- Post-mortem analysis of failed deployments
- Historical tracking of architecture changes
- Comparison across builds

## Dashboard Display

Service Maps render as collapsible trees with:

- **Node Types**: Shown with color-coded borders
  - Frontend: Green
  - Service: Blue
  - Function: Orange
  
- **Edge Details**: Show latency and error rates
  - High latency (>1000ms): Highlighted in yellow/orange
  - Errors (>0%): Highlighted in red with warning icon

- **Progressive Disclosure**: Expand nodes to see downstream dependencies

## Gating Impact

**For v1**:
- Service Maps are informational only
- No new gates introduced
- No changes to existing release decisions
- Zero impact on canary success/failure logic

Future versions may introduce Service Map-based gates, but this requires explicit contract changes and design review.

## Files Changed

### Created
- `contracts/service-maps.contract.md` - Contract specification
- `contracts/service-maps.contract.md.json` - JSON schema
- `src/lib/service-maps/types.ts` - TypeScript interfaces
- `src/lib/service-maps/builder.ts` - Service Map builder logic
- `src/lib/service-maps/index.ts` - Module exports
- `tests/integration-check.cjs` - Integration test suite

### Modified
- `e2e/default-canary.e2e.spec.js` - Added network observation capture
- `e2e/run-canaries.cjs` - Added Service Map building and persistence
- `dashboard/app.js` - Added Service Map rendering
- `dashboard/index.html` - Added Service Map display section

## Backward Compatibility

All changes are backward compatible:
- Existing canary behavior unchanged
- Existing release gating unchanged
- No breaking changes to contracts
- Service Maps are optional visualization

## Testing

Run the integration test to verify all components are properly connected:

```bash
node tests/integration-check.cjs
```

## Future Enhancements

Possible future directions (not included in v1):
- **Service-based gates**: Block releases if critical service has high error rate
- **Function health integration**: Include function health data in maps
- **Temporal graphs**: Track architecture evolution over time
- **Configuration**: Allow filtering/aggregation rules for complex systems
- **Tracing integration**: Optionally correlate with distributed traces (not required)

## Non-Goals

Explicitly excluded from Service Maps v1:
- ✗ Distributed tracing (no traces, spans, or request correlation)
- ✗ Sampling (100% of execution observed)
- ✗ User configuration (zero-config principle)
- ✗ Runtime observation (purely passive, post-build)
- ✗ ML/heuristics (deterministic only)
- ✗ OpenTelemetry integration (not required)

## References

- Contract: [contracts/service-maps.contract.md](../contracts/service-maps.contract.md)
- Builder: [src/lib/service-maps/](../src/lib/service-maps/)
- Canary integration: [e2e/default-canary.e2e.spec.js](../e2e/default-canary.e2e.spec.js)
- Runner integration: [e2e/run-canaries.cjs](../e2e/run-canaries.cjs)
- Dashboard: [dashboard/](../dashboard/)
