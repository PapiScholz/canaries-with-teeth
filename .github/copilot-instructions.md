# Copilot Instructions for AI Agents

## Project Purpose & Structure

This repository is a **RUNNABLE PRODUCT** for deterministic release gating,
canary analysis, and contract-based telemetry.

It installs with:

npm install canaries-with-teeth  
npx canaries init  

…and MUST work end-to-end with zero configuration.

This repository ALSO contains reference contracts and architecture documentation,
but **executable behavior and CI integration are FIRST-CLASS and REQUIRED**.

This is a PRODUCT first.
Documentation and architecture exist to support execution — not replace it.

---

## ABSOLUTE AGENT REQUIREMENTS (NON-NEGOTIABLE)

Agents working in this repository MUST:

- Write **executable, runnable code**
- Modify and maintain **CI workflows**
- Ensure `npm install` + `npx canaries init` works end-to-end
- Prefer **working defaults** over documentation purity
- Preserve **zero-thinking adoption (MODE 0)** at all times

Agents MUST NOT:
- Turn this repo into a patterns-only reference
- Avoid touching CI “because it’s just documentation”
- Replace executable behavior with explanations

If something works but is ugly — KEEP IT.
If something is elegant but does not run — REMOVE IT.

---

## Adoption Modes (MANDATORY CONCEPT)

This product supports THREE modes:

### MODE 0 — ZERO-THINKING (DEFAULT)
- No configuration
- No contracts exposed
- No tuning
- Works immediately after init
- Black-box behavior is intentional

### MODE 1 — CUSTOMIZE
- Optional overrides
- Same deterministic logic
- Safer defaults remain intact

### MODE 2 — HARDCORE
- Full contracts
- Frozen semantics
- Explicit thresholds and runbooks

Agents MUST ensure:
- Repository starts in MODE 0
- MODE 1 and MODE 2 remain backward compatible
- MODE 0 is never weakened for flexibility

---

## Architecture & Major Components

- **Contracts-First (Internally):**
  - All signals, metrics, and schemas are versioned in `contracts/`
  - Any semantic change is a breaking change and must be versioned
  - Contracts MAY be hidden in MODE 0 but MUST remain authoritative

- **Synthetic Canaries:**
  - Universal E2E canary (Playwright)
  - Canary failures gate releases
  - Canary must work with ZERO configuration

- **Telemetry:**
  - Auto-captured, silent-fail, never breaks user flows
  - Local persistence is REQUIRED if no backend is configured

- **Risk Aggregation:**
  - Deterministic risk score (0–100)
  - No ML, no heuristics
  - Output in MODE 0 is ONLY:
    - Decision (ALLOW / SOFT_BLOCK / BLOCK)
    - High-level reasons

- **Release Gates:**
  - Explicit and deterministic
  - Canary fail or risk BLOCK → release BLOCKED
  - Implemented in CI, not theory

---

## Key Conventions & Patterns

- **Everything has a contract (even if hidden):**
  - Contracts define meaning
  - Defaults do not remove contracts — they encapsulate them

- **Executable > Documented:**
  - If code and docs disagree, code wins
  - Docs are allowed to lag; execution is not

- **No ML, heuristics, or vendor lock-in:**
  - All logic must be explainable and reproducible
  - No fuzzy scoring, no auto-magic rollback

- **Silent-Fail Telemetry:**
  - Instrumentation must NEVER break user flows
  - Failure to emit data is acceptable; crashing is not

---

## Developer & Agent Workflows

- **Schema / Contract changes:**
  - Require explicit versioning
  - Changing a contract changes system meaning

- **Canary changes:**
  - Must remain safe-by-default
  - Must not require configuration to run

- **Release gating logic:**
  - See `src/gating/`
  - Gates must be explicit, boring, and conservative

- **Telemetry changes:**
  - Must preserve silent-fail behavior
  - Must remain compatible with existing aggregators

---

## Key Files & Directories

- `README.md` — Zero-thinking setup and visible value
- `.github/workflows/` — CI that actually gates releases
- `contracts/` — Versioned system meaning
- `src/gating/` — Deterministic release gates
- `e2e/` — Universal canary specs
- `docs/architecture/` — Deep theory (NOT onboarding)
- `docs/contracts/` — Contract rationale
- `playbook/` — Advanced usage and postmortems

---

## Example Patterns

- **Release gating:**
  - Canary fails → BLOCK
  - Risk decision = BLOCK → BLOCK
  - Risk decision = SOFT_BLOCK → soft-fail depending on context

- **Telemetry contract:**
  - Schema-validated
  - Versioned
  - Never breaks the app

---

## What NOT To Do

- Do NOT add ML-based, fuzzy, or heuristic logic
- Do NOT introduce vendor-specific abstractions
- Do NOT turn executable systems into documentation-only examples
- Do NOT weaken MODE 0 to satisfy advanced use cases

---

If you are unsure whether to choose:
- correctness vs usability
- purity vs adoption
- theory vs execution

Choose **execution and visible value**.

This repository exists to **block bad releases**, not to win architecture debates.