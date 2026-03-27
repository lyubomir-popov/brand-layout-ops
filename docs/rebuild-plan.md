# Rebuild Plan

## Objective

Rebuild the current mascot-animation project in this new architecture and verify 1:1 functional parity here before continuing feature work.

Work should now center on:

- `h:\WSL_dev_projects\brand-layout-ops`

The original app remains the reference implementation for behavior and output, not the place to continue product architecture work.

Reference source repo:

- `h:\HOUDINI PROJECTS\RacoonTail\mascot-animation-clean-port`

## Working Rules

- This file is the active source of truth for sequencing and status.
- Every completed or started item should be reflected here with a checkbox state.
- If work jumps ahead of the current phase, record the reason in the deviation log instead of pretending it followed the original order.
- Open ideas that are important but not yet approved work should stay in the discussion section at the end until we explicitly schedule them.

## Order of Work Checklist

### Phase 1. Lock the operator boundaries

Keep the first split intentionally coarse.

- [x] Establish the initial package families:
	`@brand-layout-ops/core-types`,
	`@brand-layout-ops/graph-runtime`,
	`@brand-layout-ops/layout-grid`,
	`@brand-layout-ops/layout-text`,
	`@brand-layout-ops/layout-engine`,
	`@brand-layout-ops/operator-overlay-layout`,
	`@brand-layout-ops/operator-spokes`,
	`@brand-layout-ops/operator-orbits`,
	`@brand-layout-ops/overlay-interaction`,
	`@brand-layout-ops/parameter-ui`
- [x] Keep all spoke-generation math in one operator family at first.
- [x] Do not prematurely split construction spokes, inner spokes, and phase-masked spokes.

### Phase 2. Build a runnable preview app in the new repo

This preview app is for parity validation, not for polishing the final product UI yet.

- [x] Load a document snapshot.
- [x] Evaluate the operator graph.
- [x] Render the current layout overlay.
- [x] Render the current motion background using coarse operators.
- [x] Surface operator parameters from manifests and schemas instead of preview-specific controls.

### Phase 3. Port the layout stack first

Port in this order.

- [x] Baseline grid and layout grid math.
- [x] Text wrapping and placement.
- [x] Logo placement.
- [x] CSV or inline content resolution.
- [x] Selected-element interaction model fully ported.

The layout-grid package must preserve the current behavior where:

- [x] All rows snap to the baseline grid and are verified against the reference app.
- [x] Remainder height is added to the bottom margin and is verified against the reference app.
- [x] Keylines and spans determine text width and are verified against the reference app.

### Phase 4. Port editor interaction as an operator-facing layer

Port the current interaction model into `overlay-interaction` and `parameter-ui`.

- [x] Selected-element editing foundation.
- [x] Direct text drag.
- [x] Logo drag.
- [x] Snapped text movement by row and column.
- [x] Shift-drag axis locking.
- [x] Double-click inline editing.
- [x] Guide toggle shortcut.
- [x] Style-based labels in the selected-element editor.
- [x] Resize handles for text fields with snapping to grid field widths and baselines.
- [x] CSV draft editing and writeback staging at parity quality.
- [x] Baseline guide showing at first baseline of text field, to aid alignment across columns.

### Phase 5. Port the animation background as coarse operators

Use larger passes, not tiny ones.

- [x] `operator-orbits`.
- [x] `operator-spokes`.
- [x] Integrate coarse motion preview into the preview shell.
- [ ] Match the current animation background look closely enough for parity signoff.
- [ ] Decide whether mascot-specific motion stays in an adapter or becomes a coarse scene-family operator.

The mascot head shake is probably too specific to deserve its own operator.

If it remains unique to one scene family, keep it as part of a mascot animation operator or preview adapter.

### Phase 6. Verify parity here

Before adding features, verify that the new repo reproduces the current app's working behaviors.

- [x] Overlay text layout.
- [x] Overlay logo placement.
- [x] Baseline and composition guides.
- [x] Selected-element editor behavior.
- [ ] Current animation background look.
- [x] Export-relevant geometry consistency.

### Phase 7. Continue feature work only after parity

Only after parity is proven in this repo should new feature work resume.

- [ ] Further operatorization of the motion system.
- [ ] Port user-authored Houdini digital assets where they still make sense in this architecture.
- [ ] SVG and print backends.
- [ ] Additional templates once CMYK-capable export exists.
- [ ] Stakeholder workflow.
- [ ] Watch-folder automation.

## Deviation Log

- [x] 2026-03-26: Motion preview integration from Phase 5 was pulled forward before Phase 4 and Phase 6 were complete.
	Reason: Phase 2 already required the preview shell to render the current motion background using coarse operators, and integrating it now improved parity visibility without moving layout semantics into the preview adapter.
- [x] 2026-03-26: CSV or inline content work landed before the remaining editor-polish items.
	Reason: This still fits the original ordering because content resolution belongs to Phase 3, while the missing pieces are mainly Phase 4 parity polish.

## Package split recommendations

### Good first splits

- [x] Grid math.
- [x] Text layout.
- [x] Overlay composition.
- [x] Overlay interaction.
- [x] Parameter surface generation.
- [x] Orbits.
- [x] Spokes.
- [ ] Mask operators.

## Discussion Items Not Yet Scheduled

These matter, but they are not approved active work until we discuss placement, cost, and effect on parity sequencing.

- [ ] Timeline and clip model like Houdini or After Effects.
	Working assumption: this belongs after parity, probably as a sequencing layer above the operator graph rather than as ad hoc timing logic inside each operator.
- [ ] Execution backend strategy for heavier SOP-like work.
	Working assumption: keep layout, SVG, document semantics, and moderate-size procedural operators in TypeScript; allow GPU-backed execution paths or adapters for high-count 3D or simulation-heavy operators where profiling proves TypeScript is not enough.
- [ ] Future spokes decomposition.
	Working assumption: keep the current `operator-spokes` coarse for parity, then later split toward a wave operator that can run in cartesian and polar coordinates, separate mask operators, and a polar field or radial layout operator for instanced shapes and text.
- [ ] Move beyond a strict background or overlay abstraction toward a proper layer stack with blend modes.
	Working assumption: do not widen the abstraction until parity is proven, but keep the future compositor layer in mind.

### Splits to not get bogged down with

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