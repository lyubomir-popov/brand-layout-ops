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
- browser preview shell at `apps/overlay-preview`

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
- CSV or inline content resolution in the preview shell with row-based CSV draft editing
- coarse orbits and spokes operators verified through graph-runtime plus copy-to-points demos
- lightweight animated SVG motion layer in the preview shell using `operator-orbits` and `operator-spokes`
- schema-driven operator parameter controls for frame, safe area, grid, and content source
- selected-text first-baseline guide and left or right snapped resize handles in the preview shell
- staged CSV draft flow with explicit apply or discard controls in the preview shell
- richer CSV staging diagnostics in the preview shell: row navigation, header mapping status, unmatched-quote warning, and seed-row-plus-headers normalization

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
- resize handles for text fields with snapping to grid widths and baselines
- direct text dragging with snapping
- logo dragging
- Shift-drag axis locking
- double-click inline editing
- staged CSV edits and writeback path
- guide toggle shortcut
- style-driven labels in the editor
- first-baseline alignment guide for the selected text field

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

1. Verify the current motion preview against the reference repo now that orbits and spokes live in the same surface.
2. Verify export-relevant geometry consistency.
3. Decide whether the bottom-margin remainder behavior is equivalent enough to check off or needs adjustment.
4. Keep following `docs/rebuild-plan.md` in order; if work jumps ahead, update the deviation log there.
5. Resume new feature work only after parity is proven.

## Open Questions To Discuss Later

- Should the new repo eventually bring back an explicit content-format abstraction like the old app had, or should it stay with document-authored `contentFieldId` mappings plus operator schemas unless reuse pressure becomes concrete?

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
- Fuzzy boids should stay one coarse operator even if the Houdini reference used multiple wrangles internally for clarity.
- Timeline or clip sequencing is a known future need, but it is currently deferred and should only be architecturally factored in, not pulled into active work ahead of parity.
- For heavier SOP-like work, TypeScript remains the default until profiling shows a real bottleneck; GPU-backed execution paths should remain an architectural option, especially for future 3D or simulation-heavy operators.
- The current `operator-spokes` should stay coarse for parity; later decomposition may split it toward reusable wave, mask, and polar-field operators.
- user note: I want to be able to transition from one operator to the next, for example, for a video  Imight start with a phylotaxis with 500 points; I animate it to expand, then I group points based on proximity to another set of focal points, and seamlessly animate 0 them to smaller pools of boids lets say that circle aroudn those focal points; think how this behavior can be broken down into modular operators that create points, animate them for a while, then hand them over to other operators to continue the animation.