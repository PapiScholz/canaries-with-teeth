# System Overview

## Where Canaries with Teeth fits

Modern dev workflow with AI coding agents:

```
Developer + AI Agent → pre-push checks → Git → CI → Deploy → Internet → User
```

AI agents (Codex, Kiro, Claude Code) already run builds and tests before pushing. **Canaries with Teeth doesn't compete with that — it covers what AI agents can't.**

---

## What AI agents check vs. what Canaries checks

| Check | AI Agent (pre-push) | Canaries with Teeth (CI) |
|-------|:-------------------:|:------------------------:|
| Code compiles? | **yes** | no |
| Unit tests pass? | **yes** | no |
| Lint / type-check? | **yes** | no |
| Route that existed still exists? | no | **yes** |
| Response time regressed? | no | **yes** |
| New unprotected endpoint appeared? | no | **yes** |
| App behaves like production baseline? | no | **yes** |
| E2E user flows work? | no | **yes** |
| Auditable decision with SHA256? | no | **yes** |
| Deterministic go/no-go gate? | no | **yes** |

**AI agents ask:** "Does this code work?"
**Canaries asks:** "Is this release safe to ship compared to what's running now?"

---

## Full System Diagram

```mermaid
flowchart TD
    DEV["🧑‍💻 Developer + AI Agent\n(Codex, Kiro, Cursor, Claude Code)"]

    subgraph PREPUSH ["🤖 AI Agent Pre-Push Checks"]
        direction TB
        BUILD["npm run build\n✅ Compiles?"]
        TEST["npm test\n✅ Unit tests pass?"]
        LINT["lint + type-check\n✅ Code quality?"]
    end

    GIT["📦 Git Repository\n(GitHub, GitLab, Bitbucket)"]
    CI["⚙️ CI Pipeline\n(GitHub Actions, GitLab CI)"]

    subgraph CANARIES ["🦷 Canaries with Teeth"]
        direction TB
        DETECT["1. Detect\nFramework, routes, endpoints"]
        RUN["2. Run Canaries\nE2E flows against real app"]
        DIFF["3. Compare\nBaselines, service map, response times"]
        SCORE["4. Risk Score\nDeterministic, SHA256-frozen"]
        GATE{"5. Gate Decision\n✅ GO / 🚫 NO-GO"}
    end

    DEPLOY["🚀 Deploy Platform\n(Vercel, Cloudflare, AWS)"]
    INTERNET["🌐 Internet"]
    USER["👤 End User"]
    BLOCK["🚫 Release Blocked\n+ Dashboard Report"]

    DEV --> PREPUSH
    BUILD --> TEST --> LINT
    PREPUSH -->|"git push"| GIT
    GIT -->|"triggers"| CI
    CI -->|"runs"| CANARIES
    DETECT --> RUN --> DIFF --> SCORE --> GATE
    GATE -->|"✅ GO"| DEPLOY
    GATE -->|"🚫 NO-GO"| BLOCK
    DEPLOY --> INTERNET --> USER
    BLOCK -->|"Dev fixes & pushes again"| DEV

    style PREPUSH fill:#2c3e50,stroke:#3498db,stroke-width:2px,color:#fff
    style CANARIES fill:#1a1a2e,stroke:#e94560,stroke-width:3px,color:#fff
    style GATE fill:#e94560,stroke:#e94560,color:#fff
    style BLOCK fill:#c0392b,stroke:#c0392b,color:#fff
    style DEPLOY fill:#27ae60,stroke:#27ae60,color:#fff
```

---

## The gap between AI agents and safe deploys

```
AI Agent catches:          Canaries catches:
─────────────────          ──────────────────
❌ Syntax errors            ❌ Route disappeared
❌ Failed unit tests        ❌ Response time 10x slower
❌ Type errors              ❌ New endpoint without auth
❌ Lint violations          ❌ Structural drift from baseline
                           ❌ E2E user flow broken
                           ❌ Risk score above threshold
```

**Code that compiles and passes unit tests can still break production.** That's the gap. A build succeeds, tests pass, the AI agent says "looks good" — but `/checkout` now returns 502, or `/api/payments` went from 50ms to 5 seconds, or a critical route silently disappeared during a refactor.

AI agents work with **the code in isolation**. Canaries works with **the app compared to its previous version**.

---

## What happens at each step

### 1. Detect

`npx canaries init` scans your project:
- Identifies framework (Next.js, Express, static HTML, etc.)
- Discovers all routes and endpoints
- Generates Playwright canaries automatically
- Establishes performance baselines

**You never write a test.**

### 2. Run Canaries

On every push, auto-generated E2E tests:
- Navigate every discovered route
- Check status codes (200, 404, 500, etc.)
- Measure response times
- Execute real user flows

### 3. Compare

Every result is compared against the **previous baseline**:
- Did a route disappear?
- Did response time regress significantly?
- Did the service map structure change?
- Are there new unprotected endpoints?

### 4. Risk Score

All signals aggregate into a deterministic score (0-100). The formula is **SHA256-hashed and version-controlled**. Same inputs = same result, forever.

### 5. Gate Decision

| Condition | Decision |
|-----------|----------|
| All canaries pass + risk below threshold | **GO** — deploy proceeds |
| Any canary fails OR risk above threshold | **NO-GO** — release blocked |

No warnings. No "maybe." **GO or NO-GO.**

---

## Simplified flow

```
Developer + AI Agent
    ↓
  [build, test, lint] ← AI agent handles this
    ↓
  git push
    ↓
  CI Pipeline
    ↓
  🦷 Canaries with Teeth ← compares against production baseline
    ↓
  ✅ GO → Deploy → Internet → User
  🚫 NO-GO → Blocked (fix & push again)
```

---

## What Canaries with Teeth does NOT touch

- Your source code (read-only analysis)
- Your AI agent's workflow (additive layer, not replacement)
- Your deploy platform (only controls the gate)
- Your existing tests (additive, not replacement)
- External services (fully local, no SaaS)
