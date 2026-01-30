# UDI Contract (UI Degradation Index)

## Purpose
Quantify user-facing UI degradation in a deterministic way and provide
a gating-ready signal for release decisions.

UDI exists to detect regressions where the UI still “works” but degrades
in performance, stability, or interaction quality.

---

## Inputs (explicit fields)
Captured per page / view:

- lcp_ms
- inp_ms
- cls
- long_tasks_count
- ui_error_count
- dom_node_count
- interactive_elements_count
- ts
- page
- session_id
- build_id

Deduplication key:
- page + session_id + performance.timeOrigin

---

## Calculation (evaluation logic)
- Each metric is normalized to a 0–1 range using fixed clamps
- Weighted linear combination of normalized metrics
- Result is scaled to 0–100 and rounded

Example (illustrative):
- performance metrics: 40%
- interaction responsiveness: 30%
- errors & instability: 20%
- complexity signals: 10%

⚠ Formula is **frozen** once adopted. Any change requires an explicit version bump.

---

## Output range
- Integer: 0–100

Where:
- 0 = no detectable degradation
- 100 = severe UI degradation

---

## Operational interpretation
- 0–30: healthy
- 31–60: degraded but acceptable
- 61–80: serious degradation (investigate)
- >80: critical regression

UDI is evaluated per page and aggregated daily.

---

## Gating impact
- UDI > threshold MAY block release
- Sustained upward trend increases risk score
- Sudden spikes trigger investigation even if canaries pass

UDI is never advisory-only.

---

## Non-goals / what this contract does NOT do
- Does not identify root cause
- Does not replace E2E canaries
- Does not model user intent or satisfaction
- Does not perform ML-based anomaly detection