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
- Halo parity is now treated as closed for the current rebuild scope. An experimental GPU fuzzy-boids spike now exists behind `?gpuBoids=1` or `localStorage["brand-layout-ops-gpu-boids-spike"] = "1"`, and the next active work is validating that preview-to-CPU export seam while document/export authority cleanup continues.
- For architecture detail, read `docs/rebuild-plan.md`. For long-term direction, read `docs/product-roadmap.md`.

## Current state (updated 2026-03-29)

**Stage 1 — Parity Rebuild** is in progress. The cold-start facts that still matter are:

- The preview is usable for real parity work: text or logo selection, drag, resize, inline editing, guides, per-profile overlay state, source-default writeback, and the existing export path are all working.
- The real working artifact is now a local `.brand-layout-ops.json` file rather than browser-local preset state. Documents persist shared overlay metadata plus shared `project` state such as scene family, targets, `sceneFamilyConfigs`, and the saved `backgroundGraph`; operator settings already live in that document-owned project state, and the future network view is intended to sit on top of the same persisted graph rather than introduce a second model.
- Non-halo scene families (`phyllotaxis`, `fuzzy-boids`, `scatter`) now render through `apps/overlay-preview/src/scene-family-preview.ts` and are driven by operator-owned panels that write into the shared document project state.
- The halo path now carries shared mascot fade across scene passes, but the separate vignette overlay pass was removed because it caused export banding and halo parity is currently treated as closed. No further halo fidelity work is scheduled unless a concrete regression appears.
- Current-stage shell drift is now clearer: section-builder extraction is substantially complete (12 modules), but authoring interaction, export/automation, and source-default orchestration still remain concentrated in `main.ts` (4,147 lines). The next refactor targets are concrete: authoring controller, export controller, then thin composition root.
- Current-stage non-halo cleanup landed in five passes: `scene-family-preview.ts` now renders phyllotaxis, scatter, and fuzzy-boids as clean point-field layers without preview-only guide geometry, boids no longer inherit palette color or index-ramped `pscale`, inactive boid ghost dots are gone, and non-halo defaults now bias toward full-frame coverage with white point output. The fuzzy-boids VEX-faithful rewrite is complete: `stepBoids` internally converts pixel-space positions ↔ Houdini-like world coordinates via a `worldScale` bridge (px per world unit), preserving the Houdini VEX's intentional dimensional mixing so raw Houdini values work directly. Force computation mirrors the Houdini solver wrangle order — distance-normalized separation with `(1-t)^2` falloff, per-neighbor fuzzy heading correction via cross-product left/right steer plus speed matching, centroid-based cohesion with `attractToOrigin` toggle, and VEX-order semi-implicit Euler integration (`accel * mass * dt` then speed clamp then flatten z). Bounds applied post-accel-clamp as a pixel-space override. `subSteps` still mirrors Houdini Solver SOP SubSteps, but preview defaults are now intentionally tuned for interactivity (`numBoids: 50`, `subSteps: 2`) rather than strict screenshot parity, a dot-size slider now exists in the boids panel, and connected seed fields no longer hard-cap total boid count. Scatter now runs a deterministic operator-side relax/repulsion pass, so full-frame point fields distribute evenly instead of clumping around the initial random samples. An experimental WebGL2 fuzzy-boids spike now plugs into the same preview state builder and reads positions back into a CPU `PointField`, giving SVG/single-frame export a concrete translation seam without a second scene model. The GPU path is intentionally approximate, capped at 512 boids, and opt-in pending browser-side validation.
- Current-stage package drift: `operator-overlay-layout/src/index.ts` has grown to 2,215 lines — the largest package file — and needs internal decomposition into sub-modules for document normalization, bucket management, field defaults, and CSV resolution.
- `baseline-foundry` now owns most preview-shell surface styling and shell runtime in the real app as well, not just in isolated demos: the overlay preview now uses the shipped stage shell, fill-height panel shell, choice rows, option cards, tight help text, compact color input, nowrap action row, drawer overlay, and resizable pinned-aside runtime instead of local aliases or one-off shell mechanics.
- Inspector parameter rows now reuse the canonical `bf-grid` surface inside `bf-grid-scope` panel and accordion containers, so subpanel keylines resolve against the same grid contract as the parent shell instead of a separate dense control-grid surface.
- The remaining shell seam is now mostly policy rather than component/runtime implementation: the preview still decides when the inspector docks vs overlays, but the local panel toggle is now on `P` so `Tab` is free for normal form navigation again.
- The next product shift is toward a clearer authoring shell with ordered visual layers and dedicated project or export chrome instead of more inspector-local special cases.

Detailed parity gaps, audit history, deviation notes, and preview-shell extraction status live in `docs/rebuild-plan.md`.

## Current sprint TODO (active only)

**Active execution queue is in `docs/rebuild-plan.md` § "Approved Execution Queue — Active Only".**

All earlier EQ-1 through EQ-12 items are complete. The queue is now structured as three active dependency-ordered lanes plus a closed halo note:

### Lane summary

- **Halo parity — closed:** no further halo work is scheduled; the separate vignette overlay was removed because it caused export banding.
- **Lane A — GPU/export seam validation:** validate the experimental GPU fuzzy-boids path (`?gpuBoids=1`) and decide whether to productize it or keep it as research.
- **Lane B — Preview shell reduction:** Extract authoring interaction controller → extract export/automation controller → extract source-default orchestration → dead panel cleanup → `operator-overlay-layout` internal decomposition.
- **Lane C — Authoring shell (after A+B progress):** Separate playback/export/default controls → shell chrome for file actions → document vs project naming.

### Drift signals to watch

- `main.ts` is 4,147 lines — next extractions are authoring interaction (~350 lines) and export+automation (~530 lines).
- `operator-overlay-layout/src/index.ts` is 2,215 lines — needs internal decomposition into sub-modules.
- `scene-family-preview.ts` is down to 518 lines after the point-field and white-dot cleanup, but it still centralizes all non-halo family rendering and should split per family when those adapters diverge further.

### Standing rules

- **Read-only dependency** — keep `baseline-foundry` read-only from this repo unless shared shell or style work clearly belongs upstream.
- **Authoring direction** — keep steering toward ordered visual layers and dedicated project/export chrome rather than adding more inspector-local special cases.
- **Graph follow-up** — decide after current parity slice whether background preview adapter should call further into shared graph evaluation primitives.

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
| Extracted fuzzy-boids section builder | `apps/overlay-preview/src/fuzzy-boids-section.ts` |
| Extracted phyllotaxis section builder | `apps/overlay-preview/src/phyllotaxis-section.ts` |
| Extracted scatter section builder | `apps/overlay-preview/src/scatter-section.ts` |
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

Continue work in `c:\Users\lyubo\work\repos\brand-layout-ops` using `c:\Users\lyubo\work\repos\racoon-anim` as the reference app. Read `AGENTS.md`, `llm-handoff-context.md`, `docs/rebuild-plan.md`, `docs/product-roadmap.md`, and `README.md` first. Treat this handoff as the cold-start summary and `docs/rebuild-plan.md` as the canonical parity or architecture backlog. Focus on the active queue in the rebuild plan: validating the experimental `?gpuBoids=1` preview-to-CPU export seam, the remaining preview-shell extraction work, and the shift toward a clearer layer-stack authoring shell with dedicated project/export chrome. Treat halo as closed unless a concrete regression appears. Keep documents as the real working unit, keep parity-first discipline, and keep `baseline-foundry` read-only unless shared shell or style work clearly belongs upstream.