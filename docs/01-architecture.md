# Architecture

## High-level flow
Users / CI
│
├─► Synthetic Canaries (E2E + perf)
│ └─► Pass / Fail (hard gate)
│
└─► In-app Telemetry (events + metrics)
└─► Daily Aggregation
└─► Risk Forecast
└─► Release Gates / Admin View
└─► Allow or Block

Everything exists to answer **one question**:  
**Is this release safe to ship right now?**

---

## Core components

### 1. Synthetic canaries (outer guard)
**Purpose:** detect fast, obvious regressions.

- E2E flows for critical paths
- Performance-aware: p95 baseline + hard caps
- Runs in CI and on schedule
- Failure = immediate block

**Why:** cheapest signal, fastest feedback.  
**Discarded alternative:** traffic-split canaries → too slow, too indirect.

---

### 2. In-app telemetry (inner guard)
**Purpose:** detect silent degradation.

Tracks:
- UX degradation (UDI)
- Function health (latency, cold start, drift)
- User friction (budget-based)

Design rules:
- Deterministic
- Versioned contracts
- Silent-fail persistence

**Why:** real user impact beats synthetic-only confidence.  
**Discarded alternative:** raw metrics + dashboards → no decision power.

---

### 3. Daily aggregation
**Purpose:** normalize noise and enable comparison.

- Aggregates raw events into daily facts
- Enforces schema consistency
- Idempotent by date

**Why:** gating on raw events is unstable.  
**Discarded alternative:** rolling windows everywhere → hard to audit.

---

### 4. Risk forecast
**Purpose:** synthesis and gating.

- Deterministic risk score (0–100)
- Uses normalized signals + trends
- Designed for thresholds, not alerts

**Why:** humans shouldn’t arbitrate every release.  
**Discarded alternative:** ML scoring → opaque, non-auditable.

---

### 5. Release gates
**Purpose:** enforce consequences.

Examples:
- Canary fail → block
- Risk score > threshold → block
- Drift critical → block

**Why:** signals without gates are decoration.

---

## Architectural invariants

- **Contracts > code**  
- **Determinism > cleverness**  
- **Decisions > dashboards**  
- **Noise reduction before insight**

If a component violates one of these, it does not belong in the system.

---

## What’s intentionally missing

- No auto-rollback logic  
- No adaptive ML thresholds  
- No vendor-specific abstractions  

Those are optional layers, not core.

---

> This architecture is boring by design.  
> Boring systems are predictable. Predictable systems are controllable.
