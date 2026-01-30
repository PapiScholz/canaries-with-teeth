

# Copilot Instructions for AI Agents

## Project Purpose & Structure
This repository is a **reference architecture** for deterministic release gating, canary analysis, and contract-based telemetry. It is not a runnable product—focus is on patterns, not execution.

## Architecture Overview
- **Contracts-First:** All signals, metrics, and schemas are versioned and defined in `contracts/`. Any change is a breaking change and must be versioned/documented.
- **Synthetic Canaries:** E2E and performance canaries are modeled for CI and scheduled runs. Canary failures block release (see `src/gating/`).
- **Telemetry:** All telemetry is contract-based, versioned, and schema-validated. Telemetry must never break user flows (silent-fail pattern).
- **Risk Aggregation:** Daily aggregation is schema-enforced and idempotent. Risk score is deterministic (0–100), never ML-based.
- **Release Gates:** Gating logic is explicit and deterministic—block on canary fail or risk score threshold. See `src/gating/release-gate.ts` and `src/gating/run-release-gate.ts`.

## Key Conventions & Patterns
- **Everything is a contract:**
  - All signals, metrics, and schemas are versioned in `contracts/` (e.g., `contracts/risk-score.contract.md`).
  - Contracts are documentation-first and must be updated with every schema or logic change.
- **No build/test scripts:**
  - This repo is not executable; it is a reference for architecture and contracts, not a runnable product.
- **No ML, heuristics, or vendor lock-in:**
  - All logic is deterministic and explainable. No auto-rollback or vendor-specific abstractions.
- **Documentation-first:**
  - All design decisions, trade-offs, and failure modes are documented in `docs/`.

## Developer Workflows
- **Schema/contract changes:**
  - Require explicit versioning. Changing a contract changes system meaning and must be reflected in `contracts/`.
- **Release gating logic:**
  - See `src/gating/release-gate.ts` and `src/gating/run-release-gate.ts` for explicit gating patterns.
- **Telemetry:**
  - Must be silent-fail; never break user flows for instrumentation.

## Key Files & Directories
- `README.md`: High-level vision and principles
- `docs/00-vision.md`: Core ideas and intended outcomes
- `docs/01-architecture.md`: System architecture and data flow
- `contracts/`: All versioned contracts for telemetry, risk, and gating
- `src/gating/`: Example gating logic and patterns
- `e2e/`: Example canary specs and scripts

## Example Patterns
- **Release gating:**
  - Block release if canary fails or risk score exceeds threshold (see `src/gating/`).
- **Telemetry contract:**
  - All metrics must be versioned and schema-validated (see `contracts/`).

## What Not To Do
- Do not add ML-based, fuzzy, or heuristic logic for gating
- Do not introduce vendor-specific abstractions
- Do not break user flows for telemetry

---
For more, see the `docs/` directory and the top-level `README.md`.
