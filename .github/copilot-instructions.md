# Workspace Instructions

## Documentation structure

| File | Role | Who writes |
|------|------|-----------|
| `.github/copilot-instructions.md` | **Rules.** Workflow rules, source precedence, planning rules. | Agent maintains |
| `.github/agents/agent.md` | **Resume agent.** Optional repo-specific continuation prompt. | Agent maintains |
| `README.md` | **Overview.** Project summary and workflow map. | Agent maintains |
| `ROADMAP.md` | **Long-term.** Stages, parity inventory, future directions. | Agent updates rarely |
| `TODO.md` | **Active plan.** Architecture, parity audit, short-term tasks. | Agent updates every session |
| `INBOX.md` | **Inbox.** User drops notes to avoid interrupting agent. | User writes, agent drains |
| `STATUS.md` | **Cold start.** Repo orientation, current state, key files, critical invariants. | Agent updates when state changes |
| `HISTORY.md` | **Archive.** Completed work log. | Agent appends when tasks complete |
| `docs/specs.md` | **Specs.** Concrete linked spec paths and summary. | Agent updates when source paths change |

**No other files should carry TODO lists or duplicated status.** Session-scoped scratch (Copilot `/memories/session/`) is fine for in-progress notes but must not become a parallel tracking system.

## Source-of-truth precedence

When sources disagree, use this order unless a higher-priority source explicitly narrows it further:

1. Linked specs in workspace repos or explicitly referenced source docs
2. `ROADMAP.md`
3. `.github/copilot-instructions.md`
4. `STATUS.md` and `HISTORY.md`
5. `README.md` and `docs/specs.md`
6. `INBOX.md`
7. Local implementation details that are not clearly intentional or documented

Do not rewrite higher-priority docs to match lower-priority implementation drift.

## Planning threshold

- Small task: act directly.
- Medium task: write a short plan in `STATUS.md` before execution.
- Large / architectural / cross-repo task: create or update a dedicated plan section before making broad changes.

## History rules

- Record completed short-term items under a short-term section.
- Record completed long-term items under a long-term section.
- Move items to history only when actually complete.
- Do not use history as a backlog or scratchpad.

### The inbox pattern

`INBOX.md` is the user's write-only channel. At session start, the agent must:

1. Read the inbox.
2. Triage each item into `TODO.md` (near-term) or `ROADMAP.md` (longer-term).
3. Empty the file back to its header template.

This lets the user drop thoughts asynchronously without derailing agent work.

### What goes where

| Information | Goes in |
|-------------|---------|
| "What should the next chat do?" | `TODO.md` → Active TODO |
| "Why did we make this architectural decision?" | `TODO.md` → Deviation Log or Architecture notes |
| "What does the product become long-term?" | `ROADMAP.md` |
| "What concrete linked specs govern this repo?" | `docs/specs.md` |
| "What's been done?" | `HISTORY.md` |
| "Quick scratch notes for this session only" | `/memories/session/` (Copilot memory) |
| "Key file paths and resume pointers" | `/memories/repo/` (Copilot memory) |

## Agent workflow

### Session start

1. Read `STATUS.md` for orientation.
2. Check `INBOX.md` — triage items into plan or roadmap, then empty it.
3. Read `TODO.md` for current tasks.
4. Read `docs/specs.md` before changing external-spec-governed behavior.

### During work

- Mark tasks done in `TODO.md` as you complete them.
- Move completed items to `HISTORY.md`.

### Session end

1. Update `STATUS.md` if the current-state paragraph is stale.
2. Update `TODO.md` with any new tasks that emerged.
3. Ensure `INBOX.md` is empty.
4. **Do not** create new markdown files to document changes unless explicitly requested.

## Commit message discipline

Prefix with the area touched: `halo:`, `ui:`, `grid:`, `docs:`, `types:`, `build:`, `test:`. First line under 72 chars.

## Autonomous continuation rule

If the user explicitly says to proceed autonomously, commit often, or keep working while they are away, treat that as standing approval to keep executing the best available plan without waiting for small confirmations.

In that mode:

1. Work through the current plan until you hit a real blocker, not a minor ambiguity.
2. Make small validated checkpoint commits after substantive chunks instead of piling unrelated work into one large diff.
3. Re-read `TODO.md` after major chunks and periodically re-audit alignment.
4. Update the canonical docs as work lands so the next chat can continue cold.
5. Do not stop just to ask whether to continue unless the next best move is genuinely unclear or risky.

## Repo boundary

- Work in this repo only unless the user explicitly redirects elsewhere.
- Sibling repos (`racoon-anim`, `baseline-foundry`, `canonical-specs`, `docs-typescale`, `portable-vertical-rhythm`) are read-only references.

## Non-negotiable architecture rules

- Layout semantics stay out of Three.js and preview adapters.
- Operator packages expose typed I/O; parameter UI reads operator manifests.
- No monolithic app-level geometry rules.
- SVG, PDF, EPS, and CMYK are export-backend concerns only.
- If a canonical rule must survive renderer or preview changes, move it toward shared types, layout kernels, operator outputs, or backend contracts rather than leaving it in `apps/overlay-preview`.

## How to port this convention to another project

1. Create `.github/copilot-instructions.md` in the repo.
2. Optionally create `.github/agents/agent.md` for repo-specific resume guidance.
3. Create `README.md`, `ROADMAP.md`, `TODO.md`, `INBOX.md`, `STATUS.md`, and `HISTORY.md` at the repo root.
4. Create `docs/specs.md`.
5. Delete any other TODO/status/handoff files. One inbox + one cold-start + one plan + one roadmap + one archive is the maximum.

## Agent file roles

- `.github/copilot-instructions.md` is the single repo-wide instruction file.
- `.github/agents/agent.md` is optional and should contain only repo-specific resume or subagent guidance.
- Do not duplicate the full workflow rules in both places.

The key insight: every piece of status information lives in exactly one place. If you find yourself writing the same fact in two files, delete one.