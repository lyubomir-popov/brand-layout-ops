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

## Packages

- `@brand-layout-ops/core-types`: shared contracts and data payloads
- `@brand-layout-ops/graph-runtime`: minimal deterministic graph evaluator
- `@brand-layout-ops/layout-grid`: baseline-grid and column-grid resolution
- `@brand-layout-ops/layout-text`: wrapping and placement math using a provided measurer
- `@brand-layout-ops/layout-engine`: scene-level layout composition for branded overlay content
- `@brand-layout-ops/operator-copy-to-points`: Houdini-style point instancing with propagated attributes for later Three.js and SVG backends
- `@brand-layout-ops/operator-phyllotaxis`: golden-angle point-field generation matching the current Houdini phyllotaxis HDA logic

## Later additions

- field generator operators
- SVG instancing operators
- Canvas/WebGL/Three preview adapters
- SVG export backend
- PDF/EPS print backend
- CMYK intent and mapping pipeline

See `docs/architecture.md` and `docs/future-backends.md`.