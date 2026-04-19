# Development Roadmap

> From current state to production-ready north star.
> Each step has a checkbox. AI agents: see [AGENTS.md](../AGENTS.md) for check-off instructions.

---

## Phase 0 — Foundation (What exists but needs fixing)

| # | Step | Status | Description |
|---|------|--------|-------------|
| 0.1 | [ ] | Pending | **Fix TypeScript build pipeline** — `run-release-gate.ts` is referenced in CI but no `tsconfig.json` or build step exists. Add TypeScript compilation to the workflow. |
| 0.2 | [ ] | Pending | **Wire `contract-validation.test.js`** — Referenced in `release-gate.yml` but implementation is unclear. Either implement properly or remove from workflow. |
| 0.3 | [ ] | Pending | **Activate `service-map-gate-v2.ts`** — 4 frozen gating rules exist as skeleton. Import into `release-gate.ts` and wire into the decision pipeline. |
| 0.4 | [ ] | Pending | **Standardize file extensions** — Mix of `.cjs`, `.ts`, `.js`. Decide on TypeScript-first with CJS output for CLI compatibility. |
| 0.5 | [ ] | Pending | **Add `package.json` metadata for npm publishing** — `name`, `version`, `bin`, `main`, `files`, `engines`, `keywords`, `repository`. |

---

## Phase 1 — Core CLI (The 90-second promise)

| # | Step | Status | Description |
|---|------|--------|-------------|
| 1.1 | [ ] | Pending | **`npx canaries init` — framework detection** — Currently detects repo type. Expand to detect Next.js, Express, static HTML, Vite, Remix, Astro. Return structured metadata (framework, routes, entry points). |
| 1.2 | [ ] | Pending | **`npx canaries init` — auto-generate Playwright canaries** — From detected routes, generate `e2e/canary.e2e.spec.js` with one test per route (status code + response time baseline). |
| 1.3 | [ ] | Pending | **`npx canaries init` — baseline capture** — Run generated canaries once, store results as `.canaries/baseline.json` (status codes, response times, service map snapshot). |
| 1.4 | [ ] | Pending | **`npx canaries init` — CI workflow generation** — Auto-generate `.github/workflows/canaries.yml` (or GitLab/Jenkins equivalent) with release gate step. |
| 1.5 | [ ] | Pending | **`npx canaries run`** — Execute canaries, compare against baseline, output results to stdout and `canary-status.env`. |
| 1.6 | [ ] | Pending | **`npx canaries dashboard`** — Generate static HTML dashboard in `dashboard/` from latest run results. |
| 1.7 | [ ] | Pending | **CLI entry point via `bin` field** — Wire `package.json` `bin` so `npx canaries` resolves correctly. |

---

## Phase 2 — Deterministic Gating (The teeth)

| # | Step | Status | Description |
|---|------|--------|-------------|
| 2.1 | [ ] | Pending | **Risk score engine — pluggable signals** — Refactor hardcoded heuristic (+40 JS error, +20 long tasks) into a pluggable signal system. Each signal: `{ name, weight, value, source }`. |
| 2.2 | [ ] | Pending | **Service map gate activation** — Import `service-map-gate-v2.ts` rules into release gate. Rules: dependency drift, critical path removal, latency regression, non-critical fallback. |
| 2.3 | [ ] | Pending | **Contract system — frozen decision rules** — Implement `contracts/` directory with JSON schema. Each contract: `{ version, rules, sha256, created_at }`. Decision formula is SHA256-hashed and version-controlled. |
| 2.4 | [ ] | Pending | **Contract validation** — On every gate run, verify contract SHA256 matches. If tampered, gate BLOCKS unconditionally. |
| 2.5 | [ ] | Pending | **Gate decision output format** — Standardized JSON: `{ decision, risk_score, signals[], contract_sha256, timestamp, artifacts_path }`. |
| 2.6 | [ ] | Pending | **Artifact generation** — Every gate run produces `artifacts/gating/` with: decision JSON, service map diff, risk breakdown, contract used. |

---

## Phase 3 — Service Map & Regression Detection

| # | Step | Status | Description |
|---|------|--------|-------------|
| 3.1 | [ ] | Pending | **Service map builder — route discovery** — Expand beyond network observation. Parse framework config (Next.js `app/`, Express `router.get()`, static HTML `<a>` tags) to build complete route map. |
| 3.2 | [ ] | Pending | **Service map diffing** — Compare current map against baseline. Detect: removed routes, new routes, changed response codes, new unprotected endpoints. |
| 3.3 | [ ] | Pending | **Response time regression detection** — Current: 1.5x multiplier + 500ms delta. Add P95 tracking, configurable thresholds, trend detection over last N runs. |
| 3.4 | [ ] | Pending | **Unprotected endpoint detection** — New routes without authentication middleware → flag in risk score. Configurable: which routes require auth. |
| 3.5 | [ ] | Pending | **Structural drift alerting** — When service map structure changes significantly (>30% routes changed), add signal to risk score. |

---

## Phase 4 — Browser Telemetry Integration

| # | Step | Status | Description |
|---|------|--------|-------------|
| 4.1 | [ ] | Pending | **Telemetry SDK — silent-fail hardening** — Audit `src/client/index.ts`. Ensure: never throws, never blocks main thread, graceful degradation if IndexedDB unavailable. |
| 4.2 | [ ] | Pending | **Telemetry → risk score pipeline** — Connect browser telemetry signals (JS errors, LCP, INP, CLS, longtasks) to the pluggable risk score engine from 2.1. |
| 4.3 | [ ] | Pending | **Telemetry data export** — `npx canaries telemetry export` → JSON file with all collected browser signals for the current baseline period. |
| 4.4 | [ ] | Pending | **Web Vitals thresholds** — Default thresholds based on Google's "good"/"needs improvement"/"poor" ranges. Configurable via `.canaries/config.json`. |

---

## Phase 5 — Dashboard & Reporting

| # | Step | Status | Description |
|---|------|--------|-------------|
| 5.1 | [ ] | Pending | **Dashboard redesign** — Pure static HTML. Sections: gate decision (GO/NO-GO), risk score breakdown, service map diff, canary results, timeline of last N runs. |
| 5.2 | [ ] | Pending | **Dashboard — traffic light UX** — Non-technical users see: green (all clear), yellow (soft block), red (blocked). Click to expand details. |
| 5.3 | [ ] | Pending | **Dashboard — service map visualization** — Visual diff of routes: added (green), removed (red), changed (yellow). |
| 5.4 | [ ] | Pending | **Dashboard — risk score breakdown** — Show which signals contributed to the score. Bar chart or weighted list. |
| 5.5 | [ ] | Pending | **Dashboard — contract history** — Show last N gate decisions with contract SHA256, inputs, outputs. |

---

## Phase 6 — Configuration & Progressive Disclosure

| # | Step | Status | Description |
|---|------|--------|-------------|
| 6.1 | [ ] | Pending | **`.canaries/config.json` schema** — Define configuration schema: thresholds, framework overrides, excluded routes, auth-required routes, telemetry toggle. |
| 6.2 | [ ] | Pending | **Level 0 works without config** — Validate that `npx canaries init` → `npx canaries run` → gate decision works with ZERO configuration files. |
| 6.3 | [ ] | Pending | **Level 1 — telemetry opt-in** — Single script tag in HTML enables browser telemetry. No other config needed. |
| 6.4 | [ ] | Pending | **Level 2 — custom thresholds** — `.canaries/config.json` allows overriding risk thresholds, adding custom signals, excluding routes. |
| 6.5 | [ ] | Pending | **Level 3 — custom contracts** — Users can author their own gating contracts with custom rules and SHA256 freezing. |

---

## Phase 7 — CI/CD Integration

| # | Step | Status | Description |
|---|------|--------|-------------|
| 7.1 | [ ] | Pending | **GitHub Actions — complete workflow** — `canaries.yml` that: installs deps, runs canaries, evaluates gate, uploads artifacts, sets job status (pass/fail). |
| 7.2 | [ ] | Pending | **GitLab CI template** — `.gitlab-ci.yml` equivalent of the GitHub Actions workflow. |
| 7.3 | [ ] | Pending | **Generic CI script** — `npx canaries ci` that works in any CI environment (Jenkins, CircleCI, Bitbucket Pipelines). Exits 0 (GO) or 1 (NO-GO). |
| 7.4 | [ ] | Pending | **PR comment bot** — On pull requests, post gate decision as a comment with risk score and summary. |
| 7.5 | [ ] | Pending | **GitHub Actions status check** — Register as a required status check so NO-GO actually blocks merge. |

---

## Phase 8 — Testing & Quality

| # | Step | Status | Description |
|---|------|--------|-------------|
| 8.1 | [ ] | Pending | **Unit tests for risk score engine** — Same inputs → same outputs. Cover edge cases: zero signals, max score, boundary thresholds. |
| 8.2 | [ ] | Pending | **Unit tests for service map gate** — Each of the 4 gating rules tested independently. Cover: no diff, critical removal, latency regression, dependency drift. |
| 8.3 | [ ] | Pending | **Unit tests for contract validation** — SHA256 integrity, tamper detection, version compatibility. |
| 8.4 | [ ] | Pending | **Integration test — full pipeline** — `init` → `run` → `gate` → `dashboard` on a sample Next.js app. Assert gate decision matches expected. |
| 8.5 | [ ] | Pending | **Integration test — full pipeline (Express)** — Same as 8.4 but for an Express API. |
| 8.6 | [ ] | Pending | **Integration test — full pipeline (static HTML)** — Same as 8.4 but for a static HTML site. |
| 8.7 | [ ] | Pending | **CI self-test** — Canaries with Teeth runs its own canaries on itself. Dogfooding. |

---

## Phase 9 — npm Package & Distribution

| # | Step | Status | Description |
|---|------|--------|-------------|
| 9.1 | [ ] | Pending | **Build pipeline** — TypeScript → JavaScript compilation. Output to `dist/`. Source maps for debugging. |
| 9.2 | [ ] | Pending | **Package configuration** — `package.json`: `bin`, `main`, `types`, `files`, `engines`, `peerDependencies` (Playwright). |
| 9.3 | [ ] | Pending | **npm publish workflow** — GitHub Actions workflow: on tag push, build, test, publish to npm. |
| 9.4 | [ ] | Pending | **npx smoke test** — Verify `npx canaries-with-teeth init` works from a clean directory with no prior install. |
| 9.5 | [ ] | Pending | **README badges** — npm version, CI status, license. |

---

## Phase 10 — Enterprise & Audit (Level 3)

| # | Step | Status | Description |
|---|------|--------|-------------|
| 10.1 | [ ] | Pending | **Audit trail export** — Every gate decision logged to `artifacts/audit/` with: timestamp, contract SHA256, all inputs, decision, operator. |
| 10.2 | [ ] | Pending | **Contract history API** — Programmatic access to all contract versions and their SHA256 hashes. |
| 10.3 | [ ] | Pending | **Multi-service orchestration** — Run canaries across multiple services with dependency-aware ordering. |
| 10.4 | [ ] | Pending | **Custom contract authoring** — JSON/YAML schema for defining custom gating rules with typed signals. |
| 10.5 | [ ] | Pending | **Compliance report generation** — Export gate decision history in formats suitable for SOC2/ISO audits. |

---

## Summary

| Phase | Focus | Steps | Target |
|-------|-------|-------|--------|
| 0 | Foundation fixes | 5 | Fix what's broken |
| 1 | Core CLI | 7 | The 90-second promise |
| 2 | Deterministic gating | 6 | The teeth |
| 3 | Service map | 5 | Regression detection |
| 4 | Browser telemetry | 4 | Real user signals |
| 5 | Dashboard | 5 | Visual reporting |
| 6 | Configuration | 5 | Progressive disclosure |
| 7 | CI/CD | 5 | Pipeline integration |
| 8 | Testing | 7 | Quality assurance |
| 9 | npm package | 5 | Distribution |
| 10 | Enterprise | 5 | Level 3 features |
| **Total** | | **59 steps** | **Production-ready north star** |

---

> Phases 0-2 are the minimum viable product.
> Phases 3-7 make it competitive.
> Phases 8-10 make it production-grade and enterprise-ready.
