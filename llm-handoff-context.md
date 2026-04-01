# LLM Handoff Context

> **Single cold-start document.** Read this first in any new chat session.
> Active plan and parity audit → `docs/TODO.md`.
> Long-term vision → `docs/product-roadmap.md`.
> Completed work archive → `docs/history.md`.
> Agent discipline rules → `AGENTS.md`.
> Inbox for async notes → `docs/AGENT-INBOX.md`.

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

- The rebuild has a usable overlay editor and shared package-backed control surface. Stage 1 parity is now complete: overlay text, logo placement, selected-element editing, preset workflow, export pipeline, and the export-relevant geometry screenshot pass all match the current reference closely enough to treat parity as closed.
- A first-pass local document workflow now exists, so authored text, placement, logo state, scene configuration, and preset variants can be saved and reopened as real local project files instead of living only in browser storage.
- Recent-document reopen is now wired through stored file handles, preview documents now persist the shared overlay document metadata/state envelope plus shared project metadata for scene-family selection, document targets, and non-halo scene-family configs, preview-local document workspace orchestration now lives in `apps/overlay-preview/src/document-workspace.ts`, preview-side snapshot or apply plumbing now lives in `apps/overlay-preview/src/preview-document-bridge.ts`, the Output Format panel now edits scene family plus add or delete document sizes against that shared schema, non-halo scene families now render through `apps/overlay-preview/src/scene-family-preview.ts`, and source-default authoring now round-trips that shared overlay-document envelope while still reading older raw snapshot files.
- Product direction is now explicit: documents, not browser presets, are the real unit of work, and a document should eventually own the swappable scene-family or background operator stack, output target sizes, and exportable state while CSV remains a secondary import path.
- The next architectural shift is toward a clearer authoring environment: ordered visual layers instead of one-off safe-area or overlay passes, plus shell-level project actions that live in dedicated navigation rather than inside an ever-growing inspector.
- Halo parity is now treated as closed for the current rebuild scope. The experimental GPU fuzzy-boids spike remains available behind `?gpuBoids=1` or `localStorage["brand-layout-ops-gpu-boids-spike"] = "1"`, but B1 validation kept it in research-only opt-in mode instead of the default preview backend.
- For architecture detail, read `docs/TODO.md`. For long-term direction, read `docs/product-roadmap.md`.

## Current state (updated 2026-04-01)

**Stage 1 — Parity Rebuild** is substantially complete. The cold-start facts that still matter are:

- The preview is usable for real parity work: text or logo selection, drag, resize, inline editing, guides, per-profile overlay state, source-default writeback, and the existing export path are all working.
- The real working artifact is now a local `.brand-layout-ops.json` file rather than browser-local preset state. Documents persist shared overlay metadata plus shared `project` state such as scene family, targets, `sceneFamilyConfigs`, and the saved `backgroundGraph`; non-halo preview execution evaluates that saved graph through preview-runtime operator definitions backed by the shared graph runtime. `sceneFamilyConfigs` is no longer a second live authority — per-edit mirroring is removed, section panels read graph nodes directly, and configs only update at family-switch boundaries. The saved document still serializes both for backward compatibility; a future cleanup can drop `sceneFamilyConfigs` from the envelope once all consumers use graph nodes. Chromium file save/open currently uses a `.json` picker filter for compatibility while suggested filenames still use `.brand-layout-ops.json`, and the later user retest showed the observed Chrome failure was profile-specific rather than a current repo regression.
- Non-halo scene families (`phyllotaxis`, `fuzzy-boids`, `scatter`) now render through `apps/overlay-preview/src/scene-family-preview.ts` and are driven by operator-owned panels that write into the shared document project state.
- The halo path now carries shared mascot fade across scene passes, but the separate vignette overlay pass was removed because it caused export banding and halo parity is currently treated as closed. No further halo fidelity work is scheduled unless a concrete regression appears.
- Current-stage shell drift is now clearer: section-builder extraction is substantially complete (13 builders, with the old content-format accordion no longer registered in the live inspector), authoring interaction is in `authoring-controller.ts`, export automation is in `export-controller.ts`, source-default orchestration is in `source-default-controller.ts`, CSV draft staging/flushing is in `csv-draft-controller.ts`, playback loop is in `playback-controller.ts`, selected-element editing is in `overlay-editing-controller.ts`, inspector section registry plus config-editor rebuild logic are in `config-editor-controller.ts`, document size target CRUD plus Output Format subpanel rebuilding are in `document-target-controller.ts`, preset lifecycle is in `preset-controller.ts`, per-profile bucket and content-format switching are in `profile-state-controller.ts`, preview-document build/apply/reset flows are in `preview-document-state-controller.ts`, background-node selection plus graph rebuild sync are in `background-graph-controller.ts`, stage rendering and background composition are in `stage-render-controller.ts`, shell bootstrap and workspace chrome are in `preview-shell-controller.ts`, and `main.ts` is down to ~833 lines. The live inspector now renders a dedicated `Workspace` rail above a separate `Parameters` rail, uses one selected-operator state for overlay-layout plus saved background nodes, and shows only the selected operator surface in the parameter pane. The live shell now uses the canonical `bf-theme is-dark` root plus canonical application overlay/resize-handle classes, the old `.mascot-app`, `.stage*`, `.preview-*`, `.operator-selector*`, and `[data-*]` style contracts are gone from source, and the desktop/mobile shell behavior was re-validated with a Playwright smoke pass after fixing the initial mobile drawer-open regression. All four operator section panels (halo-config, phyllotaxis, scatter, fuzzy-boids) are now schema-driven via `renderSchemaPanel`. Halo config merge helpers (`getHaloConfigForProfile`, `mergeHaloConfigWithBaseConfig`) live in `operator-halo-field`, not `main.ts`. The remaining concentration is DOM query helpers and final controller/bootstrap composition.
- Current-stage non-halo cleanup landed in five passes: `scene-family-preview.ts` now renders phyllotaxis, scatter, and fuzzy-boids as clean point-field layers without preview-only guide geometry, boids no longer inherit palette color or index-ramped `pscale`, inactive boid ghost dots are gone, and non-halo defaults now bias toward full-frame coverage with white point output. The fuzzy-boids VEX-faithful rewrite is complete: `stepBoids` internally converts pixel-space positions ↔ Houdini-like world coordinates via a `worldScale` bridge (px per world unit), preserving the Houdini VEX's intentional dimensional mixing so raw Houdini values work directly. Force computation mirrors the Houdini solver wrangle order — distance-normalized separation with `(1-t)^2` falloff, per-neighbor fuzzy heading correction via cross-product left/right steer plus speed matching, centroid-based cohesion with `attractToOrigin` toggle, and VEX-order semi-implicit Euler integration (`accel * mass * dt` then speed clamp then flatten z). Bounds applied post-accel-clamp as a pixel-space override. CPU neighbor lookup now runs through a uniform-grid spatial partition, authored boid configs now clamp to the paper-style `6–24` local-neighbor range instead of allowing whole-flock mode, and high-density preview runs (`>=1200` boids) now force a single preview substep so 2k-point playback stays closer to mobile frame budgets. On this machine the cached preview path for `2000` boids at `12` neighbors averaged about `16 ms` per frame at one substep and about `31 ms` at two substeps, which is why the preview-only cap exists. Scatter now runs a deterministic operator-side relax/repulsion pass, so full-frame point fields distribute evenly instead of clumping around the initial random samples. Non-halo backgrounds no longer share the halo text overlay canvas: the preview now has dedicated 2D and GPU scene-family canvases, and the experimental WebGL2 fuzzy-boids spike can render directly to its own visible canvas without `readPixels` in the live preview loop. The shader loop bound was raised to 8192, and the hard boid cap was removed (limited only by `gl.MAX_TEXTURE_SIZE`), but B1 validation showed a visible export mismatch versus the CPU path at `instagram_1080x1350` and `t=3s` (about `2.76%` of pixels differed, mainly dot radius), so the GPU spike remains explicit opt-in instead of the default backend. CPU snapshot readback remains deferred to explicit output resolution.
- Current-stage package drift: `operator-overlay-layout/src/index.ts` is now 262 lines (decomposed into `document-schema.ts`, `background-graph.ts`, `field-defaults.ts`, `csv-resolution.ts`, `overlay-internals.ts`). Barrel re-exports only.
- Export pipeline now uses auto-versioned directory naming: single PNG exports to `output/{dims}/{name}-v{n}.png` via File System Access API, preset exports to `presets/{dims}/v{major}.{minor}-{slug}.json`. Both fall back to blob download when the directory picker is unavailable or cancelled. Export automation can now also round-trip a full persisted preview document (`preview_document`) so validation runs no longer depend on stray browser state.
- The authored source-default document in `apps/overlay-preview/public/assets/source-default-config.json` was refreshed for the instagram buckets during the final parity pass, and halo transparent exports now honor `transparentBackground` in the Three renderer instead of baking the halo background into the stage canvas.
- `baseline-foundry` now owns most preview-shell surface styling and shell runtime in the real app as well, not just in isolated demos: the overlay preview now uses the shipped stage shell, fill-height panel shell, choice rows, option cards, tight help text, compact color input, nowrap action row, drawer overlay, and resizable pinned-aside runtime instead of local aliases or one-off shell mechanics. A latest-release panel pressure test also closed the remaining downstream class-contract drift: overlay-preview and `parameter-ui` no longer emit hybrid names like `bf-panel__content`, `bf-accordion__tab`, `bf-form__label`, or `bf-button--base`, the live inspector now renders credibly against current `baseline-foundry` without relying on stale selector compatibility, and `apps/overlay-preview/vite.config.ts` now allow-lists the sibling `baseline-foundry` repo so the dev preview can load the shipped IBM Plex fonts during swap testing.
- Inspector parameter rows now reuse the canonical `bf-grid` surface inside `bf-grid-scope` panel and accordion containers, so subpanel keylines resolve against the same grid contract as the parent shell instead of a separate dense control-grid surface.
- Shell runtime is now controllerized in `preview-shell-controller.ts`: the preview delegates document workspace UI, file toolbar wiring, drawer open/close behavior, docked resize bootstrap, keyboard shortcuts, and init sequencing there. The remaining seam is less about shell mechanics and more about higher-level profile/document state orchestration; the local panel toggle is still on `P` so `Tab` is free for normal form navigation again.
- Export composition is now routed through the extracted export controller instead of inline `main.ts` helpers. Single-frame PNG export, PNG sequence export, and `window.__layoutOpsAutomation` now share the same composed-frame path, and a Playwright smoke export against the fuzzy-boids scene family produced populated non-halo PNGs after the dedicated scene-preview canvas split.
- The next product shift is toward a clearer authoring shell with ordered visual layers and dedicated project or export chrome instead of more inspector-local special cases.

Detailed parity gaps, deviation notes, and preview-shell extraction status live in `docs/TODO.md`. Completed work is in `docs/history.md`.

## Current sprint TODO (active only)

**Active execution queue is in `docs/TODO.md` § "Approved Execution Queue — Active Only".**

All earlier EQ-1 through EQ-12 items are complete. The parity queue is closed.

### Lane summary

- **Lane A — Background graph authority:** Complete (A1–A3). Non-halo preview execution uses shared graph-runtime semantics, operator parameter schema covers all field kinds. All four operator section panels (phyllotaxis, scatter, fuzzy-boids, halo-config) are schema-driven via `renderSchemaPanel`. Halo config merge helpers (`getHaloConfigForProfile`, `mergeHaloConfigWithBaseConfig`) have been extracted from `main.ts` into `operator-halo-field`.
- **Halo parity — closed:** no further halo work is scheduled.
- **Lane B — GPU/export seam validation:** Complete. Validation kept the experimental GPU fuzzy-boids path in research-only opt-in mode instead of the default backend.
- **Lane C — Preview shell reduction:** Complete (C1–C5). `main.ts` is ~833 lines after the stage-render, preview-shell, profile-state, preview-document-state, and background-graph controller splits. `operator-overlay-layout/src/index.ts` is 262 lines (decomposed into 6 sub-modules).
- **Lane D — Authoring shell:** Complete (D1–D3). Playback, export, and source-default controls are now in separate accordion sections. File actions (New/Open/Save/Save As/Duplicate) moved from the Document accordion to a toolbar in the `bf-panel-header`. "Document" confirmed as the user-facing working-unit label.

### Active queue

No approved execution lane is currently open. Unless the user promotes a new queue item, treat the repo as caught up through the selected-operator lane, the shell-compliance lane, and the carried halo verification pass.

### Non-blocking follow-ups

No non-blocking follow-ups are currently carried. The halo scale and release-label seam spot checks were re-verified against automation exports on 2026-04-01.

### Drift signals to watch

- `main.ts` is ~833 lines — authoring, export, source-default, CSV draft, playback, overlay editing, config-editor rebuild logic, document target CRUD, preset lifecycle, profile/content switching, preview-document build/apply/reset flows, background-graph selection/sync, stage rendering/composition, and shell bootstrap/workspace chrome are extracted, with halo config merge helpers moved to `operator-halo-field`; remaining concentration is DOM query helpers, overlay-visibility shell glue, and final composition/bootstrap wiring.
- `project.backgroundGraph` vs `sceneFamilyConfigs` — per-edit mirroring is removed and configs only update at family-switch boundaries. Remaining: the saved document still serializes both; consider dropping configs from the envelope once all consumers use graph nodes.
- `operator-overlay-layout/src/index.ts` is 262 lines (decomposed into 6 sub-modules) — **resolved**.
- `scene-family-preview.ts` is ~724 lines — cleanup should follow remaining parity work, not a file split for its own sake.

### Standing rules

- **Read-only dependency** — keep `baseline-foundry` read-only from this repo unless shared shell or style work clearly belongs upstream.
- **Authoring direction** — keep steering toward ordered visual layers and dedicated project/export chrome rather than adding more inspector-local special cases.
- **Background graph authority** — `backgroundGraph` is the live background execution model. `sceneFamilyConfigs` only updates at family-switch boundaries and backward-compat automation apply. Do not re-introduce per-edit mirroring.
- **Shell contract discipline** — do not re-introduce local shell class contracts or `[data-*]` style selectors in overlay-preview.

## Key file map

| Purpose | File |
|---------|------|
| Output profiles, types | `packages/core-types/src/index.ts` |
| Halo config + per-profile overrides | `packages/operator-halo-field/src/index.ts` |
| App state, UI, profile switching | `apps/overlay-preview/src/main.ts` |
| Extracted background graph controller | `apps/overlay-preview/src/background-graph-controller.ts` |
| Extracted stage render controller | `apps/overlay-preview/src/stage-render-controller.ts` |
| Extracted preview shell controller | `apps/overlay-preview/src/preview-shell-controller.ts` |
| Extracted authoring interaction controller | `apps/overlay-preview/src/authoring-controller.ts` |
| Extracted export + automation controller | `apps/overlay-preview/src/export-controller.ts` |
| Extracted source-default controller | `apps/overlay-preview/src/source-default-controller.ts` |
| State-sharing protocol for section builder extraction | `apps/overlay-preview/src/preview-app-context.ts` |
| Extracted halo-config section builder | `apps/overlay-preview/src/halo-config-section.ts` |
| Extracted layout-grid section builder | `apps/overlay-preview/src/grid-section.ts` |
| Extracted playback section builder | `apps/overlay-preview/src/playback-section.ts` |
| Extracted export section builder | `apps/overlay-preview/src/export-section.ts` |
| Extracted source-default section builder | `apps/overlay-preview/src/source-default-section.ts` |
| Extracted CSV draft controller | `apps/overlay-preview/src/csv-draft-controller.ts` |
| Extracted playback controller | `apps/overlay-preview/src/playback-controller.ts` |
| Extracted overlay editing controller | `apps/overlay-preview/src/overlay-editing-controller.ts` |
| Extracted config editor controller | `apps/overlay-preview/src/config-editor-controller.ts` |
| Extracted document target controller | `apps/overlay-preview/src/document-target-controller.ts` |
| Extracted preset controller | `apps/overlay-preview/src/preset-controller.ts` |
| Extracted profile state controller | `apps/overlay-preview/src/profile-state-controller.ts` |
| Extracted preview document state controller | `apps/overlay-preview/src/preview-document-state-controller.ts` |
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
| Schema→DOM panel renderer | `packages/parameter-ui/src/schema-renderer.ts` |
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

Continue work in `c:\Users\lyubo\work\repos\brand-layout-ops` using `c:\Users\lyubo\work\repos\racoon-anim` as the reference app. Read `AGENTS.md`, `llm-handoff-context.md`, `docs/TODO.md`, `docs/product-roadmap.md`, and `README.md` first. Treat this handoff as the cold-start summary and `docs/TODO.md` as the canonical architecture backlog. Stage 1 parity, the selected-operator pane lane, and the baseline-foundry shell-compliance lane are now complete. Unless the user promotes a new queue item, limit further work to optional follow-ups such as halo zoom coverage or release-label fold-seam overlap, and keep documents as the real working unit with `backgroundGraph` authoritative for background execution. Keep `baseline-foundry` read-only unless shared shell or style work clearly belongs upstream.