

# 30-minute setup

## 1. Install

```sh
npm install --save-dev canaries-with-teeth
```

## 2. Init

```sh
npx canaries init
```

## 3. Push

```sh
git add .
git commit -m "try canaries"
git push
```

---

## What happens next?

- **Every push is gated.**
- **No config required.**
- **No formulas or thresholds exposed.**
- **No thinking needed.**

---

## Example: BLOCKED Release

If a canary fails or risk is too high, your release is blocked.

**Example output:**

```
RELEASE BLOCKED

Reason: Canary failure detected
Risk Decision: BLOCK
Artifacts:
  - e2e/canary.e2e.spec.js
  - test-results/
  - report.json
```

---

## Static Dashboard

Generate a static dashboard for every run:

```sh
npx canaries dashboard
```

![Dashboard Screenshot](docs/assets/dashboard-screenshot.png)

---

## Defaults: MODE 0

- Zero configuration
- No contracts or formulas visible
- No tuning
- Works out of the box

---

## Architecture & Playbook

For architecture, contracts, and system design:
- docs/architecture/
- docs/contracts/
- playbook/
