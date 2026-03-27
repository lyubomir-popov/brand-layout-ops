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

## Current state (updated 2026-03-27)

**Stage 1 — Parity Rebuild** is in progress. The overlay-preview app has:

- Working Three.js halo-field renderer with 3-phase animation (dot intro → finale sweep → screensaver loop)
- Text overlay with baseline grid layout, CSV/inline content, selection, drag, resize
- Per-profile halo config factory (`createHaloFieldConfigForProfile`) with deep merge
- Fold-seam spoke fade, echo marker shapes (8 variants), slider UI controls
- Center derived from global `getOutputProfileMetrics`, not hardcoded per profile
- Preset save/load/delete/import/export via localStorage
- Shortcut parity: `W` guide toggle, `Ctrl+S` writeback, `Space`/`P` playback

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

- [ ] Guide toggle 3-state cycle
- [ ] Export pipeline (PNG, sequence, MP4)
- [ ] Logo intrinsic aspect ratio
- [ ] Full Ubuntu Summit animation as one coarse scene-family operator
- [ ] Mascot composition (face SVG, halo SVG, blink, head turn)

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