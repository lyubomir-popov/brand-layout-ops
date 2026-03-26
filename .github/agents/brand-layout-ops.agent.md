---
description: "Use when continuing work in the brand-layout-ops repo, resuming parity rebuild work, or handing off the extracted operator-graph architecture. Check repository normalization first if the working tree looks dirty across Windows and WSL."
---

# Brand Layout Ops Resume Agent

Use this agent when continuing work in `h:\WSL_dev_projects\brand-layout-ops`.

## Working discipline

- Keep an eye on duplication across `docs/rebuild-plan.md`, `llm-handoff-context.md`, `README.md`, and other planning files.
- Keep a disciplined todo list and move completed items into history instead of leaving stale active lists behind.
- Update `llm-handoff-context.md` and `README.md` on every commit.
- Update `docs/product-roadmap.md` when the roadmap meaningfully changes.
- Follow `docs/rebuild-plan.md` by default; if work departs from the listed order, record why in the rebuild plan deviation log.

## First step: normalize if needed

Before doing anything substantial, check whether the working tree is genuinely dirty or whether the repo just needs normalization.

Why:

- this repo may be opened from Windows and from WSL via `/mnt/h/...`
- text files are now normalized through `.gitattributes`
- older checkouts can still appear dirty if line endings were touched before the normalization commit landed

If the repo looks unexpectedly dirty, do this first if it is safe:

```bash
git status --short
git fetch origin
git reset --hard origin/master
```

If there may be real local work, stash first:

```bash
git stash -u
git fetch origin
git reset --hard origin/master
git stash pop
```

Do not treat normalization noise as real content changes until you verify it.

## Primary repo purpose

This repo is the extracted product kernel for the browser-native operator-graph rebuild.

Reference implementation only:

- `h:\HOUDINI PROJECTS\RacoonTail\mascot-animation-clean-port`

Use the old repo for behavior reference and parity checks.

Use this repo for:

- graph-runtime work
- layout/grid/text kernel work
- operator extraction
- preview-shell work
- parity rebuild work

## Current resume point

Implemented so far:

- core graph, grid, text, and layout packages
- overlay-layout operator
- phyllotaxis operator
- copy-to-points operator
- coarse orbits operator
- coarse spokes operator
- overlay interaction helpers
- parameter-ui helpers
- browser preview shell at `apps/overlay-preview`
- CSV or inline content resolution in the preview shell
- lightweight SVG motion preview layer for orbits and spokes in the same preview surface

## What to verify first

Run:

```bash
npm run typecheck
npm run preview:dev
```

Useful demos:

```bash
npm run demo:overlay-layout
npm run demo:copy-to-points
npm run demo:orbits
npm run demo:spokes
```

## Next priority

Stay focused on parity, not breadth.

Priority order:

1. Deepen the preview shell toward selected-element editor parity.
2. Verify overlay text, logo, guides, double-click editing, and snapping against the reference repo.
3. Finish the remaining editor-parity items such as resize handles, staged CSV writeback quality, and baseline-guide assistance.
4. Verify motion parity against the reference repo now that orbits and spokes are in the same preview surface.
5. Only after parity, continue with the next field operator work such as fuzzy boids.

## Key docs

Read these before making architectural changes:

1. `README.md`
2. `llm-handoff-context.md`
3. `docs/rebuild-plan.md`
4. `docs/product-roadmap.md`
5. `docs/next-step-fuzzy-boids.md`