# LLM Handoff Context

## Repo to continue in

Primary working repo:

- `h:\WSL_dev_projects\brand-layout-ops`

Reference implementation only:

- `h:\HOUDINI PROJECTS\RacoonTail\mascot-animation-clean-port`

Do not continue product-architecture work in the old repo unless explicitly asked.

## Current state

This new repo already contains:

- `@brand-layout-ops/core-types`
- `@brand-layout-ops/graph-runtime`
- `@brand-layout-ops/layout-grid`
- `@brand-layout-ops/layout-text`
- `@brand-layout-ops/layout-engine`
- `@brand-layout-ops/operator-overlay-layout`
- `@brand-layout-ops/operator-copy-to-points`
- `@brand-layout-ops/operator-orbits`
- `@brand-layout-ops/operator-phyllotaxis`
- `@brand-layout-ops/operator-spokes`
- `@brand-layout-ops/overlay-interaction`
- `@brand-layout-ops/parameter-ui`
- architecture docs
- future backend notes
- git init completed
- npm install completed
- TypeScript typecheck passing
- first-pass browser preview shell at `apps/overlay-preview`

## Verified runnable paths

- `npm run typecheck`
- `npm run preview:dev`
- `npm run demo:overlay-layout`
- `npm run demo:copy-to-points`
- `npm run demo:orbits`
- `npm run demo:spokes`

## Cross-platform Git note

This repo now includes `.gitattributes` with LF normalization.

Reason:

- the repo may be opened from Windows and from WSL via `/mnt/h/...`
- Windows Git with `core.autocrlf=true` can otherwise make a WSL working tree look dirty even when content did not really change

If a WSL clone under `/mnt/h/...` suddenly shows many modified text files after a Windows-side checkout, renormalize or refresh the checkout after pulling the `.gitattributes` change.

## Recently completed work

- overlay-layout operator wired into the graph runtime
- deterministic text measurement path so layout can resolve outside a renderer
- first-pass overlay interaction math for snapped text and logo drag
- parameter-ui helper package for operator-facing DOM controls
- browser preview shell with guide toggle, selection, double-click text editing, and drag snapping
- coarse orbits and spokes operators verified through graph-runtime plus copy-to-points demos

## Immediate goal

Rebuild the current project here with 1:1 working behavior first, then continue feature development in this architecture.

## High-priority behaviors to port

### Layout and content

- baseline grid and layout grid coupling
- bottom-margin remainder behavior
- keyline-based text placement
- span-based width resolution
- logo placement tied to layout origin
- CSV or inline content resolution

### Editor interaction

- selected-element overlay editor
- direct text dragging with snapping
- logo dragging
- Shift-drag axis locking
- double-click inline editing
- staged CSV edits and writeback path
- guide toggle shortcut
- style-driven labels in the editor

### Motion scene

- coarse orbits operator
- coarse spokes operator
- current visual parity before adding more packages

## Operator split decisions

### Split now

- overlay layout operator
- grid package
- text package
- overlay interaction package
- parameter UI package
- orbits operator
- spokes operator

### Delay splitting

- construction spokes vs inner spokes vs phase-masked spokes as separate packages
- mascot head shake as a standalone operator unless reuse becomes obvious
- tiny operator packages for every reveal or mask stage

## Preview and export rules

- live preview can use Canvas, WebGL, or Three adapters
- layout semantics must remain outside preview adapters
- SVG, PDF, EPS, and CMYK remain export-backend concerns
- future live Three backgrounds should sit behind the same layout engine, not replace it

## Suggested next sequence for a fresh chat

1. Deepen the preview shell toward selected-element editor parity and CSV-or-inline content editing.
2. Verify parity for overlay text, logo, guides, double-click editing, and snapping behavior against the reference repo.
3. Bring orbits and spokes into the browser preview shell so motion can be validated in the same surface.
4. Verify visual parity against the reference repo before broadening the operator set.
5. Resume new feature work only after parity is proven.

## Important reference docs in this repo

- `README.md`
- `docs/architecture.md`
- `docs/future-backends.md`
- `docs/rebuild-plan.md`
- `docs/product-roadmap.md`
- `docs/next-step-fuzzy-boids.md`

## Important reference docs in the source repo

- `product/architecture.md`
- `product/mvp.md`
- `product/roadmap.md`
- `remaining-work.md`

## Notes for the next model

- Prefer coarse useful operators over over-abstracted tiny ones.
- The main reason for the rebuild is separation of concerns, not a maximal node-graph toy.
- Treat parity as the gating milestone.
- The old repo already has valuable working interaction behavior; port that behavior, not its monolithic structure.
- The next planned point-field operator after phyllotaxis is fuzzy boids, but only after preview parity work and current motion validation are further along.