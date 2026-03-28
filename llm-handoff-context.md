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

`core-types` · `graph-runtime` · `layout-grid` · `layout-text` · `layout-engine` · `operator-overlay-layout` · `operator-copy-to-points` · `operator-orbits` · `operator-phyllotaxis` · `operator-spokes` · `operator-halo-field` · `operator-fuzzy-boids` · `operator-ubuntu-summit-animation` · `overlay-interaction` · `parameter-ui`

All scoped under `@brand-layout-ops/`.

## Bird's-eye view

If you want the shortest high-level snapshot, read this file first.

- The rebuild has a usable overlay editor and shared package-backed control surface, but it is still in Stage 1 parity work rather than feature-complete product mode.
- A first-pass local document workflow now exists, so authored text, placement, logo state, scene configuration, and preset variants can be saved and reopened as real local project files instead of living only in browser storage.
- Recent-document reopen is now wired through stored file handles, preview documents now persist the shared overlay document metadata/state envelope plus shared project metadata for scene-family selection and document targets, preview-local document workspace orchestration now lives in `apps/overlay-preview/src/document-workspace.ts`, preview-side snapshot or apply plumbing now lives in `apps/overlay-preview/src/preview-document-bridge.ts`, the Output Format panel now edits scene family plus add or delete document sizes against that shared schema, and non-halo scene families now render through `apps/overlay-preview/src/scene-family-preview.ts`, so the next document-specific follow-up is giving those non-halo families dedicated controls or a richer renderer instead of only adapter defaults.
- Product direction is now explicit: documents, not browser presets, are the real unit of work, and a document should eventually own the swappable scene-family or background operator stack, output target sizes, and exportable state while CSV remains a secondary import path.
- After that document seam is stable, the next highest parity target is still the full Ubuntu Summit scene-family pass and remaining mascot or halo composition fidelity.
- For architecture detail, read `docs/rebuild-plan.md`. For long-term direction, read `docs/product-roadmap.md`.

## Current state (updated 2026-03-28)

**Stage 1 — Parity Rebuild** is in progress. The overlay-preview app has:

- Working Three.js halo-field renderer with 3-phase animation (dot intro → finale sweep → screensaver loop)
- Text overlay with baseline grid layout, CSV/inline content, selection, drag, resize
- Per-profile halo config factory (`createHaloFieldConfigForProfile`) with deep merge
- Fold-seam spoke fade, echo marker shapes (8 variants), full echo detail controls
- Center derived from global `getOutputProfileMetrics`, not hardcoded per profile
- Preset save/load/delete/import/export UI still exists, but startup no longer seeds the working state from browser-local preset storage; documents are the intended source of truth
- Shortcut parity: `W` guide toggle, `Ctrl/Cmd+S` document save, `Ctrl/Cmd+Shift+S` save as, `Ctrl/Cmd+Alt+S` source-default writeback, `Space`/`P` playback
- PNG sequence export with frame-range modal + File System Access directory picker
- `window.__layoutOpsAutomation` API for headless Playwright export (ready/getState/applySnapshot/exportFrame)
- Headless PNG exporter (`scripts/export-headless.ts`) + FFmpeg MP4 encoder (`scripts/encode-mp4.ts`)
- Logo intrinsic aspect ratio loading via `Image.naturalWidth/naturalHeight`
- Column gutter, safe area override inputs, release label and screensaver pulse controls
- Per-profile defaults: safe area and halo center Y offset plus shared overlay-layout-owned grid and font-size defaults
- Canvas scale-to-fit with `--stage-aspect-ratio` CSS variable (supports portrait/landscape)
- Accordion mutual exclusion (one open section at a time)
- Text north-corner resize now snaps vertically on the baseline grid instead of discarding vertical drag
- CSV content resolution now matches overlay fields by format aliases and legacy slots, not only exact field IDs
- Pending CSV drafts now survive output-profile and content-format switches instead of being discarded globally
- Selected text controls now expose direct style assignment plus font size, line height, and weight editing for the active style
- Export settings now persist per output profile inside preview state, source-default snapshots, and preset payloads instead of resetting on every profile switch
- Halo config now persists per output profile inside preview state, source-default snapshots, and preset payloads instead of regenerating from defaults on every profile switch
- Active content formats now persist per output profile inside preview state, source-default snapshots, and preset payloads, so profile switches restore the intended format bucket instead of reusing one global selection
- Active content formats now also resolve through shared overlay-layout helpers when profiles, presets, and source-default snapshots choose the valid format bucket
- CSV authoring UI now shows row status, alias-based field mapping, and per-field staged-versus-applied values for the active format
- The preview now has a first-pass local document workflow: open, save, save as, and duplicate `.brand-layout-ops.json` files persist the working snapshot plus the preset library instead of relying only on browser-local presets
- Recent documents now reopen through `apps/overlay-preview/src/document-storage.ts`, so the document workflow covers open, save, save as, duplicate, and handle-backed reopen instead of only one-shot file access
- Preview document files now persist shared `operator-overlay-layout` document metadata/state envelopes plus shared `project` metadata for `sceneFamilyKey`, `activeTargetId`, and document target profiles, while `apps/overlay-preview/src/preview-document.ts` keeps the preview-only preset and pending-CSV extras plus legacy-file compatibility for the older preview-local envelope
- Preview-local document workspace state, recent-document rendering, file open or save orchestration, and download fallback now live in `apps/overlay-preview/src/document-workspace.ts`, and preview-side source-default snapshot plus document build/apply/reset plumbing now live in `apps/overlay-preview/src/preview-document-bridge.ts` instead of `apps/overlay-preview/src/main.ts`, so the remaining document-specific preview seam is mostly preview-only extras plus UI consumption of shared project metadata
- The Output Format panel now edits document-owned scene family and saved document sizes, add or delete size actions now prune saved per-profile layout or export maps instead of letting removed sizes silently return on reopen, and `window.__layoutOpsAutomation.getState()` now exposes the shared document project metadata
- The stage renderer and composed-frame export path now respect the selected document scene family: `halo` keeps the Three.js halo renderer, while `phyllotaxis` and `fuzzy-boids` now use richer family-specific canvas rendering through `apps/overlay-preview/src/scene-family-preview.ts`, and the inspector swaps the halo controls for a scene-family preview summary when halo is not selected
- `Ctrl/Cmd+S` now saves the current document, `Ctrl/Cmd+Shift+S` forces Save As, and source-default writeback moved to `Ctrl/Cmd+Alt+S` plus the explicit button so file-backed editing is the default authoring path
- CSV authoring now exists as an import and staging path, and the next document-specific follow-up is giving phyllotaxis or fuzzy-boids real per-family controls and document-owned settings rather than pushing deeper into CSV-first editing
- Single-frame PNG export now captures the halo layer again after enabling `preserveDrawingBuffer: true` in `apps/overlay-preview/src/halo-renderer.ts`; the user manually revalidated the still-export path, so that regression is no longer the active blocker
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
- The preview control surface now imports the sibling `portable-vertical-rhythm` package instead of `vanilla-framework`, and Halo Field range controls render as real themed sliders again rather than bare native thumbs
- The preview shell now uses `portable-vertical-rhythm`'s pinned-aside application layout with a 30rem dock cap instead of preview-local reserved-width dock CSS, and the stage is no longer wrapped in a fixed-width panel shell
- The docked control panel is now resizable from the stage edge, persists its width in localStorage, and supports keyboard resizing while still driving the shared `--vr-application-aside-width` app-shell variable
- The preview config editor now builds its accordion from a keyed, ordered registry of section definitions with section-level post-render hooks instead of one fixed append sequence plus hardcoded follow-up wiring, as the next step back toward operator-registered control surfaces
- The shared keyed section-registry primitive now lives in `packages/parameter-ui/src/index.ts` instead of `main.ts`, so future operator panels can register through shared parameter-surface infrastructure rather than preview-local maps
- Overlay selection now starts empty and clears when the selected element disappears, so resize handles only arm after an explicit user selection instead of always falling back to another field
- The logo panel now lets the user swap the logo asset path and toggle the A Head-to-logo size lock instead of forcing linked sizing at all times
- Selected-element, grid, and halo control rows now rely on `portable-vertical-rhythm`'s shared `grid-row` and compact number-input styling instead of preview-local `overlay-control-grid` CSS overrides
- Overlay pointer interactions now require a small movement threshold before drag or resize mutates text or logo items, so tap jitter does not accidentally move or resize fields
- The docked config editor no longer wraps its accordion stack in a nested `u-fixed-width` container, so the PVR panel shell owns the control-surface spacing directly instead of double-padding the aside content
- Source-default snapshot typing, built-in fallback construction, clone paths, and sanitization now also route through shared `operator-overlay-layout` helpers instead of preview-local snapshot structs in `main.ts`
- Halo-field sliders in the preview now stack the range track above the numeric input, so narrow inspector columns stay usable even though PVR still only exposes the shared horizontal slider pair
- Preview checkbox and metadata controls now use denser grid-row packing instead of leaving multiple full-height standalone form groups outside the shared panel grid

**Preview shell extraction progress** (see `docs/rebuild-plan.md` § Preview Shell Audit):
- Generic form helpers (createFormGroup, createSliderInput, etc.) extracted to `packages/parameter-ui/src/accordion-form-helpers.ts`; `buildSectionEl` renamed `buildAccordionSectionEl` across all call sites
- SVG overlay adapter (createGuideMarkup, createTextMarkup, createLogoMarkup, createSafeAreaMarkup, escapeXml) extracted to `apps/overlay-preview/src/svg-overlay-adapter.ts`; `renderSvgOverlay` is now a thin orchestrator
- main.ts is currently ~4 633 lines; next extraction targets (section builders, authoring controller, export controller) all require a state-sharing protocol before they can leave the file — see "Extraction order" in rebuild-plan.md
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
- The preview control surface now imports the sibling `portable-vertical-rhythm` package instead of `vanilla-framework`, and Halo Field range controls render as real themed sliders again rather than bare native thumbs
- The preview shell now uses `portable-vertical-rhythm`'s pinned-aside application layout with a 30rem dock cap instead of preview-local reserved-width dock CSS, and the stage is no longer wrapped in a fixed-width panel shell
- The docked control panel is now resizable from the stage edge, persists its width in localStorage, and supports keyboard resizing while still driving the shared `--vr-application-aside-width` app-shell variable
- The preview config editor now builds its accordion from a keyed, ordered registry of section definitions with section-level post-render hooks instead of one fixed append sequence plus hardcoded follow-up wiring, as the next step back toward operator-registered control surfaces
- The shared keyed section-registry primitive now lives in `packages/parameter-ui/src/index.ts` instead of `main.ts`, so future operator panels can register through shared parameter-surface infrastructure rather than preview-local maps
- Overlay selection now starts empty and clears when the selected element disappears, so resize handles only arm after an explicit user selection instead of always falling back to another field
- The logo panel now lets the user swap the logo asset path and toggle the A Head-to-logo size lock instead of forcing linked sizing at all times
- Selected-element, grid, and halo control rows now rely on `portable-vertical-rhythm`'s shared `grid-row` and compact number-input styling instead of preview-local `overlay-control-grid` CSS overrides
- Overlay pointer interactions now require a small movement threshold before drag or resize mutates text or logo items, so tap jitter does not accidentally move or resize fields
- The docked config editor no longer wraps its accordion stack in a nested `u-fixed-width` container, so the PVR panel shell owns the control-surface spacing directly instead of double-padding the aside content
- Source-default snapshot typing, built-in fallback construction, clone paths, and sanitization now also route through shared `operator-overlay-layout` helpers instead of preview-local snapshot structs in `main.ts`
- Halo-field sliders in the preview now stack the range track above the numeric input, so narrow inspector columns stay usable even though PVR still only exposes the shared horizontal slider pair
- Preview checkbox and metadata controls now use denser grid-row packing instead of leaving multiple full-height standalone form groups outside the shared panel grid

## Current sprint TODO (do in order)

### A. Per-profile document defaults

- [x] **Fix safe area values** (`core-types/src/index.ts` — data fix)
  - instagram: `{0,0,0,0}`, screen: `{24,24,24,24}`, tablet: `{250,65,250,65}`

- [x] **Per-profile grid defaults** (`packages/operator-overlay-layout/src/index.ts` — shared profile-default table + helper)

- [x] **Per-profile halo center Y offset** (`operator-halo-field/src/index.ts` — `center_offset_y_px` in composition overrides)
  - landscape: -26, instagram: -121, story: -156, screen: +82, tablet: 0

- [x] **Per-profile font sizes** (`packages/operator-overlay-layout/src/index.ts` — shared profile text-style override table + helper)

### B. UI organization

- [x] **Accordion UI** for top sections (Playback & Export, Output Format, Document, Presets)
- [x] **UI audit report** — `docs/ui-audit.md` (136 controls catalogued, 37% implemented, 57% missing)

### C. Remaining parity (see `docs/rebuild-plan.md` gap audit)

- [x] Guide toggle 3-state cycle (already implemented: off → composition → baseline, `W`/`G` keys)
- [x] Export pipeline — single PNG ✅, PNG sequence with modal ✅, headless export ✅, MP4 encode ✅, fade encode flags ✅ (local FFmpeg install verified on Windows)
- [x] Logo intrinsic aspect ratio (loads via `Image`, uses `naturalWidth`/`naturalHeight`)
- [ ] Full Ubuntu Summit animation as one coarse scene-family operator
- [ ] Mascot composition (face SVG, halo SVG, blink, head turn, eye or nose fidelity) — **partial, still deprioritized for full parity polish**

### E. Export pipeline & headless Playwright (priority)

- [x] `window.__layoutOpsAutomation` API for headless frame export (matches reference `__mascotAutomation` pattern)
- [x] `scripts/export-headless.ts` — Playwright headless PNG sequence export (rewrites old DOM-manipulation approach)
- [x] `scripts/encode-mp4.ts` — FFmpeg PNG→MP4 encoder (libx264, CRF 10/14, yuv444p/yuv420p, slow preset, -tune animation, bt709)
- [x] PNG sequence export via File System Access API (`showDirectoryPicker`, fallback to download links)
- [x] Verify end-to-end: `npm run export:headless` → `npm run export:encode-mp4` → MP4 (48-frame, 2-second headless export verified at 1080x1350; straight encode and fade encode flags both verified; local FFmpeg install required on Windows)

### F. Bug fixes from user notes

- [x] Canvas not true to size / not scrollable — scale to fit via `--stage-aspect-ratio` CSS variable
- [x] Accordion shouldn't change when clicking inside — mutual exclusion on open, no close-on-content-click
- [x] Show overlay checkbox in wrong place — moved to grid accordion section
- [x] Text resize bug — north-corner text resize now preserves vertical snapping instead of collapsing the top edge toward the safe area
- [x] Overlay selection no longer starts with a forced selected text field or auto-falls back to another item after deletes or source-default resets
- [x] Logo sizing lock is now toggleable in the selected-logo section, and the logo asset path is editable there as well
- [x] Tap jitter no longer immediately drags or resizes overlay items; pointer movement now has to cross a small activation threshold first

### G. After current parity priorities

- [x] Incrementally switch the preview control surface from Vanilla to the local `portable-vertical-rhythm` micro-framework
  - Landed early by explicit user request so the broken Halo Field slider rendering could be fixed in the live preview
  - Uses the sibling repo package as a local dependency and keeps the existing alias-based markup for now
- [ ] Continue anti-drift refactors that reduce preview-shell ownership of canonical product behavior
  - **Next extraction prerequisite**: design a state-sharing protocol (context object, extracted state module, or dependency-injected callbacks) so section builders, authoring controller, and export controller can leave main.ts without simply moving closure coupling to a different file
  - Move remaining source-default writeback orchestration, export-state, and scene-family document rules toward shared layout or operator paths where parity permits
  - Replace preview-owned section definitions with package-registered or manifest-driven panels on top of the shared `parameter-ui` registry instead of expanding bespoke shell code indefinitely
  - Continue trimming preview-local control-surface CSS so `portable-vertical-rhythm` remains the styling owner and only genuinely preview-specific rules stay in `apps/overlay-preview/src/styles.scss`
  - Keep the docked shell on PVR's app-shell primitives; avoid reintroducing preview-local reserved-width or fixed-position aside hacks now that the 30rem docked panel cap lives in the shared layout path
  - If another consumer needs docked panel resizing, upstream the current preview-local resize-handle behavior into `portable-vertical-rhythm` instead of forking more app-shell logic in the preview
  - Upstream the preview's stacked narrow-panel slider treatment into `portable-vertical-rhythm` once the shared package has an explicit range-above-number inspector variant
- [ ] Persistent local document model and file-backed projects
  - Landed: the preview can now open, save, save as, duplicate, and reopen recent local `.brand-layout-ops.json` files that carry the current working snapshot plus the preset library
  - Landed follow-up: preview-document persistence helpers now live in `apps/overlay-preview/src/preview-document.ts` instead of `apps/overlay-preview/src/sample-document.ts`
  - Landed follow-up: preview documents now persist the shared overlay document metadata/state envelope while still reading the earlier preview-local file shape
  - Landed follow-up: startup no longer seeds the working document from browser-local preset storage, so documents are the intended source of truth even though localStorage mirroring still exists inside the preview shell
  - Landed follow-up: document workspace state, recent-document reopen, file open or save orchestration, and fallback download handling now live in `apps/overlay-preview/src/document-workspace.ts` instead of `apps/overlay-preview/src/main.ts`
  - Landed follow-up: preview-side source-default snapshot creation plus document build/apply/reset logic now live in `apps/overlay-preview/src/preview-document-bridge.ts` instead of `apps/overlay-preview/src/main.ts`
  - Landed follow-up: the shared `operator-overlay-layout` document schema now carries `project` metadata for `sceneFamilyKey`, `activeTargetId`, and the document's target output profiles
  - Landed follow-up: the Output Format panel now uses that shared `project` metadata for scene-family selection plus add or delete document sizes, and deleted sizes now drop their saved per-profile state from future document saves
  - Landed follow-up: the selected document scene family now changes the stage renderer and composed-frame export path, non-halo families replace the halo inspector with a preview summary instead of irrelevant halo controls, and `apps/overlay-preview/src/scene-family-preview.ts` now gives phyllotaxis and fuzzy-boids richer family-specific rendering instead of only flat adapter dots
  - Next: add dedicated parameter surfaces and document-owned scene-family settings for non-halo families instead of keeping their tuning on preview-local defaults
  - Next: decide whether preview-only document extras such as the preset library and pending CSV drafts should remain preview-side extensions or move into a broader shared document package later, with CSV explicitly kept secondary for now
- [x] Export parity follow-up
  - The single-frame PNG export path was manually revalidated by the user after the `preserveDrawingBuffer: true` fix in `apps/overlay-preview/src/halo-renderer.ts`, and the halo layer is present again

### D. UI parity quick wins (done)

- [x] Column gutter control in grid section
- [x] Safe area override inputs (conditional on Fit Within Safe Area)
- [x] Preset name input field
- [x] Halo echo detail controls (stroke, scale, sparse boost, seed, mix %, ripple, fade)
- [x] Phase end width control
- [x] Screensaver pulse orbit/spoke checkboxes
- [x] Release label controls (enable, font size, radial position)
- [x] Debug overlay checkboxes (reference halo, debug masks)

## Key file map

| Purpose | File |
|---------|------|
| Output profiles, types | `packages/core-types/src/index.ts` |
| Halo config + per-profile overrides | `packages/operator-halo-field/src/index.ts` |
| App state, UI, profile switching | `apps/overlay-preview/src/main.ts` |
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

Continue work in `c:\Users\lyubo\work\repos\brand-layout-ops` using `c:\Users\lyubo\work\repos\racoon-anim` as the reference app. Read `AGENTS.md`, `llm-handoff-context.md`, `docs/rebuild-plan.md`, `docs/product-roadmap.md`, and `README.md` first. The current product direction is explicit: documents, not browser presets, are the real unit of work. A document should eventually own the swappable scene-family or background operator stack such as halo, boids, or phyllotaxis, plus one or more target output sizes, layout state, and export settings. The preview already opens, saves, save-as, duplicates, and reopens recent `.brand-layout-ops.json` files through `apps/overlay-preview/src/preview-document.ts`, which stores the shared overlay document metadata/state envelope plus shared `project` metadata for scene family and document targets while still carrying preview-only extras and backward compatibility for earlier preview-local files. Preview-local file orchestration, recent-document handling, dirty-state UI, and fallback download behavior now live in `apps/overlay-preview/src/document-workspace.ts`, while preview-side snapshot plus document build/apply/reset logic now live in `apps/overlay-preview/src/preview-document-bridge.ts` instead of `apps/overlay-preview/src/main.ts`. The Output Format panel now edits that shared project metadata for scene family and saved document sizes, deleted sizes prune their saved per-profile state from future document saves, and non-halo scene families now render through `apps/overlay-preview/src/scene-family-preview.ts` in both the live stage and composed-frame export path with richer family-specific canvas rendering rather than only flat point dots. Startup no longer seeds the working state from browser-local preset storage, but localStorage mirroring still exists inside the preview shell and should not become the canonical model again. CSV authoring is now a secondary import and staging path, not the main editing seam. The single-frame PNG halo export regression is manually revalidated and no longer the active blocker. Next, add dedicated parameter surfaces and document-owned scene-family settings for non-halo families instead of leaving phyllotaxis and fuzzy-boids on preview-local defaults, and keep any remaining canonical document rules moving out of the preview shell rather than rebuilding more preview-local state. Keep parity-first and anti-drift discipline, keep the preview as an adapter, keep `portable-vertical-rhythm` as the styling owner, and if you touch stacked sliders or shell primitives, coordinate with `c:\Users\lyubo\work\repos\portable-vertical-rhythm`, where the shared narrow-panel stacked-slider follow-up is already documented in `llm-handoff-context.md` and `todo.md`.

## Open Questions To Discuss Later

- Should the new repo eventually bring back an explicit content-format abstraction like the old app had, or should it stay with document-authored `contentFieldId` mappings plus operator schemas unless reuse pressure becomes concrete?
- Should logo intrinsic aspect-ratio loading and title-linked logo scaling stay outside the kernel as document or adapter preprocessing, or do we eventually want a coarse operator-side logo source model for that too?
- The browser-local preset model is now explicitly considered the wrong long-term abstraction; the open question is the exact shape of the local filesystem-backed document or project model, especially how scene-family selection, multiple output targets, and preview-only extras should be represented.
- Longer term, should the parameter surface become operator-scoped and eventually driven by selected-operator or network-view context rather than one monolithic document accordion?
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

## Consumer handoff: portable-vertical-rhythm

There is now a sibling repo at `c:\Users\lyubo\work\repos\portable-vertical-rhythm` that should replace the current Vanilla control-surface dependency incrementally in `apps/overlay-preview`.

Use this package as a prebuilt local dependency, not as source to copy inline.

### Package surface

- package name: `portable-vertical-rhythm`
- CSS entry: `portable-vertical-rhythm/styles.css`
- browser JS entry: `portable-vertical-rhythm`
- Node build entry: `portable-vertical-rhythm/build` (do not import this in the Vite app)

### What it currently provides

- dense body/UI text at `0.75rem` with `1rem` line-height
- one heading size for actual UI section headings at `1rem` with `1.5rem` line-height
- `p-muted-heading` style treatment using semibold Ubuntu Sans, small caps, muted color
- text/form/button/panel/accordion styling
- `u-baseline-grid` utility for alignment inspection
- `initAccordions()` and `initBaselineGridToggles()` browser helpers
- Vanilla-compatible aliases for `p-button`, `p-form__*`, `p-panel__*`, `p-accordion__*`, `p-muted-heading`, and `u-baseline-grid`

### Recommended integration steps

1. Add a local dependency in `brand-layout-ops/package.json`:
  - `"portable-vertical-rhythm": "file:../portable-vertical-rhythm"`
2. Run install from `c:\Users\lyubo\work\repos\brand-layout-ops`.
3. In `apps/overlay-preview/src/main.ts`, import:
  - `import "portable-vertical-rhythm/styles.css";`
  - `import { initAccordions, initBaselineGridToggles } from "portable-vertical-rhythm";`
4. Keep the existing DOM markup where possible and let the alias layer style current Vanilla-shaped classes first.
5. Call `initAccordions()` after the panel DOM exists.
6. Only call `initBaselineGridToggles()` if the preview includes a checkbox with `.js-baseline-toggle[aria-controls]` wired to a target carrying `u-baseline-grid`.

### Migration guidance

- Start by replacing the stylesheet dependency for the preview panel surface, not the whole app.
- Remove `vanilla-framework` imports from the preview surface only when the portable package is covering that same area.
- Prefer the package's current compatibility classes first, then optionally rename markup to `vr-*` later.
- Do not import the package's Node build entry into Vite; generation stays in the package repo.

### Important behavior constraints from the package

- single-direction spacing discipline: margin-bottom only; padding-top is reserved for nudges
- borders are compensated so they do not push components off the baseline rhythm
- `hr`/rule thickness is accounted for against the next baseline unit
- anchor links inside the themed surface inherit body text sizing and line-height
- accordion tabs intentionally use body text sizing, not heading sizing

### If the next agent needs to change the package

Make changes in `c:\Users\lyubo\work\repos\portable-vertical-rhythm`, rebuild there, then return to this repo and verify the preview again. Do not fork or duplicate its CSS into `brand-layout-ops` unless explicitly requested.