
# Canaries-with-teeth

## 30-minute setup

1. **Install:**
	```sh
	npm install canaries-with-teeth
	```
2. **Init:**
	```sh
	npx canaries init
	```
3. **Push:**
	```sh
	git push
	```

You’ll get:
- Working E2E canary
- Telemetry collection
- Deterministic risk scoring
- Release gating (ALLOW / SOFT_BLOCK / BLOCK)
- Visible dashboard (CI artifact + local HTML)

No config. No contracts. No tuning. No docs required.

---

**Production canaries that bite. Signals that gate releases.**

This repository documents a production-grade framework for **canaries, actionable telemetry, and risk-based release gating**.
It is not a library, not a tutorial, and not a product.
It is an explicit operating model for systems that must detect regressions early and **make real deployment decisions**.

## What this is
 - A **framework of contracts**, not magic code
 - A **playbook/runbook** built from real production work
 - A reference for designing systems that **protect themselves**
 - A way to turn telemetry into **deterministic, auditable decisions**

## What this is not
 - Not a canary *deployment* strategy (no traffic splitting dogma)
 - Not observability-for-observability’s-sake
 - Not ML-driven or fuzzy
 - Not vendor-locked
 - Not “best practices” without consequences

## Core idea
Canaries are **control mechanisms**, not signals for humans to eyeball.

This framework combines:
 - **Synthetic canaries** (E2E + performance-aware)
 - **Real user and function telemetry**
 - **Frozen, deterministic contracts** (UX, backend health, friction)
 - **Explicit risk scoring and release gates**

## What this is
- A **framework of contracts**, not magic code
- A **playbook/runbook** built from real production work
- A reference for designing systems that **protect themselves**
- A way to turn telemetry into **deterministic, auditable decisions**

## What this is not
- Not a canary *deployment* strategy (no traffic splitting dogma)
- Not observability-for-observability’s-sake
- Not ML-driven or fuzzy
- Not vendor-locked
- Not “best practices” without consequences

## Core idea
Canaries are **control mechanisms**, not signals for humans to eyeball.

This framework combines:
- **Synthetic canaries** (E2E + performance-aware)
- **Real user and function telemetry**
- **Frozen, deterministic contracts** (UX, backend health, friction)
- **Explicit risk scoring and release gates**

If a signal matters, it must be able to **block a release**.

## Design principles
- Determinism over heuristics for gating
- Contracts over dashboards
- Telemetry that never breaks user flows (silent-fail by design)
- Schemas are part of the system and must be tested
- Decisions > alerts

## What you’ll find here
- System vision and architectural decisions (with alternatives discarded)
- An end-to-end playbook: telemetry → signals → risk → decision
- Canary design as regression control, not deployment flavor
- A formal section for **non-technical consumption** (product/business)
- Clear separation of **core vs optional** components
- Failure modes, pivots, and reasons *not* to use this framework

## Who this is for
Senior engineers and architects who:
- Own production outcomes
- Need governance over releases
- Are tired of dashboards that don’t stop damage

If you’re looking for something to “install”, this repo is not for you.

---

> If your canaries don’t have teeth, they’re just birds.
