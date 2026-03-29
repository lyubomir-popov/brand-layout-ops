# Rebuild Plan

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

## Completed Phases (summary)

**Phase 1 — Lock the operator boundaries:** Done. 10 initial packages established. Spoke math kept coarse.

**Phase 2 — Runnable preview app:** Done. Document snapshot loading, graph evaluation, layout overlay, motion background, and manifest-driven parameter surfaces all working.

**Phase 3 — Layout stack port:** Done. Baseline grid, text wrapping, logo placement, CSV/inline content, selected-element interaction, grid snapping all verified against reference.

**Phase 4 — Editor interaction port:** Done. Selection, drag, resize, inline editing, shift-lock, guide toggle, style labels, text CRUD, CSV drafts with writeback staging, file-backed document workflow (open/save/save-as/duplicate/reopen), per-profile output profiles, content-format buckets, preset save/update/delete/import/export, keyboard shortcuts, and baseline-aware text-box inset all landed. Document model carries shared project metadata (scene family, targets, sceneFamilyConfigs, backgroundGraph) through the overlay-document envelope.

### Phase 5. Port the animation background as coarse operators (done)

Completed: `operator-orbits`, `operator-spokes`, coarse motion preview integration. Mascot-specific motion stays in adapter/scene-family layer until reuse is concrete. Mascot fade now multiplies through whole scene. First-pass vignette overlay landed.

### Phase 6. Verify parity (in progress)

- [x] Overlay text layout.
- [x] Baseline and composition guides.
- [ ] Overlay logo placement semantics.
- [ ] Selected-element editor behavior.
- [ ] Current animation background look.
- [ ] Export-relevant geometry consistency.
- [ ] Export workflow parity.
- [ ] Preset and source-default workflow parity.

### Phase 7. Feature work (blocked on Phase 6)

Deferred: further operatorization, Houdini digital asset ports, SVG/print backends, additional templates, stakeholder workflow, watch-folder automation.

## Deviation Log (summary)

All deviations are resolved and justified. Key patterns: motion preview was pulled forward to improve parity visibility (2026-03-26), Phase 6 was reopened after a full cross-repo audit (2026-03-27), the `portable-vertical-rhythm` and then `baseline-foundry` shell swaps landed during parity work at user request (2026-03-28), file-backed documents were prioritized over CSV polish and browser-local presets (2026-03-28), and shared document project metadata plus scatter as a full scene family both landed before all UI was exposed (2026-03-28). Detailed reasoning preserved in git history.

## Remaining Parity Gaps

Consolidated from the 2026-03-27 cross-repo audit and subsequent delta passes. DONE items removed. Only open gaps remain.

### Halo scene family — renderer and motion

| # | Gap | Status | Remaining work |
|---|-----|--------|----------------|
| 1 | Ubuntu Summit animation sequence | PARTIAL | `operator-ubuntu-summit-animation` owns phase classification, timing, mascot-box, reveal geometry, screensaver pulse, and spoke transitions. Missing: intro dot/orbit splash nuance, finale halo shrink + mascot choreography, blink/sneeze cadence, head-turn timing, radio-line detail pass. |
| 2 | Halo-field renderer | PARTIAL | Three.js rendering, phase masks, spoke width interpolation, echo rings, release labels, and screensaver pulse are implemented. Missing: reference-grade mascot-linked reveal, finale-detail passes, visual-timing polish. |
| 3 | Mascot composition | PARTIAL | Face SVG, halo SVG, white eyes, nose-bob, blink, head-turn are drawn. Missing: full reference texture-loading path, original Three.js mesh stack fidelity. Decision: keep adapter-side until reuse is concrete. |
| 4 | Vignette | PARTIAL | First-pass overlay using shared shape_fade settings. Missing: inner/outer radius, feather, choke, dither, safe-area-aware compositing. |
| 5 | Safe area fill layering | PARTIAL | `safe_area_fill_color` exists. Missing: `safe_area_fill_above_animation` toggle for render-order switching. |
| 6 | Screensaver state machine | MISSING | Continuous post-finale loop with cycle timing, ramp-in, pulse breathing, min spoke count floor, phase boundary transitions. |
| 7 | Release label finesse | PARTIAL | Rotated and upright-flipped. Missing: spacing, anchor placement, collision tuning. |

### Overlay, layout, and document

| # | Gap | Status | Remaining work |
|---|-----|--------|----------------|
| 8 | Output profiles scene ownership | PARTIAL | Per-profile overlay buckets, export settings, halo config, content-format selection all persist. Missing: profile-owned motion and mascot defaults at reference completeness. |
| 9 | Linked title-to-logo sizing | PARTIAL | Helper in `layout-engine`, normalization in `operator-overlay-layout`, UI toggle in logo panel. Missing: fully canonical document-owned normalization (still preview-driven in places). |
| 10 | Preset workflow | PARTIAL | Save/update/delete/import/export, file-backed documents, dirty-state tracking. Missing: reference-grade tabbed workflow and directory-picker export path. |
| 11 | Source-default writeback | PARTIAL | Load, reset, write, CSV flush, shared normalization. Missing: remaining orchestration still in `main.ts`. |
| 12 | Export pipeline | PARTIAL | Single PNG, PNG sequence, headless Playwright, FFmpeg MP4 encode, transparent BG — all working. Missing: final `output/{dimensions}/` workflow polish. |
| 13 | Keyboard shortcuts | PARTIAL | All major shortcuts landed. Missing: block shortcuts during future export modal. |

### Non-halo scene families

| # | Gap | Status | Remaining work |
|---|-----|--------|----------------|
| 14 | Fuzzy-boids | DONE | VEX-faithful rewrite landed: separation uses distance-normalized min/max range with quadratic falloff (matches `chramp` approximation), alignment uses per-neighbor fuzzy heading correction (cross-product left/right steer) plus per-neighbor speed matching, cohesion attracts toward flock centroid with distance-based accel (supports `attractToOrigin` toggle), integration matches VEX order (`accel * mass * dt`, speed clamp, flatten z). Old Reynolds-style steering removed. UI panel restructured to expose VEX parameter groups (separation min/max dist, align near/far threshold, cohesion min/max dist + max accel, integration min/max accel limits). |
| 15 | Scatter | PARTIAL | Renders as a clean white point-field scene family with full-frame default coverage. Missing: relax/repulsion pass for even distribution so the field stops clumping like simple random scatter. |

### Architectural note

Item 18 from the original audit (Three.js vs SVG renderer difference) is an intentional architectural choice, not a parity gap. Visual output parity is the goal, not renderer parity.

### Principled parity rules

1. Port the full Ubuntu Summit sequence into `operator-ubuntu-summit-animation` as one coarse operator before attempting finer decomposition.
2. Keep label orientation in adapters, not kernels — the operator emits spoke angle and label-slot data.
3. Keep mascot composition adapter-side until reuse is concrete.
4. Finish profile/content/preset authority before chasing fine visual polish.

## Package split status

All initial first splits complete: grid, text, overlay composition, overlay interaction, parameter surface, orbits, spokes. Mask operators remain deferred.

## Drift Signals — 2026-03-29

Active architectural risks requiring attention during the next work cycle.

| Signal | Severity | Detail |
|--------|----------|--------|
| `main.ts` at 4,147 lines | **High** | Section builders extracted, but state management (~12 CSV draft functions), presets, authoring interaction (~350 lines), export pipeline (~340 lines), and automation API (~190 lines) remain. Next extraction targets: authoring controller, export controller, source-default orchestration. |
| `operator-overlay-layout/src/index.ts` at 2,215 lines | **Medium** | Largest package file. Accumulated document normalization, bucket management, field defaults, CSV resolution, and seeded layouts. Internal decomposition into sub-modules would reduce risk without changing the package boundary. |
| `scene-family-preview.ts` at 518 lines | **Medium** | Single adapter serving phyllotaxis, fuzzy-boids, and scatter. The preview-only connective geometry and color-phasing pass are gone, but per-family rendering and simulation hookup still live in one file and should split as those adapters diverge. |
| `halo-config-section.ts` at 611 lines | **Low** | Largest section builder — 3–4× the section average. Not urgent but heading toward its own complexity problem. |

## Preview Shell Extraction — Current Status

### What is done

- Form helpers extracted to `parameter-ui/src/accordion-form-helpers.ts`.
- SVG overlay extracted to `svg-overlay-adapter.ts`.
- State-sharing protocol in `preview-app-context.ts`.
- 12 section builders extracted (halo-config, grid, playback-export, document, output-format, presets, content-format, overlay, fuzzy-boids, phyllotaxis, scatter, paragraph-styles).
- Document workspace in `document-workspace.ts`, document bridge in `preview-document-bridge.ts`.
- Halo rendering in `halo-renderer.ts`, scene-family preview in `scene-family-preview.ts`.
- The real overlay preview now consumes the canonical `baseline-foundry` surface classes for stage shell, fill-height panel shell, choice rows, option cards, tight helper text, compact color input, and nowrap action rows; the local alias layer for those patterns has been removed from `apps/overlay-preview/src/styles.css`.
- The real overlay preview now also uses shipped `baseline-foundry` drawer and pinned-aside runtime: overlay close/backdrop behavior comes from `initPanelDrawers()`, pinned resize behavior comes from `initResizableAsides()`, and the mobile shell now has a real `Controls` toggle instead of relying only on local close-state bookkeeping.
- Inspector rows in the live preview now resolve through the canonical `bf-grid` surface, with `bf-grid-scope` applied at `bf-panel__content` and `bf-accordion__panel` so local parameter sections keep the same keyline contract as the surrounding shell instead of using a separate dense control-grid abstraction.
- The inspector overlay panel now has a working internal scroll chain (`.bf-panel.is-fill` constrained inside the aside), and the local shell toggle moved off `Tab` to `P` so normal keyboard form navigation works again.

### Remaining extraction targets

1. [ ] **Authoring interaction** → dedicated controller module. Selection, drag, resize, hit testing, inline editing (~350 lines in `main.ts`).
2. [ ] **Export + automation** → dedicated controller module. Export modal, composed-frame helpers, PNG sequence, automation API (~530 lines).
3. [ ] **Source-default orchestration** → move remaining `applySourceDefaultSnapshot`, `readSourceDefaultSnapshot`, `writeCurrentAsSourceDefault` out of `main.ts`.
4. [ ] **Dead panel cleanup** → confirm `presets-section.ts` and `paragraph-styles-section.ts` are no longer referenced, then remove.
5. [ ] Goal: `main.ts` becomes a thin composition root wiring state, renderers, section registration, and controllers.

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

Concrete, dependency-ordered steps. Work top-down within each lane. Lanes are independent unless noted.

### Lane A — Halo parity (highest priority)

| Step | Task | Depends on | Exit criteria |
|------|------|------------|---------------|
| A1 | Finish `operator-ubuntu-summit-animation` scene descriptor: intro splash nuance, finale halo shrink, blink/sneeze cadence, head-turn timing | — | Operator emits the full reference sequence timing without preview-local patches |
| A2 | Halo renderer fidelity: mascot-linked reveal choreography, radio-line detail, finale pass | A1 | Reference re-check passes for halo scale zoom and release-label fold-seam |
| A3 | Screensaver state machine: post-finale continuous loop, cycle timing, pulse breathing, spoke count floor | A2 | Screensaver loop matches reference visual behavior |
| A4 | Vignette control parity: inner/outer radius, feather, choke, safe-area-aware compositing | A2 | Vignette controls match reference `draw_vignette_overlay` |
| A5 | Safe-area fill layering: `safe_area_fill_above_animation` render-order toggle | A2 | Fill order matches reference behavior; enters through a layer-stack-friendly seam |

### Lane B — Non-halo scene-family fidelity

| Step | Task | Depends on | Exit criteria |
|------|------|------------|---------------|
| B1 | ~~Fuzzy-boids Houdini/VEX parity audit~~ | — | **DONE.** VEX-faithful rewrite: distance-normalized separation with quadratic falloff, fuzzy heading+speed alignment, centroid cohesion, VEX-order semi-implicit Euler integration. `chramp` approximated as `(1-t)^2`. `subSteps` mirrors Houdini Solver SOP SubSteps. World-space coordinate conversion inside `stepBoids` preserves Houdini's intentional dimensional mixing — raw Houdini parameter values work directly via `worldScale` (px-per-world-unit) bridge. Follow-up interactivity polish also landed: topology-only preview resets, structural-only sim cache keys, one-frame post-reset cap, zero-allocation top-k neighbor selection, dot-size slider, interactive preview defaults (`numBoids: 50`, `subSteps: 2`), and seed fields no longer hard-cap total boid count. |
| B2 | Scatter relax/repulsion pass | — | Points distribute evenly across the full frame without centered clumping |

### Lane C — Preview shell concentration reduction

| Step | Task | Depends on | Exit criteria |
|------|------|------------|---------------|
| C1 | Extract authoring interaction controller from `main.ts` (selection, drag, resize, hit-test, inline editing) | — | ~350 lines out of `main.ts`, same `ctx` pattern as section builders |
| C2 | Extract export + automation controller from `main.ts` (export modal, PNG sequence, automation API) | — | ~530 lines out of `main.ts` |
| C3 | Extract source-default orchestration (apply, read, write) from `main.ts` into bridge/controller seam | C1 | Source-default I/O no longer mixed with composition root |
| C4 | Remove dead panel modules (`presets-section.ts`, `paragraph-styles-section.ts`) after confirming no references | C1 | Clean module inventory |
| C5 | `operator-overlay-layout/src/index.ts` internal decomposition — split into document normalization, bucket management, field defaults, CSV resolution sub-modules | — | Package index under 500 lines, internals well-bounded |

### Lane D — Authoring shell direction (lower priority, after A+C progress)

| Step | Task | Depends on | Exit criteria |
|------|------|------------|---------------|
| D1 | Separate playback, export, and authored-default controls into distinct action groups | C2 | No mixed control cluster for play/export/set-default |
| D2 | Move app-level file actions (new/open/save/duplicate) toward dedicated shell chrome | C3 | File operations are distinct from operator parameter panels |
| D3 | Decide document vs project naming for `.brand-layout-ops.json` UX | D2 | Clear user-facing working-unit label |

### Completed queue snapshot

- EQ-1 through EQ-12 are complete.
- Key completed milestones: baseline-foundry shell swap, operator selector, operator-owned fuzzy-boids/phyllotaxis/scatter panels, document-owned scene-family configs, persisted background graph, and the list-first network view.
- Pre-B cleanup landed: `scene-family-preview.ts` now renders non-halo families as point-field-only layers without preview guide or connective geometry, and the follow-up source cleanup removed palette-driven boid phasing while moving non-halo defaults toward full-frame white-point output.
- The downstream shell cleanup pass is materially complete for both surface classes and baseline shell runtime; remaining preview-shell debt is concentrated in dock-mode policy and other higher-level controllers rather than local alias CSS.
- Use git history for audit detail instead of expanding the live plan.

### Reference re-checks

- [ ] Halo scale zoom coverage
- [ ] Release label fold-seam overlap

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