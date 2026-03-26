# Rebuild Plan

## Objective

Rebuild the current mascot-animation project in this new architecture and verify 1:1 functional parity here before continuing feature work.

Work should now center on:

- `h:\WSL_dev_projects\brand-layout-ops`

The original app remains the reference implementation for behavior and output, not the place to continue product architecture work.

Reference source repo:

- `h:\HOUDINI PROJECTS\RacoonTail\mascot-animation-clean-port`

## Order of work

### Phase 1. Lock the operator boundaries

Keep the first split intentionally coarse.

Initial package families:

- `@brand-layout-ops/core-types`
- `@brand-layout-ops/graph-runtime`
- `@brand-layout-ops/layout-grid`
- `@brand-layout-ops/layout-text`
- `@brand-layout-ops/layout-engine`
- `@brand-layout-ops/operator-overlay-layout`
- `@brand-layout-ops/operator-spokes`
- `@brand-layout-ops/operator-orbits`
- `@brand-layout-ops/overlay-interaction`
- `@brand-layout-ops/parameter-ui`

Important constraint:

- keep all spoke-generation math in one operator family at first

Do not prematurely split:

- construction spokes
- inner spokes
- phase-masked spokes

Those are too coupled to justify separate operator packages yet.

### Phase 2. Build a runnable preview app in the new repo

Create a small app shell in this repo that can:

- load a document snapshot
- evaluate the operator graph
- render the current layout overlay
- render the current motion background using coarse operators
- surface operator parameters from manifests and schemas

This preview app is for parity validation, not for polishing the final product UI yet.

### Phase 3. Port the layout stack first

Port in this order:

1. baseline grid and layout grid math
2. text wrapping and placement
3. logo placement
4. CSV or inline content resolution
5. selected-element interaction model

The layout-grid package must preserve the current behavior where:

- all rows snap to the baseline grid
- remainder height is added to the bottom margin
- keylines and spans determine text width

### Phase 4. Port editor interaction as an operator-facing layer

Port the current interaction model into `overlay-interaction` and `parameter-ui`.

Required parity targets:

- selected-element editing
- direct text drag
- logo drag
- snapped text movement by row and column
- Shift-drag axis locking
- double-click inline editing
- CSV draft editing and writeback staging
- guide toggle shortcut
- style-based labels in the selected-element editor

### Phase 5. Port the animation background as coarse operators

Use larger passes, not tiny ones.

Recommended first operators:

- `operator-orbits`
- `operator-spokes`
- later, a mascot motion package if reuse becomes real

The mascot head shake is probably too specific to deserve its own operator on day one.

If it remains unique to one scene family, keep it as part of a mascot animation operator or preview adapter.

### Phase 6. Verify parity here

Before adding features, verify that the new repo reproduces the current app's working behaviors.

Parity checklist:

- overlay text layout
- overlay logo placement
- baseline and composition guides
- selected-element editor behavior
- current animation background look
- export-relevant geometry consistency

### Phase 7. Continue feature work only after parity

Only after parity is proven in this repo should new feature work resume.

That includes:

- richer templates
- stakeholder workflow
- watch-folder automation
- SVG and print backends
- further operatorization of the motion system

## Package split recommendations

### Good first splits

- grid math
- text layout
- overlay composition
- overlay interaction
- parameter surface generation
- orbits
- spokes

### Splits to delay

- separate spoke sub-operators for every spoke subtype
- mascot head shake as its own package
- tiny operator packages for every reveal or mask step
- CMYK-specific preview logic

## Non-negotiable architectural rules

- layout semantics stay out of Three.js
- print semantics stay out of the live preview runtime
- operator packages expose typed inputs and outputs
- parameter UI reads operator manifests and schemas instead of hardcoding control panels indefinitely
- background generation and layout remain separable so a later live Three scene can sit behind the same layout engine