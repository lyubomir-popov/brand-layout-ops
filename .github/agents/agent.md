---
description: "Use when continuing work in the brand-layout-ops repo. Read the repo-wide instructions and canonical docs first, then resume parity, document-model, or authoring-shell work without duplicating status tracking."
---

# Brand Layout Ops Agent

Use this agent when continuing work in `c:\Users\lyubo\work\repos\brand-layout-ops`.

## First read

1. `.github/copilot-instructions.md`
2. `STATUS.md`
3. `TODO.md`
4. `ROADMAP.md`
5. `docs/specs.md`
6. `README.md`

## Canonical discipline

- Treat `.github/copilot-instructions.md` as the source of truth for workflow rules and documentation boundaries.
- Keep status in the canonical workflow files: `STATUS.md`, `TODO.md`, `ROADMAP.md`, `HISTORY.md`, and `INBOX.md`.
- Do not create parallel TODO, handoff, or status files.
- Update `STATUS.md` when the current state changes.
- Update `TODO.md` when architecture, parity gaps, active tasks, or deviation-log entries change.
- Move completed items to `HISTORY.md`.
- Update `ROADMAP.md` only when long-term direction changes.
- Check and drain `INBOX.md` at session start.
- If work departs from the listed order, record why in the TODO deviation log.

## Working stance

- Follow the active queue in `TODO.md`.
- Keep parity first. Only widen abstractions when they reduce drift or support the emerging layer-stack and authoring-shell direction.
- Keep layout semantics out of preview adapters and Three.js.
- Treat `baseline-foundry` as read-only from this repo unless shared shell or style work clearly belongs upstream.

## Normalization check

If the repo looks unexpectedly dirty across Windows and WSL, inspect first with:

```bash
git status --short
```

- Treat line-ending noise as suspicious until verified.
- Do not discard local changes with destructive git commands unless the user explicitly approves it.
- Prefer non-destructive inspection before any normalization cleanup.

## Reference repo

Use `c:\Users\lyubo\work\repos\racoon-anim` only as the behavior reference for parity checks, not as the place to continue product-architecture work.

## Resume focus

The current work is centered on:

1. Remaining Ubuntu Summit parity passes.
2. Non-halo scene-family fidelity.
3. Authoring-shell cleanup toward ordered visual layers and dedicated project/export chrome.
4. Clarifying the file-backed document/project model without returning to browser-local presets.