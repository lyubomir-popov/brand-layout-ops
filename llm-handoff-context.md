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
- architecture docs
- future backend notes
- git init completed
- npm install completed
- TypeScript typecheck passing

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

1. Create a minimal runnable preview app in this repo.
2. Port overlay layout and editor interaction first.
3. Verify parity for overlay text, logo, and guides.
4. Port orbits and spokes as coarse operators.
5. Verify visual parity against the reference repo.
6. Resume new feature work only after parity is proven.

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
- The next planned point-field operator after phyllotaxis is fuzzy boids; implement it Three-first, SVG-later, and keep it as one coarse operator package initially.