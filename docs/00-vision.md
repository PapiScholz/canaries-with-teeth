# Vision

## Why this framework exists

Production systems rarely fail loudly.
They degrade.

Latency creeps up without errors.
UX friction increases without alerts.
Functions "work" but drift from expected behavior.
Releases pass CI and still damage the product.

**If a regression cannot stop a release, it is not a signal — it is noise.**

This framework closes that gap.

---

## The problem nobody has solved

Most observability stacks answer:
> "What happened?"

Most testing frameworks answer:
> "Does this unit work in isolation?"

Most deployment tools answer:
> "How do we split traffic safely?"

**Nobody answers:**
> **"Should this release be allowed — yes or no — with zero configuration?"**

| Tool | Zero-Config | Release Gate | No Vendor Lock | No Tests Required |
|------|:-----------:|:------------:|:--------------:|:-----------------:|
| AWS Synthetics | no | no | no (AWS-only) | no |
| Checkly | no | partial | no (SaaS) | no |
| Datadog Synthetic | no | no | no (SaaS) | no |
| Flagger/Argo | no | yes | partial (K8s) | no |
| **Canaries with Teeth** | **yes** | **yes** | **yes** | **yes** |

That's the gap. This framework fills it.

---

## Mission

**The open-source framework that turns every deploy into a deterministic go/no-go decision — zero config, zero vendor lock-in, zero test-writing required.**

---

## Core idea

A "canary" here is not traffic splitting by percentage.
It is a **control mechanism** composed of:

- **Synthetic canaries**
  Auto-generated E2E flows that validate correctness *and* detect performance regression. You never write a test — the system generates them by detecting your framework and crawling your routes.

- **Service map diffing**
  A structural map of your application (routes, endpoints, dependencies). On deploy, the system diffs the new map against the previous one. Missing routes, new unprotected endpoints, dependency drift → gate blocks.

- **Risk synthesis**
  Deterministic aggregation of all signals into a risk score. The decision formula is SHA256-hashed, version-controlled, and frozen. Same inputs → same result, forever.

- **Browser telemetry** (optional)
  Real user signals: JS errors, Web Vitals (LCP, INP, CLS), friction events. Silent-fail — telemetry must never break user flows.

Signals are only valid if they can:
1. Be compared over time
2. Be interpreted without humans
3. Block a release when thresholds are crossed

---

## What makes this different

- **Zero-config canary generation**
  `npx canaries init` detects your framework, generates Playwright canaries, establishes baselines. No test-writing required.

- **Deterministic contract-frozen gating**
  Not alerts — **gates**. Decision formulas are SHA256-hashed, version-controlled, and produce the same result given the same inputs, forever. If a threshold is crossed, the release is **blocked**. Not warned. Blocked.

- **Service map as a gate**
  Catches architectural regressions that no unit test would find. A removed route, a new unprotected endpoint, a drifted dependency → automatic block.

- **Fully local, no backend, no vendor**
  Dashboard is static HTML. All data stays in your repo. Works with any CI. No accounts, no tokens, no SaaS dependency.

- **Silent-fail instrumentation**
  Telemetry must never break user flows. Ever.

---

## Progressive disclosure

The framework serves both the kiosk owner and the staff engineer:

| Level | Who | What They See | Config Required |
|-------|-----|---------------|-----------------|
| **0** | Everyone | `npx canaries init` → auto-canaries → go/no-go | None |
| **1** | Curious devs | Browser telemetry SDK → richer risk scoring | 1 script tag |
| **2** | Platform teams | Service map gates, custom thresholds, contract history | Config file |
| **3** | Enterprise | Custom contracts, audit trails, multi-service orchestration | Full API |

**Level 0 must work perfectly. Everything above is optional.**

---

## What this is NOT

1. **Not an APM** — doesn't replace Datadog/New Relic
2. **Not a testing framework** — doesn't replace Jest/Vitest
3. **Not a deployment tool** — doesn't replace Argo/Flagger
4. **Not ML-driven** — no anomaly detection, no "smart" thresholds
5. **Not a SaaS** — no accounts, no cloud, no vendor relationship
6. **Not passive** — dashboards are secondary; decisions are primary
7. **Not optional once enabled** — if it says block, the release is blocked

---

## Success criteria

This vision is achieved when:

1. **90-second setup:** `npx canaries init` → first gate decision in under 90 seconds
2. **Zero-config works:** Next.js, Express, and static HTML all get meaningful canaries without configuration
3. **Gate is real:** A broken route actually blocks the CI workflow
4. **Dashboard tells a story:** A non-technical person sees green/red and understands
5. **Enterprise auditable:** Every gate decision traceable to a frozen contract with SHA256
6. **No vendor dependency:** Works offline, without internet, without accounts

---

## Intended outcome

A framework that another engineer can audit and say:

- The contracts are clear
- The signals are actionable
- The gates are justified
- The trade-offs are explicit
- The setup took 90 seconds

---

> "If your deploy pipeline doesn't have teeth, it's just a suggestion."
