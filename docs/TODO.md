# TODO

## Objective

Rebuild the current mascot-animation project in this new architecture and verify 1:1 functional parity here before continuing feature work.

Work should now center on:

- `c:\Users\lyubo\work\repos\brand-layout-ops`

The original app remains the reference implementation for behavior and output, not the place to continue product architecture work.

Reference source repo:

- `c:\Users\lyubo\work\repos\racoon-anim`

## Working Rules

- This file is the active source of truth for sequencing and status.
- Every completed or started item should be reflected here with a checkbox state.
- If work jumps ahead of the current phase, record the reason in the deviation log instead of pretending it followed the original order.
- Open ideas that are important but not yet approved work should stay in the discussion section at the end until we explicitly schedule them.

## Anti-Drift Checklist

Use this before and after substantial work so parity implementation keeps serving the long-term product.

- A scene family must be swappable. New motion work should move toward a world where halo, boids, phyllotaxis, and later generators can sit behind the same document, layout, and export stack.
- The layout engine stays rigorous and document-owned. Do not let renderer adapters or preview-only helpers become the canonical home for layout semantics.
- Preview code is an adapter, not the product core. If a rule must survive renderer changes, it belongs in shared types, layout kernels, operator outputs, or backend contracts.
- Background graph execution should converge on one live authority. `project.backgroundGraph` is the canonical execution model; `sceneFamilyConfigs` seeds new graphs at family-switch boundaries and during document migration, but is not updated on every parameter edit. Do not re-introduce per-edit mirroring.
- UI work should reduce hardcoded preview ownership over time. Prefer section registration, manifests, and typed operator surfaces over adding more bespoke accordion builders indefinitely.
- Do not let Ubuntu-specific render quirks calcify into permanent one-off features. If a need is really "multiple ordered visual planes" or "a compositor above and below text," move toward a layer-stack model rather than adding another special-case toggle.
- Shell-level project actions belong in authoring chrome, not buried in operator panels.
- Export targets stay backend-driven. PNG, MP4, SVG, PDF, and EPS should share scene or document authority rather than each inventing their own semantics.
- Product direction is a Houdini-like operator app for branded documents, not a freeform-design-first clone. Template CRUD, document sizes, and stakeholder flows matter, but only in ways that preserve deterministic layout and operator composability.
- Parity is still the gate. If a task does not close parity, reduce future drift, or unblock backend separation, it needs a stronger reason.

## Where To Inspect Open Parity Gaps

Use this map before changing code so parity work stays anchored to the reference behavior.

- Output profiles, presets, content formats, and source-default persistence:
	- Reference repo: `c:\Users\lyubo\work\repos\racoon-anim\src\app\config-schema.js`, `default-config-source.js`, `editor-constants.js`, `index.js`
	- Current repo: `apps/overlay-preview/src/main.ts`, `apps/overlay-preview/src/preview-document.ts`, `apps/overlay-preview/src/sample-document.ts`, `packages/operator-overlay-layout/src/index.ts`
- Motion look, halo-field masks, mascot composition, and guide geometry:
	- Reference repo: `c:\Users\lyubo\work\repos\racoon-anim\src\app\rendering.js`, `halo-field.js`
	- Current repo: `apps/overlay-preview/src/main.ts`, `apps/overlay-preview/src/sample-motion.ts`, `packages/operator-orbits/src/index.ts`, `packages/operator-spokes/src/index.ts`
- Seed content, field mapping, logo assets, and mascot assets:
	- Reference repo: `c:\Users\lyubo\work\repos\racoon-anim\assets\content.csv`, `content-speaker-highlight.csv`, `UbuntuTagLogo.svg`, `racoon-mascot-face.svg`, `racoon-mascot-halo.svg`
	- Current repo: `apps/overlay-preview/src/sample-document.ts`, `packages/operator-overlay-layout/src/index.ts`, `apps/overlay-preview/public/assets/`
- Layout or export geometry questions:
	- Reference repo: `c:\Users\lyubo\work\repos\racoon-anim\src\app\rendering.js`
	- Current repo: `packages/operator-overlay-layout/src/index.ts`, `packages/layout-engine/src/index.ts`

If the gap is visual, run both apps and compare screenshots before editing.

## Phase Status

Phases 1–6 are complete (see `docs/history.md` for details). Phase 7 (feature work) is now unblocked.

### Phase 6. Verify parity (complete)

- [x] Overlay text layout.
- [x] Baseline and composition guides.
- [x] Overlay logo placement semantics. (Code audit: fields, defaults, linked scaling, safe-area origin all match reference.)
- [x] Selected-element editor behavior. (Code audit: text field controls, style palette, inline editing, logo controls all at parity.)
- [x] Current animation background look.
- [x] Export-relevant geometry consistency. (Closed on 2026-04-01 after stabilizing rebuild automation around full preview-document snapshots, refreshing the authored instagram source-default bucket to match current reference defaults, fixing halo transparent export mode, and re-running a fresh side-by-side screenshot pass against a regenerated `racoon-anim` reference frame.)
- [x] Export workflow parity. (Single PNG with auto-versioned directory export, PNG sequence with directory picker, preset export to `presets/{dims}/v{n}-{slug}.json`.)
- [x] Preset and source-default workflow parity. (Save/update/delete/import/export/directory-based export all working.)

## Remaining Parity Gaps

Consolidated from the 2026-03-27 cross-repo audit and subsequent delta passes.

No blocking parity gaps remain.

### Scene-family status

Halo parity is treated as complete for the current rebuild scope per user direction. The separate vignette overlay pass was removed because it introduced gradient banding in video exports, and no further halo fidelity work remains scheduled. Fuzzy-boids parity is done, scatter now includes an operator-side deterministic relax/repulsion pass so the field distributes across the frame instead of clumping around the initial random samples, and the WebGL2 fuzzy-boids spike is now treated as research-only opt-in rather than the default backend.

### Overlay, layout, and document

| # | Gap | Status | Remaining work |
|---|-----|--------|----------------|
| 1 | Output profiles scene ownership | PARTIAL | Per-profile overlay buckets, export settings, halo config, content-format selection all persist. Missing: profile-owned motion and mascot defaults at reference completeness. |
| 2 | Linked title-to-logo sizing | DONE | Helper in `layout-engine`, normalization in `operator-overlay-layout`, UI toggle in logo panel. Code audit confirmed matching behavior with reference. |
| 3 | Preset workflow | DONE | Save/update/delete/import/export with directory-based `presets/{dims}/v{n}-{slug}.json` versioned naming, file-backed documents, dirty-state tracking. |
| 4 | Source-default writeback | DONE | Load, reset, write, CSV flush, shared normalization. Orchestration extracted to `source-default-controller.ts`. |
| 5 | Export pipeline | DONE | Single PNG with auto-versioned `output/{dims}/` directory export, PNG sequence with directory picker, headless Playwright, FFmpeg MP4 encode, transparent BG. |
| 6 | Keyboard shortcuts | PARTIAL | All major shortcuts landed. Missing: block shortcuts during future export modal. |

### Architectural note

Item 18 from the original audit (Three.js vs SVG renderer difference) is an intentional architectural choice, not a parity gap. Visual output parity is the goal, not renderer parity.

### Principled parity rules

1. Keep halo stable and closed unless a concrete regression appears.
2. Keep label orientation in adapters, not kernels — the operator emits spoke angle and label-slot data.
3. Keep mascot composition adapter-side until reuse is concrete.
4. Finish profile/content/preset authority and export seams before reopening renderer-specific polish.

## Package split status

All initial splits complete. Mask operators remain deferred.

## Drift Signals — 2026-04-01

Active architectural risks requiring attention during the next work cycle.

| Signal | Severity | Detail |
|--------|----------|--------|
| `main.ts` at ~833 lines | **Medium** | CSV draft, playback, source-default, authoring, export, overlay editing, stage rendering/composition, inspector section registration, document target CRUD, preset lifecycle, profile/content switching, preview-document/workspace state orchestration, and background-graph selection or sync are all extracted from the former monolith. Remaining: DOM query helpers, overlay-visibility shell glue, and the final controller/bootstrap composition root. |
| `project.backgroundGraph` vs `sceneFamilyConfigs` | **Medium** | Per-edit mirroring is removed. Section panels read from graph nodes; `sceneFamilyConfigs` only updates at family-switch boundaries. Remaining cleanup: the saved document still serializes both; consider dropping `sceneFamilyConfigs` from the serialized envelope once all consumers use graph nodes. |
| `operator-overlay-layout/src/index.ts` at 262 lines (was 2,031) | **Resolved** | Decomposed into `document-schema.ts`, `background-graph.ts`, `field-defaults.ts`, `csv-resolution.ts`, `overlay-internals.ts`. Barrel re-exports only. |
| `scene-family-preview.ts` at 724 lines | **Medium** | Graph orchestration now uses preview operators registered with the shared graph runtime, which is the right direction. Remaining cleanup should extract preview operator wrappers or draw adapters only when reuse is concrete, not as a file-split exercise. |
| `halo-config-section.ts` at 62 lines | **Resolved** | Converted to schema-driven rendering via `renderSchemaPanel(HALO_FIELD_CONFIG_SCHEMA, ...)`. |

## Preview Shell Extraction — Current Status

### What is done

- Form helpers extracted to `parameter-ui/src/accordion-form-helpers.ts`.
- SVG overlay extracted to `svg-overlay-adapter.ts`.
- State-sharing protocol in `preview-app-context.ts`.
- 13 section builders extracted (halo-config, grid, playback, export, source-default, document, output-format, presets, content-format, overlay, fuzzy-boids, phyllotaxis, scatter). `paragraph-styles-section.ts` and the legacy `playback-export-section.ts` were removed as dead code.
- Document workspace in `document-workspace.ts`, document bridge in `preview-document-bridge.ts`.
- Halo rendering in `halo-renderer.ts`, scene-family preview in `scene-family-preview.ts`.
- Authoring interaction extracted to `authoring-controller.ts`; `main.ts` now delegates authoring init/render/reset/selection/keyboard behavior there and no longer carries the old inline interaction block.
- Export plus automation extracted to `export-controller.ts`; `main.ts` now delegates single-frame export, PNG sequence export, composed-frame generation, and `window.__layoutOpsAutomation` wiring there instead of carrying the old inline export block.
- CSV draft staging, committing, and flushing extracted to `csv-draft-controller.ts`.
- Playback loop (rAF timing, play/pause, step) extracted to `playback-controller.ts`.
- Selected-element text and logo editing extracted to `overlay-editing-controller.ts`; `main.ts` now delegates text CRUD, linked logo-title sizing, and the action-row builder there, and `overlay-section.ts` now marks inspector-driven edits dirty.
- Inspector section registry, operator selector UI, accordion restore behavior, and config-editor rebuild logic extracted to `config-editor-controller.ts`.
- Document size target CRUD plus Output Format subpanel rebuilding extracted to `document-target-controller.ts`.
- Preset save/update/delete, import/export, active-preset loading, and preset tabs rebuilding extracted to `preset-controller.ts`.
- Stage rendering and background composition extracted to `stage-render-controller.ts`; `main.ts` now delegates overlay-graph evaluation, halo and scene-family canvas routing, SVG overlay assembly, and the stage render pipeline there.
- Shell bootstrap and workspace chrome extracted to `preview-shell-controller.ts`; it now owns document workspace UI rendering, file-toolbar construction, drawer open/close behavior, docked resize bootstrap, keyboard shortcuts, and preview init sequencing. `npm run typecheck` and `npm run preview:build` both pass after the split.
- Profile and content-format switching extracted to `profile-state-controller.ts`; `main.ts` now delegates per-profile bucket persistence, export/halo profile state, output-profile switching, and content-format switching there.
- Preview-document build/apply/reset orchestration extracted to `preview-document-state-controller.ts`; `main.ts` now delegates persisted preview-document serialization, parse/apply/reset flows, and post-load refresh sequencing there.
- Background-node selection, scene-family label formatting, and graph rebuild sync extracted to `background-graph-controller.ts`; `main.ts` now delegates selected-node normalization, graph-node updates, and family-label formatting there.
- The real overlay preview now consumes the canonical `baseline-foundry` surface classes for stage shell, fill-height panel shell, choice rows, option cards, tight helper text, compact color input, and nowrap action rows; the local alias layer for those patterns has been removed from `apps/overlay-preview/src/styles.css`.
- The real overlay preview now also uses shipped `baseline-foundry` drawer and pinned-aside runtime: overlay close/backdrop behavior comes from `initPanelDrawers()`, pinned resize behavior comes from `initResizableAsides()`, and the mobile shell now has a real `Controls` toggle instead of relying only on local close-state bookkeeping.
- Inspector rows in the live preview now resolve through the canonical `bf-grid` surface, with `bf-grid-scope` applied at `bf-panel-content` and `bf-accordion-panel` so local parameter sections keep the same keyline contract as the surrounding shell instead of using a separate dense control-grid abstraction.
- The inspector overlay panel now has a working internal scroll chain (`.bf-panel.is-fill` constrained inside the aside), and the local shell toggle moved off `Tab` to `P` so normal keyboard form navigation works again.

### Extraction checklist

1. [x] **Authoring interaction** → dedicated controller module. Landed in `authoring-controller.ts`; selection, drag, resize, hit testing, and inline editing now route through the controller.
2. [x] **Export + automation** → dedicated controller module. Landed in `export-controller.ts`; export modal, composed-frame helpers, PNG sequence, and automation API now route through the controller.
3. [x] **Source-default orchestration** → extracted to `apps/overlay-preview/src/source-default-controller.ts`.
4. [x] **Dead panel cleanup** → `paragraph-styles-section.ts` removed (never imported); `presets-section.ts` removed from config-editor registration (preset/localStorage persistence replaced by document save/open).
5. [x] **Halo config merge helpers** → extracted `getHaloConfigForProfile` and `mergeHaloConfigWithBaseConfig` from `main.ts` to `operator-halo-field`.
6. [x] Goal: `main.ts` is now a thin composition root wiring state and controllers. Current: ~833 lines after moving background-node selection and graph sync to `background-graph-controller.ts`; remaining DOM-query and overlay-visibility cleanup is optional follow-up, not an active extraction lane.

## Houdini-Like Parameter Pane — Architectural North Star

The product direction is a Houdini-like operator application for branded documents. The current multi-accordion panel with all sections visible at once is an interim shape. The target UI model is:

### Network view

- The document's active operator graph is visible as a list or simple node graph (list first, graph later).
- Each operator node shows its key, display name, and connection state.
- Selecting an operator in the network view shows only that operator's parameters in the parameter pane.
- Document-level concerns (output profiles, document metadata, presets) remain in a separate top-level section or header.
- The saved document must own the operator nodes, active operator selection, and connection data before a graphical network editor is built in the preview shell.
- Typed graph payloads such as `PointField` should remain first-order citizens so one operator can seed another, for example phyllotaxis or halo-derived point layouts feeding fuzzy-boids today and future point-consuming solvers later.

### Parameter pane

- When an operator is selected in the network view, the parameter pane shows only that operator's typed parameters.
- The pane is built from the operator's manifest or schema, not from a hardcoded section builder in the preview shell.
- Operators register their parameter surfaces through `parameter-ui`, not through preview-local factory functions.
- The pane supports the same form primitives (number, slider, checkbox, select, text area, color) but driven by operator metadata.

### Implications for current work

- Every section builder currently inline in `main.ts` should become an operator-owned panel module instead.
- The `parameter-ui` package should grow to support manifest-driven panel generation, not just the section registry primitive.
- The config editor should switch from "render all accordion sections" to "render the selected operator's panel."
- Overlay-level settings (content format, paragraph styles, grid, selected element) are parameters of `operator-overlay-layout`.
- Halo config is parameters of `operator-halo-field`.
- Scene-family preview settings are parameters of the active scene-family operator.
- Playback, export, and document settings are shell-level concerns, not operator parameters.
- Sequence the work list-first: document-owned operator state first, typed operator-to-operator dataflow second, graphical network view third.

This does not need to land all at once. The extraction work above is the prerequisite: once section builders are out of `main.ts` and operators own their panels, the switch from "show all sections" to "show selected operator" is a composition-root change, not a rewrite.

## Approved Execution Queue — Active Only

Concrete, dependency-ordered steps. Work top-down.

Lanes A-D are complete. See `docs/history.md` for the closed parity, shell-reduction, and authoring-shell work.

### Lane E — Selected-operator pane

E1 is complete: workspace-level controls now render in a dedicated shell rail above a separate operator pane, so the inspector no longer treats one mixed accordion stack as the long-term model.

| Step | Task | Depends on | Exit criteria |
|------|------|------------|---------------|
| E2 | Introduce a unified selected-operator model for `operator-overlay-layout` plus saved background nodes | E1 | The inspector can switch between overlay-layout and saved background operators through one selected-operator state model rather than background-only selection |
| E3 | Render only the selected operator surface in the parameter pane | E2 | The config editor stops rendering the full multi-accordion stack by default; overlay-layout and scene-family operators each expose a scoped selected-operator pane |

### Lane F — Baseline-Foundry shell compliance (queued after Lane E)

| Step | Task | Depends on | Exit criteria |
|------|------|------------|---------------|
| F1 | Align the preview shell with the latest `baseline-foundry` dark panel contract | E3 | The shell uses the upstream dark tone contract (`bf-theme is-dark`) and the current panel preset or tokens rather than local dark-theme wrappers |
| F2 | Remove local shell class contracts and data-attribute styling | F1 | Overlay-preview shell markup uses `bf-*` plus state classes only, and `apps/overlay-preview/src/styles.css` no longer styles `[data-*]` selectors |
| F3 | Finish the shipped drawer or pinned-aside integration without local shell policy chrome | F2 | The live shell relies on `initPanelDrawers()` plus `initResizableAsides()` with canonical `bf-application` or `bf-aside` structure and no custom panel-card layer |

### Lane G — Document-model regression fixes (closed 2026-04-01)

These regressions were introduced during the document-model and shell extraction work. They are now closed, so feature work can continue on Lane E.

| Step | Task | Status | Detail |
|------|------|--------|--------|
| G1 | File toolbar buttons (New/Open/Save/Save As/Duplicate) broken in Chrome | **DONE** | User later confirmed the toolbar works in Chrome incognito, so the original normal-profile failure was likely extension or profile interference rather than a current repo regression. The document picker still uses the safer `.json` filter plus fallback path, but no further toolbar bug work remains queued. |
| G2 | Remove remaining localStorage presets/content-format persistence | **DONE** | Presets section removed from config editor. localStorage read/write for presets and output-format stubbed to no-ops. Presets and content-format are legacy; only file-based document save and source-default writeback should persist state. |
| G3 | Remove content-format section from config editor | **DONE** | The dedicated Content Format accordion is no longer registered in the live inspector. Content-format remains a document/source-default concern in the data model, but it is no longer presented as a localStorage-era shell toggle. |
| G4 | Verify source-default writeback round-trips all operator settings | **DONE** | User re-checked the regression during this session and confirmed source-default writeback still works; the earlier failure report was a false alarm. |

### Non-blocking follow-ups

- [ ] Halo scale zoom coverage
- [ ] Release label fold-seam overlap

These are optional spot checks, not Stage 1 parity gates and not part of the active execution lane.

## Discussion Items Not Yet Scheduled

Deferred until explicitly promoted. Each carries a working assumption.

- **Timeline and clip model.** Belongs after parity, as a sequencing layer above the operator graph.
- **Broader graph persistence.** First background-chain persistence landed via `project.backgroundGraph`. Expand only after list-first network view proves out.
- **GPU/execution backends.** Keep moderate operators in TypeScript. Allow GPU paths only where profiling proves TypeScript insufficient.
- **Spokes decomposition.** Keep `operator-spokes` coarse for parity. Later split toward wave, mask, and polar-field operators.
- **Full compositor model.** Layer-stack direction is committed but the active queue should add parity-friendly seams first, not schedule a premature compositor rewrite.
- **Arbitrary output-size authoring.** Custom sizes stay below parity-critical work.
- **Paragraph-style set authoring.** Wait for stable project model and operator-scoped parameter surfaces.
- **Content-format vs project variants.** If file-backed variants replace content-format switching, current format UI can shrink later.
- **Cross-operator transition choreography.** Future timeline/sequencing concern, not preview-local temporal glue.

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


## Baseline-Foundry Latest Release Pressure Test (2026-03-30)

Status:

- Complete. The live overlay-preview inspector now renders credibly against the current `baseline-foundry` panel preset.

Root cause:

- The breakage was mostly downstream rename fallout, not baseline math and not a missing upstream primitive.
- The real blockers were hybrid class names that current `baseline-foundry` no longer styles, including `bf-panel__header`/`bf-panel__title`/`bf-panel__content`, `bf-accordion__*`, `bf-form__label`, `bf-button--base`, `bf-field--checkbox`, `bf-checkbox__*`, `bf-slider__input`, and `bf-modal__*`.
- Old `p-*` selectors were not the primary failure mode because the current upstream preset still ships compatibility selectors for them; the larger issue was mixing old structure with new `bf-*` prefixes.

Changes landed:

- `apps/overlay-preview/index.html` now uses the canonical panel header, title, content, actions, and toggle classes from the current preset.
- `packages/parameter-ui/src/accordion-form-helpers.ts` now emits canonical label, checkbox, slider, and accordion classes.
- The live panel builders in `apps/overlay-preview/src/main.ts`, `content-format-section.ts`, `overlay-section.ts`, `playback-section.ts`, `export-section.ts`, `source-default-section.ts`, `document-section.ts`, `document-workspace.ts`, `presets-section.ts`, and `halo-config-section.ts` now use canonical Foundry base-button, form-help, choice-row, option-card, color-input, and modal classes.
- `apps/overlay-preview/src/styles.css` now targets the current canonical panel-content, checkbox, and choice-row selectors. The custom `operator-selector` strip remains local policy/layout CSS rather than an upstream primitive gap.
- `apps/overlay-preview/vite.config.ts` now allow-lists the sibling `baseline-foundry` repo so dev-time pressure tests can load the shipped IBM Plex font assets instead of tripping Vite's fs guard.

Verification:

- `npm run typecheck`
- `npm run preview:dev`
- Headless Playwright inspection against the live preview after opening `Content Format` in CSV mode:
  - `hybridSelectorCount: 0`
  - `choiceRowCount: 6`
  - `optionCardCount: 3`
  - `baseButtonCount: 15`
  - computed styles confirmed `bf-panel-header` as sticky flex, `bf-panel-content` as padded scroll container, and `bf-accordion-tab` as styled flex control
- Local screenshot captured during verification for visual sanity-checking

Remaining blockers versus panel parity:

- No missing upstream primitive blocker was found in this slice.
- Remaining variance is now mostly downstream shell-compliance debt, not an upstream primitive gap: overlay-preview still carries local shell classes such as `.mascot-app`, `.stage*`, and `.operator-selector*`, plus one remaining data-attribute style hook (`body.editor-docked [data-panel-drawer-close]`). Queue this cleanup behind Lane E instead of diverging from the selected-operator work.