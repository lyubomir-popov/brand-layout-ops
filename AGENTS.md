# Workspace Instructions

## Canonical documentation — 3 files, no overlap

| File | Role | Update frequency |
|------|------|-----------------|
| `llm-handoff-context.md` | **Cold-start handoff + current sprint TODO.** New chat reads this first. Contains repo orientation, current state summary, actionable TODO checklist, and reference file map. | Every session — update "Current state" and "Current sprint TODO" sections when work lands or priorities change. |
| `docs/rebuild-plan.md` | **Architecture + parity audit.** Phase checklist, gap audit, deviation log, working rules. The "why" and "what". | When phases complete, gaps close, or architectural decisions change. |
| `docs/product-roadmap.md` | **Long-term vision.** 5-stage roadmap. Stable. | Rarely — only when the product direction shifts. |

**No other files should carry TODO lists or duplicated status.**
Session-scoped scratch (Copilot `/memories/session/`) is fine for in-progress notes but must not become a parallel tracking system.

## Documentation discipline — follow on every task

### Before starting work

1. Read `llm-handoff-context.md` to understand current state and priorities.
2. If the task touches a parity gap, also read `docs/rebuild-plan.md`.

### After completing work

1. **Update `llm-handoff-context.md`:**
   - If a TODO item was completed, check it off or remove it.
   - If the "Current state" paragraph is now stale, update it.
   - If new TODO items emerged, add them in the right section.
2. **Update `docs/rebuild-plan.md`** if a phase checkbox, gap item, or deviation log entry changed.
3. **Do not** create new markdown files to document changes unless the user explicitly requests one.
4. **Commit message discipline:** prefix with the area touched (`halo:`, `ui:`, `grid:`, `docs:`, `types:`) and keep the first line under 72 chars.

## Autonomous continuation rule

If the user explicitly says to proceed autonomously, commit often, or keep working while they are away, treat that as standing approval to keep executing the best available plan without waiting for small confirmations.

In that mode:

1. Work through the current plan until you hit a real blocker, not a minor ambiguity.
2. Make small validated checkpoint commits after substantive chunks instead of piling unrelated work into one large diff.
3. Re-read `llm-handoff-context.md` and `docs/rebuild-plan.md` after major chunks or when priorities shift, and periodically re-audit whether the work is still aligned with the rebuild purpose.
4. Update the canonical docs as work lands so the next chat can continue cold.
5. Do not stop just to ask whether to continue unless the next best move is genuinely unclear or risky.

### What goes where

| Information | Goes in |
|-------------|---------|
| "What should the next chat do?" | `llm-handoff-context.md` → Current sprint TODO |
| "Why did we make this architectural decision?" | `docs/rebuild-plan.md` → Deviation Log or Phase notes |
| "What does the product become long-term?" | `docs/product-roadmap.md` |
| "Quick scratch notes for this session only" | `/memories/session/` (Copilot memory) |
| "Key file paths and resume pointers" | `/memories/repo/` (Copilot memory) |

## Non-negotiable architecture rules

- Layout semantics stay out of Three.js and preview adapters.
- Operator packages expose typed I/O; parameter UI reads operator manifests.
- No monolithic app-level geometry rules.
- SVG, PDF, EPS, and CMYK are export-backend concerns only.
- If a canonical rule must survive renderer or preview changes, move it toward shared types, layout kernels, operator outputs, or backend contracts rather than leaving it in `apps/overlay-preview`.

## How to port this workflow to another project

This file (`AGENTS.md`) is picked up automatically by GitHub Copilot agents in VS Code.
To adopt the same discipline in a different repo:

1. **Copy this file** into the new repo root as `AGENTS.md`.
2. **Create `llm-handoff-context.md`** at the repo root with these sections:
   - Repo orientation (paths, how to run)
   - Current state (1 paragraph)
   - Current sprint TODO (actionable checklist)
   - Key file map (table of important files)
3. **Keep a `docs/` folder** with at most:
   - A plan or architecture file (equivalent to `rebuild-plan.md`)
   - A roadmap file (equivalent to `product-roadmap.md`)
4. **Delete or don't create** any other TODO/status/handoff files. One cold-start doc + one plan + one roadmap is the maximum.

The key insight: every piece of status information should live in exactly one place. If you find yourself writing the same fact in two files, delete one.
