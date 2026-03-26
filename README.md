# Brand Layout Ops

This repo is the extracted product kernel for the browser-native operator-graph direction.
Original repo for reference: h:\HOUDINI PROJECTS\RacoonTail\mascot-animation-clean-port\
It is intentionally not the current full app.

It holds the pieces that should survive renderer changes:

- typed document and operator contracts
- graph evaluation runtime
- layout-grid math
- text-layout math
- layout composition kernel

## Architectural position

Treat this like a simplified Houdini for branded layouts and motion scenes:

- layout is one operator family
- field or point generation is another
- SVG or vector instancing is another
- compositing is another
- preview backends are adapters
- export backends are adapters

The long-term rule is simple:

- no layout semantics inside Three.js
- no print semantics inside the preview runtime
- no monolithic app-level geometry rules

## Start Here

If you are resuming work in a fresh chat, read these first:

1. `docs/rebuild-plan.md`
2. `docs/product-roadmap.md`
3. `llm-handoff-context.md`
4. `docs/next-step-fuzzy-boids.md`

## Local Preview

There is now a browser preview shell for parity work.

Run:

```bash
npm run preview:dev
```

That starts a Vite app at `apps/overlay-preview/` which currently:

- evaluates the overlay-layout operator graph in the browser
- renders the overlay layout and a lightweight SVG motion layer using the coarse orbits and spokes operators
- supports text and logo selection, double-click text editing, drag snapping, guide toggling, and CSV or inline content switching
- surfaces the main operator document controls from an operator parameter schema instead of only from preview-local hardcoded controls
- includes left and right snapped resize handles for selected text fields, a first-baseline guide, and staged CSV apply or discard controls

Other useful local checks:

```bash
npm run typecheck
npm run demo:overlay-layout
npm run demo:copy-to-points
npm run demo:orbits
npm run demo:spokes
```

## Packages

- `@brand-layout-ops/core-types`: shared contracts and data payloads
- `@brand-layout-ops/graph-runtime`: minimal deterministic graph evaluator
- `@brand-layout-ops/layout-grid`: baseline-grid and column-grid resolution
- `@brand-layout-ops/layout-text`: wrapping and placement math using a provided measurer
- `@brand-layout-ops/layout-engine`: scene-level layout composition for branded overlay content
- `@brand-layout-ops/operator-overlay-layout`: graph-facing overlay composition operator built on the layout kernels
- `@brand-layout-ops/operator-copy-to-points`: Houdini-style point instancing with propagated attributes for later Three.js and SVG backends
- `@brand-layout-ops/operator-orbits`: coarse orbit-ring point-field generator for motion-side rebuild work
- `@brand-layout-ops/operator-phyllotaxis`: golden-angle point-field generation matching the current Houdini phyllotaxis HDA logic
- `@brand-layout-ops/operator-spokes`: coarse spoke-band point-field generator for motion-side rebuild work
- `@brand-layout-ops/overlay-interaction`: snapped text/logo drag math for operator-facing overlay editing
- `@brand-layout-ops/parameter-ui`: small DOM helpers for operator-facing control surfaces in preview apps

## Resume Point

The repo is past pure kernel extraction.

Implemented so far:

- overlay-layout operator and deterministic text measurement path
- preview shell with guides, selection, double-click text editing, snapped drag interaction, and CSV or inline content switching
- lightweight motion preview layer using `operator-orbits` and `operator-spokes`
- richer motion preview layering with orbit trails, spoke segments, and echo rings, still kept adapter-side for parity work
- schema-driven operator parameter controls for frame, safe area, grid, and content source
- selected-text baseline guide, snapped resize handles, and staged CSV flow with row diagnostics, header mapping status, and seed/apply/discard controls in the preview shell
- copy-to-points instancing path
- coarse orbits and spokes operators with runnable demos

The next work should stay focused on parity, not new feature breadth:

1. verify that the current motion preview is close enough to the reference repo for parity signoff
2. verify export-relevant geometry consistency
3. only then start the next field operator work such as fuzzy boids

## Later additions

- field generator operators
- SVG instancing operators
- Canvas/WebGL/Three preview adapters
- SVG export backend
- PDF/EPS print backend
- CMYK intent and mapping pipeline

See `docs/architecture.md` and `docs/future-backends.md`.