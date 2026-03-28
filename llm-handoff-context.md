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

## Current state (updated 2026-03-28)

**Stage 1 — Parity Rebuild** is in progress. The overlay-preview app has:

- Working Three.js halo-field renderer with 3-phase animation (dot intro → finale sweep → screensaver loop)
- Text overlay with baseline grid layout, CSV/inline content, selection, drag, resize
- Per-profile halo config factory (`createHaloFieldConfigForProfile`) with deep merge
- Fold-seam spoke fade, echo marker shapes (8 variants), full echo detail controls
- Center derived from global `getOutputProfileMetrics`, not hardcoded per profile
- Preset save/load/delete/import/export via localStorage with editable name field
- Shortcut parity: `W` guide toggle, `Ctrl+S` writeback, `Space`/`P` playback
- PNG sequence export with frame-range modal + File System Access directory picker
- `window.__layoutOpsAutomation` API for headless Playwright export (ready/getState/applySnapshot/exportFrame)
- Headless PNG exporter (`scripts/export-headless.ts`) + FFmpeg MP4 encoder (`scripts/encode-mp4.ts`)
- Logo intrinsic aspect ratio loading via `Image.naturalWidth/naturalHeight`
- Column gutter, safe area override inputs, release label and screensaver pulse controls
- Per-profile defaults: safe area, grid, font sizes, halo center Y offset
- Canvas scale-to-fit with `--stage-aspect-ratio` CSS variable (supports portrait/landscape)
- Accordion mutual exclusion (one open section at a time)
- Text north-corner resize now snaps vertically on the baseline grid instead of discarding vertical drag
- CSV content resolution now matches overlay fields by format aliases and legacy slots, not only exact field IDs
- Pending CSV drafts now survive output-profile and content-format switches instead of being discarded globally
- Selected text controls now expose direct style assignment plus font size, line height, and weight editing for the active style
- Export settings now persist per output profile inside preview state, source-default snapshots, and preset payloads instead of resetting on every profile switch
- Halo config now persists per output profile inside preview state, source-default snapshots, and preset payloads instead of regenerating from defaults on every profile switch
- CSV authoring UI now shows row status, alias-based field mapping, and per-field staged-versus-applied values for the active format
- `operator-ubuntu-summit-animation` now computes scene phase, runtime timing, loop timing, and mascot-box metadata, and the preview plus automation state now consume that descriptor path
- Linked title-to-logo sizing now normalizes through shared preview-state params, so profile switches and loaded snapshots keep the A Head/logo lock intact

## Current sprint TODO (do in order)

### A. Per-profile document defaults

- [x] **Fix safe area values** (`core-types/src/index.ts` — data fix)
  - instagram: `{0,0,0,0}`, screen: `{24,24,24,24}`, tablet: `{250,65,250,65}`

- [x] **Per-profile grid defaults** (`sample-document.ts` — `PROFILE_GRID_DEFAULTS` table + `getDefaultGridForProfile`)

- [x] **Per-profile halo center Y offset** (`operator-halo-field/src/index.ts` — `center_offset_y_px` in composition overrides)
  - landscape: -26, instagram: -121, story: -156, screen: +82, tablet: 0

- [x] **Per-profile font sizes** (`sample-document.ts` — `PROFILE_TEXT_STYLE_OVERRIDES` table + `getTextStylesForProfile`)

### B. UI organization

- [x] **Accordion UI** for top sections (Playback & Export, Output Format, Presets)
- [x] **UI audit report** — `docs/ui-audit.md` (136 controls catalogued, 37% implemented, 57% missing)

### C. Remaining parity (see `docs/rebuild-plan.md` gap audit)

- [x] Guide toggle 3-state cycle (already implemented: off → composition → baseline, `W`/`G` keys)
- [x] Export pipeline — single PNG ✅, PNG sequence with modal ✅ (MP4 needs server-side FFmpeg — deferred)
- [x] Logo intrinsic aspect ratio (loads via `Image`, uses `naturalWidth`/`naturalHeight`)
- [ ] Full Ubuntu Summit animation as one coarse scene-family operator
- [ ] Mascot composition (face SVG, halo SVG, blink, head turn) — **deprioritized**

### E. Export pipeline & headless Playwright (priority)

- [x] `window.__layoutOpsAutomation` API for headless frame export (matches reference `__mascotAutomation` pattern)
- [x] `scripts/export-headless.ts` — Playwright headless PNG sequence export (rewrites old DOM-manipulation approach)
- [x] `scripts/encode-mp4.ts` — FFmpeg PNG→MP4 encoder (libx264, CRF 10/14, yuv444p/yuv420p, slow preset, -tune animation, bt709)
- [x] PNG sequence export via File System Access API (`showDirectoryPicker`, fallback to download links)
- [x] Verify end-to-end: `npm run export:headless` → `npm run export:encode-mp4` → MP4 (48-frame, 2-second headless export verified at 1080x1350; local FFmpeg install required on Windows)

### F. Bug fixes from user notes

- [x] Canvas not true to size / not scrollable — scale to fit via `--stage-aspect-ratio` CSS variable
- [x] Accordion shouldn't change when clicking inside — mutual exclusion on open, no close-on-content-click
- [x] Show overlay checkbox in wrong place — moved to grid accordion section
- [x] Text resize bug — north-corner text resize now preserves vertical snapping instead of collapsing the top edge toward the safe area

### G. After current parity priorities

- [ ] Incrementally switch the preview control surface from Vanilla to the local `portable-vertical-rhythm` micro-framework once the active parity task list above is complete
  - Use the sibling repo package as a local dependency, not copied source
  - Keep this behind the current parity work; do not let the UI-library swap displace export, content, profile, or authoring parity

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
| Default overlay/text params | `apps/overlay-preview/src/sample-document.ts` |
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

Continue parity work in `c:\Users\lyubo\work\repos\brand-layout-ops` using `c:\Users\lyubo\work\repos\racoon-anim` as the reference app. Read `docs/rebuild-plan.md`, `llm-handoff-context.md`, and `README.md` first. Then inspect the real parity-gap sources in the reference repo: `src/app/config-schema.js`, `default-config-source.js`, `editor-constants.js`, `index.js`, `rendering.js`, `halo-field.js`, plus `assets/content.csv`, `assets/content-speaker-highlight.csv`, `assets/UbuntuTagLogo.svg`, `assets/racoon-mascot-face.svg`, and `assets/racoon-mascot-halo.svg`. Compare those against `apps/overlay-preview/src/main.ts`, `apps/overlay-preview/src/sample-document.ts`, `apps/overlay-preview/src/sample-motion.ts`, `packages/operator-overlay-layout/src/index.ts`, `packages/layout-engine/src/index.ts`, `packages/operator-orbits/src/index.ts`, and `packages/operator-spokes/src/index.ts`. Use `docs/rebuild-plan.md` as the source of truth, update it as you work, keep docs in sync, and stay parity-first instead of starting new features.

## Open Questions To Discuss Later

- Should the new repo eventually bring back an explicit content-format abstraction like the old app had, or should it stay with document-authored `contentFieldId` mappings plus operator schemas unless reuse pressure becomes concrete?
- Should logo intrinsic aspect-ratio loading and title-linked logo scaling stay outside the kernel as document or adapter preprocessing, or do we eventually want a coarse operator-side logo source model for that too?
- Presets in browser localStorage is not a great feature — need to save them locally. Presets are essentially alternative designs for same document sizes like instagram stories.
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