# North Star: Canaries with Teeth

## Mission

**The open-source framework that turns every deploy into a deterministic go/no-go decision — zero config, zero vendor lock-in, zero test-writing required.**

---

## The Problem Nobody Has Solved

| Tool | Zero-Config | Release Gate | No Vendor Lock | No Tests Required |
|------|:-----------:|:------------:|:--------------:|:-----------------:|
| AWS Synthetics | no | no | no (AWS-only) | no |
| Checkly | no | partial | no (SaaS) | no |
| Datadog Synthetic | no | no | no (SaaS) | no |
| Flagger/Argo | no | yes | partial (K8s) | no |
| **Canaries with Teeth** | **yes** | **yes** | **yes** | **yes** |

**Nobody combines all four.** That's the gap.

---

## Who Needs This

### Sofia — Solo Founder
- Runs a SaaS with 200 users, no QA team, no staging
- Deploys from `main` via Vercel/Railway
- **Pain:** Broke checkout last month, lost 3 customers before noticing
- **Needs:** Something that catches regressions without writing tests

### Marcus — Platform Engineer (500-person company)
- Manages CI/CD for 40 microservices
- Has Datadog, PagerDuty, custom dashboards
- **Pain:** Dashboards show problems AFTER deploy. Wants pre-deploy gates
- **Needs:** Deterministic gate that integrates into existing CI, auditable contracts

### Priya — Staff Engineer (Enterprise)
- Compliance requirements, audit trails, change management
- **Pain:** "How do we prove this release was safe to ship?"
- **Needs:** Frozen contracts with SHA256 hashes, version-controlled decision rules

### Tomas — Kiosk Owner with a WordPress Site
- Hired someone to build his site, doesn't code
- **Pain:** "My website is broken and I don't know why"
- **Needs:** A simple tool that tells him "your site works" or "your site is broken"

---

## What Makes This Divergent

### 1. Zero-Config Canary Generation
`npx canaries init` detects your framework, generates Playwright canaries, establishes baselines. **You never write a test.**

### 2. Deterministic Contract-Frozen Gating
Not alerts — **gates**. Decision formulas are SHA256-hashed, version-controlled, and produce the same result given the same inputs, forever. If a threshold is crossed, the release is **blocked**.

### 3. Service Map as a Gate
Builds a structural map of your app. On deploy, diffs it against the previous version. Missing routes, new unprotected endpoints, dependency drift → gate blocks.

### 4. Fully Local, No Backend, No Vendor
Dashboard is static HTML. All data stays in your repo. Works with any CI. No accounts, no tokens, no SaaS.

---

## Progressive Disclosure

| Level | Who | What They See | Config Required |
|-------|-----|---------------|-----------------|
| **0** | Everyone | `npx canaries init` → auto-canaries → go/no-go | None |
| **1** | Curious devs | Browser telemetry SDK → richer risk scoring | 1 script tag |
| **2** | Platform teams | Service map gates, custom thresholds, contract history | Config file |
| **3** | Enterprise | Custom contracts, audit trails, multi-service orchestration | Full API |

**Level 0 must work perfectly. Everything above is optional.**

---

## The "Aha Moment" (Under 90 Seconds)

```
$ npx canaries init
  Detected: Next.js app with 12 routes
  Generated: e2e/canary.e2e.spec.js
  Baseline: captured

$ git push
  Running canaries...
  /dashboard ............ OK (240ms, p95: 300ms)
  /api/users ............ OK (45ms, p95: 80ms)
  /checkout ............. FAIL (502, was 200)

  RELEASE BLOCKED
  Risk: 87/100
  Reason: /checkout returns 502 (was 200 in previous run)
```

---

## What This is NOT

1. **Not an APM** — doesn't replace Datadog/New Relic
2. **Not a testing framework** — doesn't replace Jest/Vitest
3. **Not a deployment tool** — doesn't replace Argo/Flagger
4. **Not ML-driven** — no anomaly detection, no "smart" thresholds
5. **Not a SaaS** — no accounts, no cloud, no vendor relationship
6. **Not passive** — dashboards are secondary; decisions are primary
7. **Not optional once enabled** — if it says block, the release is blocked

---

## Success Criteria

1. **90-second setup:** `npx canaries init` → first gate decision in under 90 seconds
2. **Zero-config works:** Next.js, Express, and static HTML all get meaningful canaries without config
3. **Gate is real:** A broken route actually blocks the CI workflow
4. **Dashboard tells a story:** Non-technical person sees green/red and understands
5. **Enterprise auditable:** Every gate decision traceable to a frozen contract with SHA256
6. **No vendor dependency:** Works offline, without internet, without accounts

---

> "If your deploy pipeline doesn't have teeth, it's just a suggestion."
