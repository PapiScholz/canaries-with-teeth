# Copilot Instructions for AI Agents

## Project Overview
This repository defines a **framework for production canaries, actionable telemetry, and risk-based release gating**. It is not a library or product, but an explicit operating model for systems that must detect regressions early and make deterministic deployment decisions.

## Architecture & Data Flow
- **Synthetic Canaries (E2E + perf):**
  - Run in CI and on schedule
  - Detect fast, obvious regressions (critical path, p95 perf, hard caps)
  - Failure = immediate release block
- **In-app Telemetry:**
  - Tracks UX degradation, function health, and user friction
  - Uses deterministic, versioned contracts (not raw metrics)
  - Silent-fail: telemetry must never break user flows
- **Daily Aggregation:**
  - Aggregates raw events into daily facts
  - Enforces schema consistency and idempotency
- **Risk Forecast:**
  - Synthesizes normalized signals into a deterministic risk score (0–100)
  - Designed for threshold-based gating, not alerts
- **Release Gates:**
  - Enforce consequences (block on canary fail, risk score, or drift)

## Key Principles
- **Determinism over heuristics:** All gating is explicit and auditable
- **Contracts over dashboards:** Metrics are frozen, versioned, and must be tested
- **Decisions > alerts:** Signals must drive automated release decisions
- **Noise reduction before insight:** Aggregation and normalization are required before gating
- **No vendor lock-in:** Storage, runners, and CI are interchangeable

## Developer Workflows
- **Build/Test:** No build/test scripts are present; this repo is a reference model, not an executable system
- **Schema changes:** Require versioning and explicit intent; changing a contract changes system meaning
- **Telemetry:** Must be silent-fail—never break user flows for instrumentation

## Project Conventions
- **Everything is a contract:** If a signal or metric is not versioned and auditable, it does not belong
- **No ML or adaptive thresholds:** All risk scoring is deterministic and explainable
- **No auto-rollback or vendor-specific logic:** These are optional, not core
- **Failure modes and trade-offs are documented** in the docs/

## Key Files
- **README.md:** High-level vision, principles, and intended audience
- **docs/00-vision.md:** Why this framework exists, core ideas, and intended outcomes
- **docs/01-architecture.md:** System architecture, data flow, and design invariants

## Example Patterns
- **Release gating:**
  - If canary fails, block release
  - If risk score > threshold, block release
- **Telemetry contract:**
  - All metrics must be versioned and schema-validated

## What Not To Do
- Do not add ML-based or fuzzy logic for gating
- Do not introduce vendor-specific abstractions
- Do not break user flows for telemetry

---
For more, see the docs/ directory and the top-level README.md.
