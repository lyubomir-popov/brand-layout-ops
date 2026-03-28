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

## Where To Inspect Open Parity Gaps

Use this map before changing code so parity work stays anchored to the reference behavior.

- Output profiles, presets, content formats, and source-default persistence:
	- Reference repo: `c:\Users\lyubo\work\repos\racoon-anim\src\app\config-schema.js`, `default-config-source.js`, `editor-constants.js`, `index.js`
	- Current repo: `apps/overlay-preview/src/main.ts`, `apps/overlay-preview/src/sample-document.ts`
- Motion look, halo-field masks, mascot composition, and guide geometry:
	- Reference repo: `c:\Users\lyubo\work\repos\racoon-anim\src\app\rendering.js`, `halo-field.js`
	- Current repo: `apps/overlay-preview/src/main.ts`, `apps/overlay-preview/src/sample-motion.ts`, `packages/operator-orbits/src/index.ts`, `packages/operator-spokes/src/index.ts`
- Seed content, field mapping, logo assets, and mascot assets:
	- Reference repo: `c:\Users\lyubo\work\repos\racoon-anim\assets\content.csv`, `content-speaker-highlight.csv`, `UbuntuTagLogo.svg`, `racoon-mascot-face.svg`, `racoon-mascot-halo.svg`
	- Current repo: `apps/overlay-preview/src/sample-document.ts`, `apps/overlay-preview/public/assets/`
- Layout or export geometry questions:
	- Reference repo: `c:\Users\lyubo\work\repos\racoon-anim\src\app\rendering.js`
	- Current repo: `packages/operator-overlay-layout/src/index.ts`, `packages/layout-engine/src/index.ts`

If the gap is visual, run both apps and compare screenshots before editing.

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
- [x] Guide toggle shortcut parity.
- [x] Style-based labels in the selected-element editor.
- [x] Resize handles for text fields with snapping to grid field widths and baselines.
- [ ] CSV draft editing and source writeback staging at parity quality.
	Current repo now preserves pending CSV drafts per profile and format bucket while switching, and the editor surfaces alias-based field mapping plus staged-versus-applied field values for the active format, but it still lacks fully reference-grade field-level pending-edit semantics and any final source-default writeback polish for format-scoped CSV content.
- [x] Baseline guide showing at first baseline of text field, to aid alignment across columns.
- [x] Text-box inset parity: text fields now clamp their first baseline to an ascent-aware minimum offset so the first line stays visibly inside the field bounds while remaining baseline-grid aligned.
- [ ] Output-profile parity: named screen sizes, seeded safe areas, and reference frame-rate defaults.
- [ ] Overlay content-format parity: `generic_social` and `speaker_highlight` field buckets with alias-based CSV matching.
- [ ] Selected-element authoring parity: add text blocks, style assignment, and richer selected-item controls.
- [x] Preset workflow parity: save, update, delete, import, and export presets.
- [x] Shortcut parity: `W` guide toggle, `Ctrl`/`Cmd+S` source-default writeback, `Space` or `P` playback toggle, and inline-editor commit semantics.

### Phase 5. Port the animation background as coarse operators

Use larger passes, not tiny ones.

- [x] `operator-orbits`.
- [x] `operator-spokes`.
- [x] Integrate coarse motion preview into the preview shell.
- [ ] Add one coarse `operator-ubuntu-summit-animation` scene-family operator as the parity-first home for the entire reference sequence: mascot, head shake, blink, dot splash, spokes, radio lines, Ubuntu release labels, construction lines, finale, and screensaver loop.
- [ ] Match the current animation background look closely enough for parity signoff.
- [x] Decide whether mascot-specific motion stays in an adapter or becomes a coarse scene-family operator.
- [ ] Halo-field parity: phase masks, spoke-width transitions, screensaver pulsing, and mascot face or halo composition.

The mascot head shake is probably too specific to deserve its own operator.

If it remains unique to one scene family, keep it as part of a mascot animation operator or preview adapter.

Decision so far:

- keep mascot-specific face or head motion in an adapter or scene-family layer until reuse becomes concrete
- parity signoff basis for the current motion background: the preview now reproduces the main coarse visual motifs from the reference app at the adapter level: central aura, dual phase lobes, echo rings, orbit structure, and phase-biased spoke density, without widening the kernel too early
- updated 2026-03-27: the next parity pass should port the entire Ubuntu Summit animation wholesale into one coarse scene-family operator before attempting finer decomposition. Reuse can be evaluated after parity.

### Phase 6. Verify parity here

Before adding features, verify that the new repo reproduces the current app's working behaviors.

- [x] Overlay text layout.
- [ ] Overlay logo placement semantics.
- [x] Baseline and composition guides.
- [ ] Selected-element editor behavior.
- [ ] Current animation background look.
- [ ] Export-relevant geometry consistency.
- [ ] Export workflow parity: current-frame stills, frame sequences, video export, and transparent-background handling.
- [ ] Preset and source-default workflow parity: reference-style editor persistence and source writeback.

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
- [x] 2026-03-27: Phase 6 parity signoff was reopened after a full reference-repo audit and screenshot comparison.
	Reason: the new repo has coarse parity on several kernels, but the reference app still leads on output profiles, presets and exports, source-backed content formats, style-aware authoring, logo asset semantics, and the halo-field render stack.
- [x] 2026-03-27: Full cross-repo parity audit added to this file (18 gap categories).
	Reason: systematic line-by-line comparison of config-schema.js, default-config-source.js, editor-constants.js, index.js, rendering.js, and halo-field.js against the current brand-layout-ops implementation. Gaps categorized as critical (5), high (7), medium (4), and low (2).
- [x] 2026-03-27: Audit delta recorded after the interaction-layer rebuild and current-repo scaffold expansion.
	Reason: the repo is no longer at the same state as the first 18-gap audit. Output-profile scaffolding, content-format specs, 3 text styles, linked title-size helper logic, preset localStorage scaffolding, stronger guides, and direct authoring interactions now exist, so the remaining parity work is narrower and more architectural than the original snapshot suggests.

## Parity Gap Audit — 2026-03-27

Full cross-repo audit comparing `brand-layout-ops` against `racoon-anim` reference app.
Each gap is categorized by severity and roughly ordered by dependency priority.

### Critical — must land before any visual comparison is meaningful

1. **Output profiles (PARTIAL).**
	Reference has 5 named profiles with per-profile center, scale, safe area, frame rate, grid, text, logo, motion, and mascot configs. Global shared paths (colors, title, logo asset, content format) propagate across profiles.
	Profiles: `landscape_1280x720`, `instagram_1080x1350`, `story_1080x1920` (default), `screen_3840x2160`, `tablet_2560x1600`.
	Current repo now has profile switching, per-profile overlay buckets, per-profile export settings, and per-profile halo config persistence in preview state, source-default snapshots, and presets, but it still lacks full profile-owned motion, mascot, and complete source-default scene trees matching the reference app.
	Reference files: `config-schema.js` (`OUTPUT_PROFILES`, `get_output_profile_metrics`), `default-config-source.js` (per-profile full configs), `index.js` (profile architecture init, profile tab UI).

2. **Content format system (PARTIAL).**
	Reference has 2 overlay content formats: `generic_social` (3 fields: body_intro, detail_primary, detail_secondary) and `speaker_highlight` (3 fields: session_title, speaker_name, speaker_role). Each field has id, label, style, legacy_slot, and aliases for CSV column matching. Per-format field layout overrides (keyline_index, column_span, y_row_index, y_offset_baselines) are stored in format buckets per profile. Format switching syncs runtime fields to/from the active format bucket.
	Current repo now has format specs, per-format buckets, and operator-side CSV alias matching, but still lacks reference-grade source-default bucket writeback and per-format pending CSV edit staging.
	Reference files: `config-schema.js` (format specs, alias matching, format bucket sync), `default-config-source.js` (per-profile overlay_content_formats).

3. **Text style parity (DONE).**
	Reference has 3 distinct styles: `title` (A Head, 42px/48px, weight 200), `b_head` (B Head, 24px/32px, weight 400), `paragraph` (P, 24px/32px, weight 400). Current repo now has all 3 styles with per-profile font size overrides and display labels (`TEXT_STYLE_DISPLAY_LABELS`).

4. **Linked title-to-logo sizing (MISSING).**
	`link_title_size_to_logo_height = true` scales title font size proportionally to `overlay_logo.height_px` using `LINKED_TITLE_BASE_FONT_SIZE_PX = 63` as the reference base. Current repo has no linked sizing logic.
	Reference files: `rendering.js` (linked title font size calculation in text rendering).
	Update 2026-03-27 late pass: a preview-side helper now exists, but this still remains a critical parity item because the rule must become canonical document/layout behavior rather than an editor-only convenience.

5. **Logo asset sizing and aspect ratio (DONE).**
	Logo image is loaded via `Image`, `naturalWidth`/`naturalHeight` read for dynamic aspect ratio. Width derived from configured height via `getCurrentLogoAspectRatio()`. Logo drag and resize with aspect-ratio lock on corner handles.

### High — required for editor and workflow parity

6. **Style-based labels in selected-element editor (DONE).**
	`getOverlayFieldDisplayLabel` produces "A Head", "B Head 1", "P 2" etc. with ordinal counting when multiple fields share a style. Logo is "Selected Logo". Uses `TEXT_STYLE_DISPLAY_LABELS` map from `sample-document.ts`.

7. **Selected-element authoring surface (PARTIAL).**
	Missing: richer selected-item controls panel and full reference-grade per-style tab structure. The current repo now has selection + drag + resize + inline editing, direct style assignment, add/delete text blocks, and selected-text controls for font size, line height, and weight, but it still does not match the full editor-panel breadth of the reference app.
	Reference files: `editor-constants.js` (`OVERLAY_TEXT_STYLE_TAB_SPECS`, `OVERLAY_LOGO_CONTROL_ROWS`, `OVERLAY_GRID_CONTROL_ROWS`), `index.js` (editor panel architecture).

8. **Preset workflow (PARTIAL).**
	Save, update, delete presets in localStorage. Import/export as JSON files with auto-versioned naming. Active preset dirty-state now exists and payloads are normalized against generated defaults instead of always writing full snapshots. Presets now also carry the preview's per-profile export settings map and per-profile halo config map.
	Reference files: `index.js` (save_preset, delete_active_preset, export_current_preset, import_presets_from_file, apply_preset_by_id).

9. **Source-default writeback (PARTIAL).**
	The preview shell now loads a source-default snapshot on startup, resets back to that authored snapshot, exposes a Write Source Default button, and writes the current snapshot to `/__authoring/source-default-config` via `Ctrl/Cmd+S` or the button.
	Reference files: `index.js` (write_source_default_snapshot, read_source_default_snapshot).

10. **Export pipeline (PARTIAL).**
	Single frame PNG ✔, PNG sequence with frame-range modal + File System Access directory picker ✔, headless Playwright PNG exporter (`scripts/export-headless.ts`) ✔, FFmpeg MP4 encoder (`scripts/encode-mp4.ts`) ✔ (libx264, CRF 10/14, yuv444p/yuv420p, slow preset, -tune animation, bt709). `window.__layoutOpsAutomation` API matches reference `__mascotAutomation` pattern. Transparent background option ✔.
	End-to-end verification now confirmed with a 48-frame, 2-second headless export at 1080x1350 followed by MP4 encode on Windows using a local FFmpeg install.
	Remaining: fade-in/fade-out integration and any final `output/{dimensions}/` workflow polish.
	Reference files: `index.js` (export_current_frame_png, export_png_sequence, export_current_mp4).

11. **Guide toggle 3-state cycle (DONE).**
	`W` and `G` cycle: off → composition → baseline → off. Matches reference `W` cycle. `GUIDE_MODES` array in `main.ts` drives `cycleGuideMode()`.

12. **Keyboard shortcuts (PARTIAL).**
	`Ctrl/Cmd+S` now writes source defaults, `Escape` closes the inline editor and drawer, and `P` or `Space` now toggles the preview motion loop.
	Remaining gap: shortcuts should still be blocked during any future export modal.
	Reference files: `index.js` (keydown handler).

### Medium — needed for visual fidelity on the animation layer

13. **Halo-field renderer (MISSING).**
	Phase masks with dual-lobe geometry (50px center offset × geometry_scale). Spoke width transitions with `fill_u`-based thickness interpolation (`phase_start_width_px` → `phase_end_width_px`). Echo ring system: 16 echoes, mixed style, plus/circle variant markers, opacity/width/wave modulation. Screensaver pulsing: orbit and spoke count breathing over `cycle_sec` (60s default).
	Reference files: `halo-field.js` (full module), `rendering.js` (spoke rendering pipeline).

14. **Mascot composition (MISSING).**
	Face SVG texture on Three.js mesh. Halo SVG texture. Nose path (Path2D) with cutout material for background color punch-through. Eye circles (cx:260/340, cy:290.25, r:8). Blink animation. Head turn animation. Mascot fade-in. Decision: keep in adapter until reuse becomes concrete.
	Reference files: `rendering.js` (mascot mesh setup, nose texture, eye rendering), `config-schema.js` (MASCOT_* constants).

15. **Vignette system (MISSING).**
	Full vignette: inner/outer radius + feather + choke, shape fade (start/end), dither. Disabled by default. Currently not critical for screenshot parity since it's off in most profiles — can defer.
	Reference files: `default-config-source.js` (vignette config per profile).

16. **Safe area fill layering (PARTIAL).**
	Reference has `safe_area_fill_above_animation` toggle that changes render order — fill can be behind or on top of the Three.js animation layer. Current repo has `safe_area_fill_color` but may not fully replicate the layering behavior.
	Reference files: `rendering.js` (SAFE_AREA_FILL_ORDER vs SAFE_AREA_FILL_OVERLAY_ORDER).

### Low — architecture differences or deferred items

17. **Screensaver / post-finale animation state machine (MISSING).**
	Continuous loop after intro ends. Cycle timing, ramp-in, orbit/spoke pulse breathing, min spoke count floor, phase boundary transitions. Current repo has simple time-based animation.
	Reference files: `halo-field.js` (build_post_finale_halo_field_state), `rendering.js` (screensaver loop).

18. **Three.js vs SVG renderer (ARCHITECTURAL DIFFERENCE).**
	Reference uses Three.js WebGLRenderer + 2D canvas overlay. Current repo uses pure SVG motion + HTML overlay. This is intentional — visual output parity is the goal, not renderer parity. Note: the Three.js path gets higher DPI fidelity on dots and uses GPU blending, which affects visual subtleties at high zoom.

## Audit Delta — 2026-03-27 Late Pass

This delta supersedes parts of the earlier parity snapshot above.
It reflects the current repo after the overlay-preview rebuild, reference-doc reread, and cross-repo re-audit against the old app.

### What is no longer fully missing

1. **Output profiles are now scaffolded, and the preview now keeps per-profile overlay buckets.**
	`core-types` now defines the 5 reference profile keys plus dimensions, safe areas, and default frame rates.
	The preview shell now preserves overlay params per output profile instead of mutating one shared document when the profile changes.
	Remaining gap: profile ownership still does not extend to source-default persistence, export state, or profile-owned motion and mascot defaults the way the reference app does.

2. **Content-format structure exists, and the preview now keeps per-format buckets inside each profile.**
	`core-types` now defines `generic_social` and `speaker_highlight` field specs, aliases, and legacy-slot mapping.
	The preview shell now preserves format-specific field layouts, inline text, and CSV draft state per profile rather than rebuilding formats from scratch on each switch.
	Remaining gap: source-default persistence, reference-style bucket writeback, and fully canonical renderer/layout ownership are still missing.

3. **Text-style parity is closer than the earlier audit suggested.**
	The current repo now has `title`, `b_head`, and `paragraph` styles with the expected Ubuntu Sans weight pattern.
	The preview shell now also uses style-aware labels for selected items and authoring boxes, including ordinal labels for repeated paragraph-style fields, and the selected-item panel can add or delete text blocks within the active format bucket.
	The shared text-layout path now also applies an ascent-aware first-baseline inset so a field aligned to a grid row keeps its first line visibly inside the field bounds instead of letting the ascender protrude above the box.
	Remaining gap: the richer selected-item editor and per-style authoring controls from the reference app are still not ported.

4. **Linked title sizing exists only as a preview-side helper.**
	There is now a helper that updates the title font size when logo height is edited in the preview shell.
	Remaining gap: the reference rule is config-driven and renderer/layout aware, including intrinsic logo aspect ratio handling. The current helper is not yet the canonical kernel rule.

5. **Preset workflow is partially scaffolded.**
	The preview toolbar now supports browser-local preset save, update, import, and export, these payloads capture the per-profile/per-format overlay bucket state, and saved or exported preset payloads are now normalized against the generated profile or format defaults instead of always writing full snapshots.
	The active preset row also now reflects dirty state in the preview shell.
	The preview shell also now supports source-default snapshot loading and writeback through the dev authoring route.
	Remaining gap: there is still no reference-grade tabbed workflow or directory-picker export path.

### Highest-priority remaining parity gaps after the late audit

0. **Whole-scene Ubuntu Summit animation port is now the top explicit parity strategy.**
	User decision on 2026-03-27: import the entire reference animation as one finished scene-family generator operator first, so parity can be achieved before any attempt to generalize. This should include mascot motion, blink, head shake, dot splash, spokes, radio lines, Ubuntu release labels, construction lines, finale behavior, and the screensaver loop.
	Architectural rule: keep this as one coarse operator boundary for now, with rendering/orientation details still handled in adapters.
	Incremental progress: `operator-ubuntu-summit-animation` now owns phase classification, runtime timing, loop timing, and mascot-box descriptor data, and the preview plus automation API now route through that descriptor instead of bypassing the package entirely.

1. **Animation timeline state is still fundamentally missing.**
	The current preview now has a coarse time-driven post-finale screensaver loop in the Three adapter, but not the full reference sequence.
	What is missing from the reference behavior:
	- intro dot/orbit splash timing
	- finale halo shrink timing
	- blink/sneeze cadence and head-turn-linked timing state

2. **Ubuntu release labels are now rotated in the adapter, but still need reference-grade finesse.**
	The preview now rotates each label pill to the spoke angle and flips it upright on the far side of the halo.
	Remaining gap: spacing, exact anchor placement, and any reference-specific collision tuning still need refinement in the adapter.

3. **The halo-field system is still adapter-scaffold parity, not behavioral parity.**
	The current repo has a strong coarse visual approximation, but not the reference state machine:
	- no real intro-to-finale-to-screensaver handoff
	- no phase-boundary transition timing for spoke count/width changes
	- no full mascot-linked reveal choreography

4. **Output profiles still do not own the whole scene.**
	The reference app stores per-profile text, logo, layout, motion, mascot, safe area, and content-format buckets.
	The current repo has profile metadata, but not profile-owned scene defaults and switching semantics.

5. **Logo semantics remain incomplete even though basic coupling exists.**
	Missing reference behaviors:
	- intrinsic asset aspect ratio loading from the real image
	- renderer/layout use of that aspect ratio for canonical logo width
	- consistent coupling rule between title sizing and logo sizing across profile changes and preset loads
	This item is now explicitly elevated by user direction: logo-to-heading lock is one canonical coupled feature. A Head sizing should drive logo scale, and the lock must remain intact across screen sizes rather than being treated as two independent settings.

### Principled parity path implied by this audit

1. **Do not keep expanding preview-local motion patches.**
	The next parity milestone should port the entire Ubuntu Summit sequence into `operator-ubuntu-summit-animation` as one coarse scene-family operator that owns intro, finale, post-finale, mascot timing, and scene metadata.

2. **Keep label orientation in the adapter, not in the kernel.**
	The field operator should emit spoke angle and label-slot data; the preview/export adapters should decide how to orient and draw the release labels.

3. **Treat mascot composition as adapter-side until reuse is concrete.**
	Face, halo, blink, and head-turn choreography still read as scene-family behavior rather than reusable generic kernel payloads.

4. **Finish profile/content/preset authority before chasing fine visual polish.**
	Without the reference app's scene-default and profile-bucket model, parity validation keeps happening against the wrong document state.

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
- [ ] Operator-registered accordion panels for the config editor UI.
	Working assumption: each operator package self-registers an accordion tab+panel instead of the preview app hard-coding per-section builders. This keeps the UI organized as the control surface grows. Fits naturally into Stage 3 (operator surfaces) and the non-negotiable rule that parameter UI reads operator manifests.
- [ ] Incremental control-surface swap from Vanilla to the sibling `portable-vertical-rhythm` package after the current parity backlog is cleared.
	Working assumption: treat this as a post-parity UI-surface migration, use the package as a local dependency rather than copied source, and avoid coupling the migration to the remaining export/content/profile parity work.

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