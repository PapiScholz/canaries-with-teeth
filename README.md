# Canaries with Teeth

**Every deploy becomes a go/no-go decision. Zero config. Zero vendor lock-in. Zero test-writing.**

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

No config. No test writing. No dashboard setup. Push code, get a go/no-go decision.

---

## Why this exists

| Tool | Zero-Config | Release Gate | No Vendor Lock | No Tests Required |
|------|:-----------:|:------------:|:--------------:|:-----------------:|
| AWS Synthetics | no | no | no (AWS-only) | no |
| Checkly | no | partial | no (SaaS) | no |
| Datadog Synthetic | no | no | no (SaaS) | no |
| Flagger/Argo | no | yes | partial (K8s) | no |
| **Canaries with Teeth** | **yes** | **yes** | **yes** | **yes** |

**Nobody combines all four.** That's the gap.

---

## Setup (90 seconds)

### 1. Install

```sh
npm install --save-dev canaries-with-teeth
```

### 2. Init

```sh
npx canaries init
```

This detects your framework (Next.js, Express, static HTML, etc.), generates Playwright canaries automatically, establishes baselines, and creates a CI workflow — all without you writing a single test.

### 3. Push

```sh
git add . && git commit -m "add canaries" && git push
```

Every push is now gated. If a canary fails or risk is too high, the release is **blocked**.

---

## What it does

### Detects
- Framework type (frontend, backend, fullstack, static)
- All routes and endpoints in your application
- Structural changes between versions

### Gates
- **Canary failures** → release blocked
- **Risk score > threshold** → release blocked
- **Route disappeared** → release blocked
- **New unprotected endpoint** → release flagged

### Generates
- E2E canaries (Playwright) — automatically, no test-writing
- Static HTML dashboard — open `index.html`, no server needed
- Service maps — structural diff of your application
- Risk reports — deterministic, auditable, SHA256-hashed

---

## Dashboard

```sh
npx canaries dashboard
```

Pure HTML. No backend. Open locally or serve anywhere.

- Green = all clear
- Red = problem detected
- Shows exactly what changed and where

---

## Progressive disclosure

| Level | Who | What They See | Config |
|-------|-----|---------------|--------|
| **0** | Everyone | `npx canaries init` → auto-canaries → go/no-go | None |
| **1** | Devs | Browser telemetry SDK → richer risk scoring | 1 script tag |
| **2** | Platform teams | Service map gates, custom thresholds, contracts | Config file |
| **3** | Enterprise | Custom contracts, audit trails, multi-service | Full API |

Level 0 works out of the box. Everything else is optional.

---

## What this is NOT

- **Not an APM** — doesn't replace Datadog/New Relic
- **Not a testing framework** — doesn't replace Jest/Vitest
- **Not a deployment tool** — doesn't replace Argo/Flagger
- **Not a SaaS** — no accounts, no cloud, no vendor
- **Not passive** — if it says block, the release is blocked

---

## Architecture & docs

- [Vision](docs/00-vision.md) — why this exists
- [North Star](docs/NORTH-STAR.md) — mission, personas, differentiators
- [Architecture](docs/architecture/) — system design
- [Contracts](docs/contracts/) — frozen decision rules

---

> "If your deploy pipeline doesn't have teeth, it's just a suggestion."

---

# Guia en Espanol

## Que es Canaries with Teeth?

Un sistema que verifica si tu aplicacion funciona correctamente **antes** de cada despliegue. Lo agregas a tu proyecto y automaticamente revisa tu codigo cada vez que haces un cambio.

**No necesitas:**
- Configuracion especial
- Escribir tests
- Credenciales externas
- Conocimientos avanzados
- Cambiar tu codigo existente

## Como se usa?

```sh
# 1. Instalar
npm install --save-dev canaries-with-teeth

# 2. Inicializar (detecta tu framework automaticamente)
npx canaries init

# 3. Empujar cambios (el sistema verifica automaticamente)
git add . && git commit -m "agregar canaries" && git push
```

**Eso es todo.** Cada push ahora pasa por una verificacion automatica.

## Que pasa despues?

Cuando haces push, el sistema:

1. **Ejecuta canaries** — navega tu aplicacion automaticamente
2. **Compara** — con la version anterior
3. **Decide** — "permitir el despliegue" o "bloquearlo"
4. **Genera un dashboard** — HTML puro, abres `index.html` y ves verde (OK) o rojo (problema)

## Dashboard

```sh
npx canaries dashboard
```

Crea una carpeta `dashboard/` con archivos HTML. Abris `index.html` en tu navegador.

- **Verde** = todo bien
- **Rojo** = hay un problema
- **Lista de cambios** = que agregaste o eliminaste

### Seguridad del dashboard

El dashboard contiene informacion sobre la estructura de tu aplicacion (rutas, errores, flujos). **No lo publiques sin proteccion.** Usalo:

- Localmente en tu computadora
- Compartido internamente con acceso controlado
- Como artefacto temporal en CI/CD
- **Nunca** en una URL publica sin autenticacion

## Donde funciona?

- Websites y aplicaciones web (React, Vue, Angular, HTML)
- APIs y backends (Node.js, Express)
- GitHub Actions, GitLab CI, Jenkins
- Proyectos chicos (una pagina) o grandes (microservicios)

Si tu proyecto puede abrirse en un navegador o responder a peticiones, este sistema puede verificarlo.

## Que NO hace?

- No modifica tu codigo existente
- No necesita acceso a bases de datos
- No sube informacion a ningun servidor externo
- No ralentiza tu flujo de trabajo
- No te obliga a entender su funcionamiento interno
