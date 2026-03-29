# LLM Handoff Context

> **Single cold-start document.** Read this first in any new chat session.
> Architecture decisions and parity audit → `docs/rebuild-plan.md`.
> Long-term vision → `docs/product-roadmap.md`.
> Agent discipline rules → `AGENTS.md`.

## Repos

| Role | Path |
|------|------|
| Primary (work here) | `c:\Users\lyubo\work\repos\brand-layout-ops` |
| Reference only | `c:\Users\lyubo\work\repos\racoon-anim` |

Do not continue product-architecture work in the reference repo unless explicitly asked.

## Quick start

```bash
npm run dev           # Vite dev server (overlay-preview)
npm run typecheck     # npx tsc --noEmit
npm run preview:dev   # alias for the preview app
```

Other useful checks: `npm run demo:overlay-layout`, `demo:copy-to-points`, `demo:orbits`, `demo:spokes`.

## Packages

`core-types` · `graph-runtime` · `layout-grid` · `layout-text` · `layout-engine` · `operator-overlay-layout` · `operator-copy-to-points` · `operator-orbits` · `operator-phyllotaxis` · `operator-spokes` · `operator-halo-field` · `operator-fuzzy-boids` · `operator-scatter` · `operator-ubuntu-summit-animation` · `overlay-interaction` · `parameter-ui`

All scoped under `@brand-layout-ops/`.

## Bird's-eye view

If you want the shortest high-level snapshot, read this file first.

- The rebuild has a usable overlay editor and shared package-backed control surface, but it is still in Stage 1 parity work rather than feature-complete product mode.
- A first-pass local document workflow now exists, so authored text, placement, logo state, scene configuration, and preset variants can be saved and reopened as real local project files instead of living only in browser storage.
- Recent-document reopen is now wired through stored file handles, preview documents now persist the shared overlay document metadata/state envelope plus shared project metadata for scene-family selection, document targets, and non-halo scene-family configs, preview-local document workspace orchestration now lives in `apps/overlay-preview/src/document-workspace.ts`, preview-side snapshot or apply plumbing now lives in `apps/overlay-preview/src/preview-document-bridge.ts`, the Output Format panel now edits scene family plus add or delete document sizes against that shared schema, non-halo scene families now render through `apps/overlay-preview/src/scene-family-preview.ts`, and source-default authoring now round-trips that shared overlay-document envelope while still reading older raw snapshot files.
- Product direction is now explicit: documents, not browser presets, are the real unit of work, and a document should eventually own the swappable scene-family or background operator stack, output target sizes, and exportable state while CSV remains a secondary import path.
- The next architectural shift is toward a clearer authoring environment: ordered visual layers instead of one-off safe-area or overlay passes, plus shell-level project actions that live in dedicated navigation rather than inside an ever-growing inspector.
- After that document seam is stable, the next highest parity target is still the full Ubuntu Summit scene-family pass and remaining mascot or halo composition fidelity.
- For architecture detail, read `docs/rebuild-plan.md`. For long-term direction, read `docs/product-roadmap.md`.

## Current state (updated 2026-03-29)

**Stage 1 — Parity Rebuild** is in progress. The overlay-preview app has:

- Working Three.js halo-field renderer with 3-phase animation (dot intro → finale sweep → screensaver loop)
- Text overlay with baseline grid layout, CSV/inline content, selection, drag, resize
- Per-profile halo config factory (`createHaloFieldConfigForProfile`) with deep merge
- Fold-seam spoke fade, echo marker shapes (8 variants), full echo detail controls
- Center derived from global `getOutputProfileMetrics`, not hardcoded per profile
- Preset save/load/delete/import/export UI still exists, but startup no longer seeds the working state from browser-local preset storage; documents are the intended source of truth
- Shortcut parity: `W` guide toggle, `Ctrl/Cmd+S` document save, `Ctrl/Cmd+Shift+S` save as, `Ctrl/Cmd+Alt+S` source-default writeback, `Space`/`P` playback, `Tab` control-panel show or hide
- PNG sequence export with frame-range modal + File System Access directory picker
- `window.__layoutOpsAutomation` API for headless Playwright export (ready/getState/applySnapshot/exportFrame)
- Headless PNG exporter (`scripts/export-headless.ts`) + FFmpeg MP4 encoder (`scripts/encode-mp4.ts`)
- Logo intrinsic aspect ratio loading via `Image.naturalWidth/naturalHeight`
- Column gutter, safe area override inputs, release label and screensaver pulse controls
- Per-profile defaults: safe area and halo center Y offset plus shared overlay-layout-owned grid and font-size defaults
- Shared output-profile defaults now match the reference app's named sizes, seeded safe areas, and default frame rates, and the authored source-default document carries the same safe-area values for the live startup path
- Canvas scale-to-fit with `--stage-aspect-ratio` CSS variable (supports portrait/landscape)
- Accordion mutual exclusion (one open section at a time)
- Text north-corner resize now snaps vertically on the baseline grid instead of discarding vertical drag
- CSV content resolution now matches overlay fields by format aliases and legacy slots, not only exact field IDs
- Pending CSV drafts now survive output-profile and content-format switches instead of being discarded globally
- Selected text controls now expose quick-select buttons for each text item plus inline style assignment, font size, line height, and weight editing for the active style, all inside the Selected Element section
- Export settings now persist per output profile inside preview state, source-default snapshots, and preset payloads instead of resetting on every profile switch
- Halo config now persists per output profile inside preview state, source-default snapshots, and preset payloads instead of regenerating from defaults on every profile switch
- Active content formats now persist per output profile inside preview state, source-default snapshots, and preset payloads, so profile switches restore the intended format bucket instead of reusing one global selection
- Active content formats now also resolve through shared overlay-layout helpers when profiles, presets, and source-default snapshots choose the valid format bucket
- CSV authoring UI now shows row status, alias-based field mapping, and per-field staged-versus-applied values for the active format, `speaker_highlight` is selectable again alongside `generic_social`, and Apply/Discard now enable immediately while staged CSV edits are being typed
- Source-default writeback now flushes staged CSV drafts through `/__authoring/overlay-csv` before saving the shared overlay-document payload, reports how many CSV files were updated first, and blocks conflicting staged drafts that target the same asset path instead of silently overwriting one profile bucket with another
- The preview now has a first-pass local document workflow: open, save, save as, and duplicate `.brand-layout-ops.json` files persist the working snapshot plus the preset library instead of relying only on browser-local presets
- Recent documents now reopen through `apps/overlay-preview/src/document-storage.ts`, so the document workflow covers open, save, save as, duplicate, and handle-backed reopen instead of only one-shot file access
- Preview document files now persist shared `operator-overlay-layout` document metadata/state envelopes plus shared `project` metadata for `sceneFamilyKey`, `activeTargetId`, document target profiles, non-halo `sceneFamilyConfigs`, and the saved active `backgroundGraph`, while `apps/overlay-preview/src/preview-document.ts` keeps the preview-only preset and pending-CSV extras plus legacy-file compatibility for the older preview-local envelope
- Preview-local document workspace state, recent-document rendering, file open or save orchestration, and download fallback now live in `apps/overlay-preview/src/document-workspace.ts`, and preview-side source-default snapshot plus document build/apply/reset plumbing now live in `apps/overlay-preview/src/preview-document-bridge.ts` instead of `apps/overlay-preview/src/main.ts`, so the remaining document-specific preview seam is mostly preview-only extras plus UI consumption of shared project metadata
- The Output Format panel now edits document-owned scene family and saved document sizes, add or delete size actions now prune saved per-profile layout or export maps instead of letting removed sizes silently return on reopen, and `window.__layoutOpsAutomation.getState()` now exposes the shared document project metadata
- The stage renderer and composed-frame export path now respect the selected document scene family: `halo` keeps the Three.js halo renderer, while `phyllotaxis`, `fuzzy-boids`, and `scatter` now use richer family-specific canvas rendering through `apps/overlay-preview/src/scene-family-preview.ts`, and the inspector now shows dedicated operator panels for those non-halo families instead of only a preview summary
- Shared `document.project.sceneFamilyConfigs` plus `document.project.backgroundGraph` now own the non-halo operator params and first typed handoff, so save/save-as/duplicate/reopen plus source-default reset or writeback restore both the active background operator's typed params and the active chain instead of rebuilding them from preview-local state
- `Ctrl/Cmd+S` now saves the current document, `Ctrl/Cmd+Shift+S` forces Save As, and source-default writeback moved to `Ctrl/Cmd+Alt+S` plus the explicit button so file-backed editing is the default authoring path
- Source-default authoring now reads either the legacy raw snapshot shape or the shared overlay-document payload and writes the shared overlay-document payload so authored defaults carry both the snapshot state and document project metadata
- CSV authoring now exists as an import and staging path, and the saved background chain now has a list-first inspector surface instead of more ad hoc preview-local background controls
- The graph/runtime layer now has a document-owned active background chain through `project.backgroundGraph`, and the preview inspector now exposes that chain as rendered-output radios plus saved-node selection before any fuller graph editor is attempted
- Selecting a saved background node now filters the accordion to that operator's pane, upstream-node edits stay on that saved node instead of rebuilding the whole chain from scene-family defaults, and active-output-node edits still mirror back into the matching `sceneFamilyConfigs` entry for future chain rebuilds
- Single-frame PNG export now captures the halo layer again after enabling `preserveDrawingBuffer: true` in `apps/overlay-preview/src/halo-renderer.ts`; the user manually revalidated the still-export path, so that regression is no longer the active blocker
- `operator-ubuntu-summit-animation` now computes scene phase, runtime timing, loop timing, mascot-box metadata, reveal geometry, screensaver pulse counts, and transient spoke-transition state, and the preview renderer plus automation state now consume that descriptor path
- `operator-ubuntu-summit-animation` now also emits mascot motion timing and motion-state metadata (blink, head turn, eye closure, sneeze/nose bob) through the scene descriptor and automation bridge
- Ubuntu Summit mascot fade, head turn, blink, sneeze, and finale timing now live in shared `HaloFieldConfig` state and the Halo Field panel instead of inside hardcoded operator constants, and source-default save or reset now round-trips those timing values through the shared config path
- The halo renderer now treats mascot fade as a shared scene alpha for halo spokes, echo markers, and Ubuntu release labels instead of applying it only to the face overlay, so forced or future overlapping motion states do not leave the outer halo pass at full strength while the mascot is still faded in
- The halo renderer now also applies a first-pass vignette overlay on the text-overlay canvas using the shared vignette settings, so the outer scene band darkens closer to the reference renderer instead of ending abruptly at the shape-level radial fade only
- The preview renderer now draws the local mascot face asset, optional reference halo asset, and reference-leaning eye or nose layering on the overlay canvas using the scene-family operator's mascot box and motion state
- Linked title-to-logo sizing now normalizes through shared layout-engine helpers plus the shared overlay-layout path, so profile switches and loaded snapshots keep the A Head/logo lock intact while the canonical rule is no longer only preview-local
- Style labels and ordinal field labels now also route through shared overlay-layout helpers instead of preview-local label maps
- Base overlay text styles, seeded field layouts, seeded logo placement, sample CSV drafts, and `createDefaultOverlayParams` now also live in `operator-overlay-layout` instead of `sample-document.ts`
- Profile format-bucket types, clone helpers, and active-bucket normalization now also live in `operator-overlay-layout`, so profile switches, preset loads, and source-default snapshots all use one canonical bucket-selection path instead of reimplementing it in `main.ts`
- Ascent-aware first-baseline inset normalization now also routes through shared overlay-layout editing helpers instead of preview-local code in `main.ts`
- Profile-switch overlay carryover and frame resync now also route through shared overlay-layout helpers instead of preview-local sync logic in `main.ts`
- MP4 export verification now covers both straight encode and fade-in/fade-out flags against a real 48-frame headless export on Windows
- The preview control surface now imports the sibling `baseline-foundry` package instead of `vanilla-framework`, and Halo Field range controls render as real themed sliders again rather than bare native thumbs
- The preview shell now uses `baseline-foundry`'s pinned-aside application layout with a 30rem dock cap instead of preview-local reserved-width dock CSS, and the stage is no longer wrapped in a fixed-width panel shell
- The docked control panel is now resizable from the stage edge, persists its width in localStorage, and supports keyboard resizing while still driving the shared `--bf-app-aside-width` app-shell variable
- The preview shell is now hard-clamped to the viewport height and long inspector content scrolls inside the panel, so expanding a tall accordion no longer stretches the shared shell and pushes the stage below the fold without a scroll path
- The external small-screen `Controls` button is gone; the control panel now stays on one visibility model across breakpoints, opens by default, and `Tab` toggles it Photoshop-style without resize-driven forced reopen or collapse
- Report-driven shell cleanup is continuing: action toolbars now use `baseline-foundry` `bf-cluster` primitives instead of preview-local wrapper grids, dead local wrapper CSS is being trimmed using `baseline-foundry/docs/brand-layout-ops-styles-replacement-report.md`, and the unused `config-tabs` / `output-profile-tabs` dense-tab modifiers are now gone from live preview source
- The config-editor root now uses the shipped `bf-stack` primitive, and the preview-local `slider-pair` helper overrides plus dead wrapper-only CSS blocks have been removed where `baseline-foundry` already owns the behavior
- Keep `baseline-foundry` read-only from this cleanup pass: another agent is handling upstream selector ports there, so the remaining preview-local selectors now intentionally stay limited to true package gaps instead of duplicating cross-repo edits here
- The preview config editor now builds its accordion from a keyed, ordered registry of section definitions with section-level post-render hooks instead of one fixed append sequence plus hardcoded follow-up wiring, as the next step back toward operator-registered control surfaces
- The shared keyed section-registry primitive now lives in `packages/parameter-ui/src/index.ts` instead of `main.ts`, so future operator panels can register through shared parameter-surface infrastructure rather than preview-local maps
- Overlay selection now starts empty and clears when the selected element disappears, so resize handles only arm after an explicit user selection instead of always falling back to another field
- The logo panel now lets the user swap the logo asset path and toggle the A Head-to-logo size lock instead of forcing linked sizing at all times
- Selected-element, grid, and halo control rows now rely on `baseline-foundry`'s shared `grid-row` and compact number-input styling instead of preview-local `overlay-control-grid` CSS overrides
- Overlay pointer interactions now require a small movement threshold before drag or resize mutates text or logo items, so tap jitter does not accidentally move or resize fields
- The docked config editor no longer wraps its accordion stack in a nested `u-fixed-width` container, so the baseline-foundry panel shell owns the control-surface spacing directly instead of double-padding the aside content
- Source-default snapshot typing, built-in fallback construction, clone paths, and sanitization now also route through shared `operator-overlay-layout` helpers instead of preview-local snapshot structs in `main.ts`
- Halo-field sliders in the preview now stack the range track above the numeric input, so narrow inspector columns stay usable even though baseline-foundry still only exposes the shared horizontal slider pair
- Preview checkbox and metadata controls now use denser grid-row packing instead of leaving multiple full-height standalone form groups outside the shared panel grid
- All CSS classes now use native `bf-*` baseline-foundry names instead of `p-*`/`vr-*`/`vf-*` aliases (commit `fc35f96`)

**Preview shell extraction progress** (see `docs/rebuild-plan.md` § Preview Shell Audit):
- Generic form helpers (createFormGroup, createSliderInput, etc.) extracted to `packages/parameter-ui/src/accordion-form-helpers.ts`; `buildSectionEl` renamed `buildAccordionSectionEl` across all call sites
- SVG overlay adapter (createGuideMarkup, createTextMarkup, createLogoMarkup, createSafeAreaMarkup, escapeXml) extracted to `apps/overlay-preview/src/svg-overlay-adapter.ts`; `renderSvgOverlay` is now a thin orchestrator
- main.ts is currently ~3 530 lines; the state-sharing protocol (`preview-app-context.ts` with `PreviewAppContext` interface) is now in place, and all 9 operator-aligned section builders have been extracted to individual modules using explicit context injection instead of closure capture — see "Extraction order" in rebuild-plan.md. The next extraction targets are the authoring interaction controller and the export + automation controller.
- `operator-ubuntu-summit-animation` now computes scene phase, runtime timing, loop timing, mascot-box metadata, reveal geometry, screensaver pulse counts, and transient spoke-transition state, and the preview renderer plus automation state now consume that descriptor path
- `operator-ubuntu-summit-animation` now also emits mascot motion timing and motion-state metadata (blink, head turn, eye closure, sneeze/nose bob) through the scene descriptor and automation bridge
- The preview renderer now draws the local mascot face asset, optional reference halo asset, and reference-leaning eye or nose layering on the overlay canvas using the scene-family operator's mascot box and motion state
- Linked title-to-logo sizing now normalizes through shared layout-engine helpers plus the shared overlay-layout path, so profile switches and loaded snapshots keep the A Head/logo lock intact while the canonical rule is no longer only preview-local
- Style labels and ordinal field labels now also route through shared overlay-layout helpers instead of preview-local label maps
- Base overlay text styles, seeded field layouts, seeded logo placement, sample CSV drafts, and `createDefaultOverlayParams` now also live in `operator-overlay-layout` instead of `sample-document.ts`
- Profile format-bucket types, clone helpers, and active-bucket normalization now also live in `operator-overlay-layout`, so profile switches, preset loads, and source-default snapshots all use one canonical bucket-selection path instead of reimplementing it in `main.ts`
- Ascent-aware first-baseline inset normalization now also routes through shared overlay-layout editing helpers instead of preview-local code in `main.ts`
- Profile-switch overlay carryover and frame resync now also route through shared overlay-layout helpers instead of preview-local sync logic in `main.ts`
- MP4 export verification now covers both straight encode and fade-in/fade-out flags against a real 48-frame headless export on Windows
- The preview control surface now imports the sibling `baseline-foundry` package instead of `vanilla-framework`, and Halo Field range controls render as real themed sliders again rather than bare native thumbs
- The preview shell now uses `baseline-foundry`'s pinned-aside application layout with a 30rem dock cap instead of preview-local reserved-width dock CSS, and the stage is no longer wrapped in a fixed-width panel shell
- The docked control panel is now resizable from the stage edge, persists its width in localStorage, and supports keyboard resizing while still driving the shared `--bf-app-aside-width` app-shell variable
- The preview config editor now builds its accordion from a keyed, ordered registry of section definitions with section-level post-render hooks instead of one fixed append sequence plus hardcoded follow-up wiring, as the next step back toward operator-registered control surfaces
- The shared keyed section-registry primitive now lives in `packages/parameter-ui/src/index.ts` instead of `main.ts`, so future operator panels can register through shared parameter-surface infrastructure rather than preview-local maps
- Overlay selection now starts empty and clears when the selected element disappears, so resize handles only arm after an explicit user selection instead of always falling back to another field
- The logo panel now lets the user swap the logo asset path and toggle the A Head-to-logo size lock instead of forcing linked sizing at all times
- Selected-element, grid, and halo control rows now rely on `baseline-foundry`'s shared `grid-row` and compact number-input styling instead of preview-local `overlay-control-grid` CSS overrides
- Overlay pointer interactions now require a small movement threshold before drag or resize mutates text or logo items, so tap jitter does not accidentally move or resize fields
- The docked config editor no longer wraps its accordion stack in a nested `u-fixed-width` container, so the baseline-foundry panel shell owns the control-surface spacing directly instead of double-padding the aside content
- Source-default snapshot typing, built-in fallback construction, clone paths, and sanitization now also route through shared `operator-overlay-layout` helpers instead of preview-local snapshot structs in `main.ts`
- Halo-field sliders in the preview now stack the range track above the numeric input, so narrow inspector columns stay usable even though baseline-foundry still only exposes the shared horizontal slider pair
- Preview checkbox and metadata controls now use denser grid-row packing instead of leaving multiple full-height standalone form groups outside the shared panel grid
- All CSS classes now use native `bf-*` baseline-foundry names instead of `p-*`/`vr-*`/`vf-*` aliases (commit `fc35f96`)
- Logo SVG overlay now uses resolved bounds (with safe area offset) instead of raw spec coordinates, fixing the selection-outline mismatch (commit `47811ca`)
- Exported SVG/PNG now strips guide overlays (baseline grid, layout grid) so only text, logo, and safe area fill make it into exports (commit `47811ca`)
- Overlay visibility now persists in localStorage across page refresh instead of resetting to hidden (commit `47811ca`)
- Scene family is now selected only from the operator selector radio group; the redundant dropdown was removed from the Output Format section (commit `47811ca`)
- Text fields can now be dragged above the safe area top edge; the `minimumOffsetBaselines` clamp was removed from `normalizeOverlayTextFieldOffsetBaselines` (commits `e8212a0` + `4c97dd3`)
- Logo hit-test now uses resolved bounds (with safe-area offset) so selecting and dragging the logo works correctly after the SVG rendering fix (commit `ba00a20`)
- Logo now appears in PNG export; `serializeExportSvgMarkup` inlines external `<image>` hrefs as data URLs before serialization (commit `4c97dd3`)
- All overlay pixel coordinates (text anchors, logo bounds, grid keylines, column span widths) are now rounded to integer pixels at resolution time (commit `4c97dd3`)
- Speaker highlight is selectable again through the shared content-format order, so both reference format buckets are live in the preview instead of one remaining hidden behind dead config
- Presets section removed from config panel — documents are the authoring unit (commit `4c97dd3`)
- Release label fold-seam fade: labels near the seam now fade behind the most recent spoke instead of rendering on top (commit `5b927dd`)
- `getGeometryScale` now falls back to `composition.scale` when no mascot box, so halo scale slider affects background spokes and echo shapes (commit `5b927dd`)
- Radial gradients removed from phyllotaxis and fuzzy-boids scene-family preview; `drawSoftGlow` helper deleted (commit `5b927dd`)
- `normalizeOverlayTextFieldOffsetBaselines` simplified: unused `params` and `measurer` arguments removed; `normalizeOverlayParamsForEditing` signature simplified accordingly (commit `5b927dd`)
- Dead export `getMinimumFirstBaselineInsetBaselines` removed from `layout-text` (commit `5b927dd`)
- Redundant `Math.round` wrapping `getKeylineXPx` in `resolveTextPlacement` removed — already rounded at source (commit `5b927dd`)
- Fuzzy boids inspector panel landed: `apps/overlay-preview/src/fuzzy-boids-section.ts` now exposes flock, speed, force, scale, mass, and bounds controls through the shared document project instead of hardcoded scene-family defaults (commit `25fed2c`)
- Phyllotaxis inspector panel landed: `apps/overlay-preview/src/phyllotaxis-section.ts` now exposes point count, radius, radius falloff, angle offset, and animation controls through the shared document project instead of hardcoded scene-family defaults
- The standalone Paragraph Styles section is gone; paragraph-style assignment now lives inline in the Selected Element section next to text editing and layout controls
- Scatter scene family landed: `packages/operator-scatter/src/index.ts` now generates point fields inside ellipse, rectangle, rounded-rect, or polygon-style SVG path boundaries, and `apps/overlay-preview/src/scatter-section.ts` exposes point count, seed, distribution mode, margin, and shape controls through the operator selector

## Current sprint TODO (active only)

**Active execution queue is in `docs/rebuild-plan.md` § "Approved Execution Queue — Active Only".**

All earlier EQ-1 through EQ-12 items are complete. Keep this handoff section focused on current work rather than repeating the finished queue.

### Immediate next steps

**Next parity slice** — keep pushing the whole Ubuntu Summit sequence visually now that whole-scene mascot fade and vignette are both in: re-audit the remaining overlay-level renderer gaps in `operator-ubuntu-summit-animation` and `halo-renderer.ts`, with safe-area fill or another missing final scene pass as the current leading candidate, instead of returning to shell cleanup.

**User feedback backlog from 2026-03-29** — keep this unscheduled for now and track it in `docs/rebuild-plan.md` rather than promoting it into the execution queue: non-halo scene families should cover the whole stage, phyllotaxis should render points only, fuzzy-boids needs a Houdini/VEX parity audit, scatter needs better relax plus full-frame behavior, file-backed open/save/duplicate UX needs to feel like real project files, and playback/export/default actions need a cleaner control split.

**Authoring direction from 2026-03-29** — keep steering toward a proper project-oriented authoring environment rather than a fixed Ubuntu-specific renderer shell: multiple ordered visual layers, less hard-coded "text over Three.js" thinking, and shell-level project actions moved into dedicated navigation chrome instead of growing the inspector.

**Graph follow-up after the current parity slice** — decide whether the background preview adapter should call further into shared graph evaluation primitives or continue as a thin typed renderer adapter over the persisted chain.

**Do not start a preview-local overlay drawer port right now** — wait for the upstream `baseline-foundry` overlay drawer work to finish there with full resize support, then swap the preview shell onto that implementation instead of duplicating it locally.

**Do not edit `baseline-foundry` from this pass** — treat the sibling repo as read-only while the parallel upstream agent owns selector and primitive work there; continue only with report-driven cleanup that can be finished inside `brand-layout-ops`.

**Bug: Halo scale zoom coverage** — `getGeometryScale` now falls back to `composition.scale` when no mascot box (commit `5b927dd`), so background spokes and echo shapes scale with the slider. Release labels already scaled. Verify visually that all elements (dots, spokes, shapes, labels, strokes) zoom uniformly; if any element still ignores scale, trace its geometry path.

**Bug: Release label fold-seam overlap** — `drawReleaseLabelOverlay` now applies `getFoldSeamAlpha` so labels near the fold seam fade behind the most recent spoke (commit `5b927dd`). Verify visually that the oldest release labels at the 9-o'clock seam appear behind the newest one.

## Key file map

| Purpose | File |
|---------|------|
| Output profiles, types | `packages/core-types/src/index.ts` |
| Halo config + per-profile overrides | `packages/operator-halo-field/src/index.ts` |
| App state, UI, profile switching | `apps/overlay-preview/src/main.ts` |
| State-sharing protocol for section builder extraction | `apps/overlay-preview/src/preview-app-context.ts` |
| Extracted halo-config section builder | `apps/overlay-preview/src/halo-config-section.ts` |
| Extracted layout-grid section builder | `apps/overlay-preview/src/grid-section.ts` |
| Extracted playback & export section builder | `apps/overlay-preview/src/playback-export-section.ts` |
| Extracted document section builder | `apps/overlay-preview/src/document-section.ts` |
| Extracted output-format section builder | `apps/overlay-preview/src/output-format-section.ts` |
| Extracted presets section builder | `apps/overlay-preview/src/presets-section.ts` |
| Extracted content-format section builder | `apps/overlay-preview/src/content-format-section.ts` |
| Extracted selected-element section builder | `apps/overlay-preview/src/overlay-section.ts` |
| Extracted form helpers (accordion builders, inputs) | `packages/parameter-ui/src/accordion-form-helpers.ts` |
| Extracted SVG overlay adapter (guide, text, logo, safe-area markup) | `apps/overlay-preview/src/svg-overlay-adapter.ts` |
| Preview-side document compatibility layer + preview extras on top of the shared document envelope | `apps/overlay-preview/src/preview-document.ts` |
| Preview-side snapshot plus document build/apply/reset bridge | `apps/overlay-preview/src/preview-document-bridge.ts` |
| Scene-family point-field preview adapter for non-halo backgrounds | `apps/overlay-preview/src/scene-family-preview.ts` |
| Preview-local document workspace controller, recent-document UI, and file open or save orchestration | `apps/overlay-preview/src/document-workspace.ts` |
| Preset persistence + export defaults | `apps/overlay-preview/src/sample-document.ts` |
| Recent document handles + reopen storage | `apps/overlay-preview/src/document-storage.ts` |
| Shared overlay defaults, document schema, and bucket normalization | `packages/operator-overlay-layout/src/index.ts` |
| Shared parameter section registry | `packages/parameter-ui/src/index.ts` |
| Three.js halo renderer | `apps/overlay-preview/src/halo-renderer.ts` |

## Reference file map (for parity work)

- **Profiles, presets, formats:** `racoon-anim/src/app/config-schema.js`, `default-config-source.js`, `editor-constants.js`, `index.js`
- **Halo-field, spokes, mascot:** `racoon-anim/src/app/rendering.js`, `halo-field.js`
- **Content + assets:** `racoon-anim/assets/content.csv`, `content-speaker-highlight.csv`, `UbuntuTagLogo.svg`, `racoon-mascot-face.svg`, `racoon-mascot-halo.svg`

If the gap is visual, run both apps and compare screenshots before changing code.

## Cross-platform Git note

`.gitattributes` enforces LF normalization. If a WSL clone under `/mnt/h/...` shows many dirty files after a Windows checkout, renormalize.

## Fresh chat prompt

Use this to resume work in a new chat:

Continue work in `c:\Users\lyubo\work\repos\brand-layout-ops` using `c:\Users\lyubo\work\repos\racoon-anim` as the reference app. Read `AGENTS.md`, `llm-handoff-context.md`, `docs/rebuild-plan.md`, `docs/product-roadmap.md`, and `README.md` first. The current product direction is explicit: documents, not browser presets, are the real unit of work. A document should eventually own the swappable scene-family or background operator stack such as halo, boids, phyllotaxis, or scatter, plus one or more target output sizes, layout state, export settings, and the saved operator connections that feed one operator's typed outputs into another. The preview already opens, saves, save-as, duplicates, and reopens recent `.brand-layout-ops.json` files through `apps/overlay-preview/src/preview-document.ts`, which stores the shared overlay document metadata/state envelope plus shared `project` metadata for scene family, document targets, `sceneFamilyConfigs`, and the active `backgroundGraph` while still carrying preview-only extras and backward compatibility for earlier preview-local files. Preview-local file orchestration, recent-document handling, dirty-state UI, and fallback download behavior now live in `apps/overlay-preview/src/document-workspace.ts`, while preview-side snapshot plus document build/apply/reset logic now live in `apps/overlay-preview/src/preview-document-bridge.ts` instead of `apps/overlay-preview/src/main.ts`. The Output Format panel now edits that shared project metadata for scene family and saved document sizes, deleted sizes prune their saved per-profile state from future document saves, non-halo scene families now render through `apps/overlay-preview/src/scene-family-preview.ts` in both the live stage and composed-frame export path with richer family-specific canvas rendering rather than only flat point dots, and the operator-owned phyllotaxis/fuzzy-boids/scatter panels now write directly into shared `document.project.sceneFamilyConfigs` while the saved active chain lives in `document.project.backgroundGraph`. Source-default authoring now reads either the older raw snapshot shape or the shared overlay-document payload and writes the shared overlay-document payload, so authored defaults also restore the active background operator, its typed params, and the saved first operator handoff. The near-term priorities are the remaining Ubuntu Summit parity passes, non-halo scene-family fidelity cleanup, and the shift toward a clearer authoring shell with ordered visual layers plus dedicated project or export navigation rather than more special-case inspector controls. Startup no longer seeds the working state from browser-local preset storage, but localStorage mirroring still exists inside the preview shell and should not become the canonical model again. CSV authoring is now a secondary import and staging path, not the main editing seam. The single-frame PNG halo export regression is manually revalidated and no longer the active blocker. Keep parity-first and anti-drift discipline, keep the preview as an adapter, keep `baseline-foundry` as the styling owner, and if you touch stacked sliders or shell primitives, coordinate with `c:\Users\lyubo\work\repos\baseline-foundry`, where the shared narrow-panel stacked-slider follow-up is already documented.

## Open Questions To Discuss Later

- Should the new repo eventually bring back an explicit content-format abstraction like the old app had, or should it stay with document-authored `contentFieldId` mappings plus operator schemas unless reuse pressure becomes concrete?
- Should logo intrinsic aspect-ratio loading and title-linked logo scaling stay outside the kernel as document or adapter preprocessing, or do we eventually want a coarse operator-side logo source model for that too?
- The browser-local preset model is now explicitly considered the wrong long-term abstraction; the open question is the exact shape of the local filesystem-backed document or project model, especially how scene-family selection, multiple output targets, and preview-only extras should be represented.
- Longer term, should the parameter surface become operator-scoped and eventually driven by selected-operator or network-view context rather than one monolithic document accordion?
- When a future point-consuming solver lands, should its initial seed field come directly from the saved document operator graph so phyllotaxis, halo-derived point layouts, or other generators can feed it without preview-local glue?
- Add/delete document sizes in the output panel — new feature.
- Add/delete paragraph styles — new feature.
- Draggable text doesn't need input fields any more (user does this manually); some things that are tuned work better with sliders; simple things like grid rows and columns don't.

## Important reference docs in this repo

- `README.md`
- `vanilla-typescale-audit.md`
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
- Interpret the long-term product target as a Houdini-like operator app with rigorous document layout and backend-driven exports, not as a literal Figma clone.
- The old repo already has valuable working interaction behavior; port that behavior, not its monolithic structure.
- The next planned point-field operator after phyllotaxis is fuzzy boids, but only after preview parity work and current motion validation are further along.
- Fuzzy boids should stay one coarse operator even if the Houdini reference used multiple wrangles internally for clarity.
- Timeline or clip sequencing is a known future need, but it is currently deferred and should only be architecturally factored in, not pulled into active work ahead of parity.
- For heavier SOP-like work, TypeScript remains the default until profiling shows a real bottleneck; GPU-backed execution paths should remain an architectural option, especially for future 3D or simulation-heavy operators.
- The current `operator-spokes` should stay coarse for parity; later decomposition may split it toward reusable wave, mask, and polar-field operators.
- user note: I want to be able to transition from one operator to the next, for example, for a video  Imight start with a phylotaxis with 500 points; I animate it to expand, then I group points based on proximity to another set of focal points, and seamlessly animate 0 them to smaller pools of boids lets say that circle aroudn those focal points; think how this behavior can be broken down into modular operators that create points, animate them for a while, then hand them over to other operators to continue the animation.

## Consumer handoff: baseline-foundry

The sibling repo at `c:\Users\lyubo\work\repos\baseline-foundry` provides all control-surface styling for `apps/overlay-preview`.

Use this package as a prebuilt local dependency, not as source to copy inline.

### Package surface

- package name: `baseline-foundry`
- CSS entry: `baseline-foundry/styles.css`
- browser JS entry: `baseline-foundry`
- Panel preset: `baseline-foundry/presets/panel.css` (0.75rem body, IBM Plex Sans, dense controls)

### What it currently provides

- dense body/UI text with baseline-aligned vertical rhythm
- `bf-*` class namespace: `bf-button`, `bf-field`, `bf-panel`, `bf-accordion`, `bf-tabs`, `bf-checkbox`, `bf-slider`, `bf-form-help`, `bf-input`, `bf-application`, `bf-aside`, `bf-main`, `bf-fixed-width`, `bf-theme`
- custom properties: `--bf-color-*`, `--bf-app-aside-width-*`, `--bf-control-block-size-dense`
- `initRangeControls()`, `initAccordions()`, `initTabs()`, `setupRangeControl()` browser helpers
- Backward-compatible `p-*`/`vr-*` aliases via the CSS compat layer (but source now uses native `bf-*` names)

### Integration

1. Local dependency in `brand-layout-ops/package.json`:
   - `"baseline-foundry": "file:../baseline-foundry"`
2. In `apps/overlay-preview/src/main.ts`, import:
   - `import "baseline-foundry/presets/panel.css";`
   - `import { initRangeControls } from "baseline-foundry";`
3. All source markup uses `bf-*` class names natively.

### If the next agent needs to change the package

Make changes in `c:\Users\lyubo\work\repos\baseline-foundry`, rebuild there, then return to this repo and verify the preview again. Do not fork or duplicate its CSS into `brand-layout-ops` unless explicitly requested.