# AGENTS.md — Instructions for AI Coding Agents

> This file tells AI coding agents (Claude Code, Codex, Kiro, Cursor, Copilot) how to interact with this project's roadmap and track progress.

---

## Roadmap Location

The development roadmap lives at: **`docs/ROADMAP.md`**

---

## Checking Off Completed Steps

When you complete a roadmap step, you **must** update `docs/ROADMAP.md` immediately.

### What to change

Each step in the roadmap looks like this:

```
| 0.1 | [ ] | Pending | **Fix TypeScript build pipeline** — description... |
```

After completing the step, change it to:

```
| 0.1 | [x] | Done | **Fix TypeScript build pipeline** — description... |
```

### The two changes per step

1. **Checkbox:** `[ ]` → `[x]`
2. **Status:** `Pending` → `Done`

That's it. Do not change the step number, the description, or anything else.

### How to make the edit

Use your editor's find-and-replace or edit tool. Match the exact row by step number (e.g., `| 0.1 |`) and update only the checkbox and status columns.

Example edit for step 0.1:

```
OLD: | 0.1 | [ ] | Pending | **Fix TypeScript build pipeline** — ...
NEW: | 0.1 | [x] | Done    | **Fix TypeScript build pipeline** — ...
```

---

## Rules

1. **Check off immediately.** Don't batch multiple completions. Mark each step as Done the moment the work is finished and verified.

2. **Only mark Done if truly complete.** The feature must be implemented, working, and (if applicable) tested. Partial work is not Done — leave it as Pending.

3. **One step at a time.** If you complete multiple steps in a session, update each one individually in the roadmap.

4. **Don't reorder steps.** The roadmap reflects priority and dependency order. Complete them in sequence within each phase when possible.

5. **Don't modify step descriptions.** If a step's scope needs to change, discuss with the developer first. The description is the contract.

6. **Commit the roadmap update.** When you commit the code that completes a step, include the roadmap update in the same commit or in the immediately following commit. The commit message should reference the step number:
   ```
   feat: fix TypeScript build pipeline (roadmap 0.1)
   ```

---

## Step Completion Checklist

Before marking a step as Done, verify:

- [ ] The described functionality works as specified
- [ ] No existing functionality was broken
- [ ] If the step involves CI, the workflow passes
- [ ] If the step involves tests, the tests pass
- [ ] The roadmap file has been updated (`[ ]` → `[x]`, `Pending` → `Done`)

---

## Phase Ordering

Phases should generally be completed in order (Phase 0 before Phase 1, etc.), but steps within a phase can be done in any order unless one depends on another.

**Phases 0–2** = Minimum Viable Product
**Phases 3–7** = Competitive feature set
**Phases 8–10** = Production-grade and enterprise-ready

---

## Example Workflow

1. Developer or agent picks step 0.1
2. Implements the TypeScript build pipeline
3. Verifies it works (`npm run build` succeeds)
4. Edits `docs/ROADMAP.md`:
   - `| 0.1 | [ ] | Pending |` → `| 0.1 | [x] | Done |`
5. Commits with message: `feat: add tsconfig and TypeScript build step (roadmap 0.1)`
6. Moves to step 0.2

---

## For Humans

If you're a human reading this: the same rules apply. The roadmap is the single source of truth for project progress. Update it when you complete a step.
