# LLM Handoff Context

> Read this first in a new chat.
> Active plan and sequencing live in `TODO.md`.
> Completed work archive lives in `HISTORY.md`.
> Long-term direction lives in `ROADMAP.md`.
> Agent workflow rules live in `.github/copilot-instructions.md`.

## Repo boundary

| Role | Path |
|------|------|
| Primary repo | `c:\Users\lyubo\work\repos\brand-layout-ops` |
| Reference-only repo | `c:\Users\lyubo\work\repos\racoon-anim` |

Do not continue product architecture work in the reference repo unless explicitly asked.

## Quick start

```bash
npm run preview:dev
npm run typecheck
npm run preview:build
```

Useful focused checks: `npm run demo:overlay-layout`, `npm run demo:copy-to-points`, `npm run demo:orbits`, `npm run demo:spokes`.

## Current state

- Stage 1 parity is closed for the current rebuild scope. Document workflow, overlay editing, guides, source-default writeback, and the current export path are all working.
- The working artifact is a local `.brand-layout-ops.json` file. Browser-local presets are gone from the live workflow.
- `project.sceneFamilyGraphs` is now a sparse `Partial<Record<OverlaySceneFamilyKey, OverlayBackgroundGraph>>`. New documents only contain the active family; other families are created on demand when the user switches. Legacy files with all four families still load fine. `project.backgroundGraph` is a derived live active-family projection used by the preview runtime and is no longer written into new saved files. Legacy `sceneFamilyConfigs` remains load/apply compatibility only.
- The live shell now uses a two-menu `bf-top-navigation`: `File` owns recent-file access, the Formats dialog, the Preset Library dialog, source defaults, export settings, and export commands through BF modal dialogs, while `View` owns overlay visibility, guide mode, and playback state. The current document name is shown in the top-navigation banner, the Parameters rail stays parameter-only, and it starts with a dedicated `Layers` palette.
- Playback now uses `K` instead of `Space`, reserving `Space` for future canvas-hand or pan work without conflicting with the existing shell shortcuts.
- The preview stage now sits inside the canonical `bf-stage-shell` wrapper instead of treating `bf-fixed-width` and stage shell as the same element. The main worksurface reads as a neutral gray document surround, and the stage edge now stays visually distinct from the app chrome.
- Fit-to-viewport stage sizing now comes from measured stage-shell height instead of the older `100dvh` heuristic. Dock-mode changes, aside resizing, and shell resizes refresh the stage metrics and rerender authoring or network overlays so the fitted frame does not force gratuitous scrollbars when it should still fit.
- The stage now has a toggleable network overlay layer. `View` and `N` can show a 50% black scrim plus a deterministic DAG autolayout of the active background graph, with pseudo-nodes for overlay layout, preview composite, and output sinks so operator flow is visible without committing to a spatial editor yet.
- `preview-composition.ts` is now the shared preview compositor seam. Stage canvas visibility, SVG overlay visibility, export composition, automation state, and the network overlay all use the same ordered layer and sink model instead of carrying separate hardcoded assumptions.
- The Layers palette now owns the first graph-authoring surface. It can add background operators, connect compatible typed ports per input, and disconnect occupied inputs without deleting nodes. New nodes get unique IDs and default params, are selected immediately for editing, and do not become the graph output until later edge or active-node authoring says so.
- Shared graph port metadata and validation now live in `packages/operator-overlay-layout/src/background-graph.ts`. Persisted graphs normalize against real input and output ports, reject duplicate or cyclic connections, and keep the graph model reusable across future authoring surfaces.
- The stage network overlay now labels authored graph edges with human port names instead of raw port keys.
- The Formats dialog is now a table-driven workflow instead of the older choice-row modal. It shows saved document formats as radio rows with width and height columns, includes a built-in preset picker for unused standard profiles, supports direct custom-size entry, and allows row-level removal. Newly added formats now become active immediately so the user can design for that format at once. Custom dimensions still flow through generated `custom_{width}x{height}` output-profile keys.
- The shared document schema now exposes `OverlayDocumentFormat` while keeping the older target naming as a compatibility alias. Automation state now emits `document_formats` and `document_active_format_id` alongside the legacy target keys, and the live app-layer controller or shell wiring now uses format-first naming too. Formats now also persist `formatPresetKey` and `derivedFromFormatId` metadata. Built-in presets are now defined explicitly as one shared frame + safe-area + grid seed package, the dialog surfaces that richer seed summary per row, and the controller maintains derivation references when formats are removed or re-keyed.
- First-time bucket creation for a new format is now metadata-driven instead of only copying the active bucket blindly: preset-backed variants keep the preset safe-area and grid seed, while custom formats derive directly from the source format's authored layout.
- The current save/load path still persists the open document's concrete target rows in `project.targets`, but the product direction has shifted again: the user-facing model should be Adobe-like authored format variants with InDesign-style auto-adjust or derivation, seeded by a global document-size preset library. Named export presets should still move onto the future Houdini-like output operator instead of staying in the Formats dialog or source-default modal flows.
- The shell uses the canonical `baseline-foundry` dark application, overlay, and resize contracts. The old local shell class layer is gone from source. The preview currently imports the valid exported `baseline-foundry/presets/app-tier.css` preset because the sibling repo's exported `presets/panel.css` artifact is malformed.
- `main.ts` is now a composition root around extracted controllers. The remaining work is product-shape work, not more parity recovery.

## Active queue

Lane P is active.

- Lane M is complete: network overlay, deterministic autolayout, selection, composition seam, and named output sinks are all in place.
- Lane N is complete: Layers-palette graph CRUD now covers add-node, connect, disconnect, shared typed-port validation, and synchronized parameter-pane focus.
- Lane O is paused after O1-O3, with zoom and pan work deferred until there is a concrete need.
- Lane P is active: P1-P3 are landed and P4 has started. P4b now defines the built-in preset contract as one seed package for frame, safe area, and grid, and P4d now uses that metadata during first-time variant seeding while document buckets stay authoritative for later overrides. The next pass should keep extending that split between global size presets, document-owned format variants, and future output recipes while preserving the existing saved-file shape until the larger schema redesign is settled.
- Future format work should follow the new hybrid rule: global presets seed authored format variants, variant derivation should carry a useful first-guess layout across dimensions, and export presets belong on the future output operator.
- Content-format as a user-facing concept is retired. The document authoring model replaces it, with Adobe-like format variants on top of the Houdini-like operator core. See `ROADMAP.md` → "Document/project model — Adobe-style variants over a Houdini core" for the full synthesis.

## Invariants that still matter

- The authored document graph plus overlay-authored objects are the only editable authority. Selection UIs and parameter panes must point at that state, not create shadow models.
- Layout semantics stay out of preview adapters and Three.js.
- Shell-level actions belong in authoring chrome, not inside operator parameter surfaces.
- `baseline-foundry` stays read-only from this repo unless a shared contract clearly belongs upstream.
- Do not re-introduce local shell class contracts or `[data-*]` style selectors in `apps/overlay-preview`.

## Key files

| Purpose | File |
|---------|------|
| Composition root | `apps/overlay-preview/src/main.ts` |
| Inspector rebuild + Layers palette | `apps/overlay-preview/src/config-editor-controller.ts` |
| Overlay child editing | `apps/overlay-preview/src/overlay-editing-controller.ts` |
| Shell bootstrap and keyboard shortcuts | `apps/overlay-preview/src/preview-shell-controller.ts` |
| Shared preview composition seam | `apps/overlay-preview/src/preview-composition.ts` |
| Stage network overlay rendering | `apps/overlay-preview/src/stage-network-overlay-controller.ts` |
| Background graph selection and family switching | `apps/overlay-preview/src/background-graph-controller.ts` |
| Preview document model and compatibility | `apps/overlay-preview/src/preview-document.ts` |
| Document open/save orchestration | `apps/overlay-preview/src/document-workspace.ts` |
| Shared document schema and graph persistence | `packages/operator-overlay-layout/src/document-schema.ts` |
| Shared background graph helpers | `packages/operator-overlay-layout/src/background-graph.ts` |
| Schema-driven parameter rendering | `packages/parameter-ui/src/schema-renderer.ts` |

## Fresh chat prompt

Continue work in `c:\Users\lyubo\work\repos\brand-layout-ops` using `c:\Users\lyubo\work\repos\racoon-anim` as the read-only reference app. Read `.github/copilot-instructions.md`, `.github/agents/agent.md`, `STATUS.md`, `TODO.md`, `ROADMAP.md`, `docs/specs.md`, and `README.md` first. Treat `TODO.md` as the canonical active queue. Stage 1 parity, the selected-operator pane, the baseline-foundry shell cleanup, the preset-residue cleanup, the graph-first family-persistence migration, Lane J1-J5, and Lane K1-K3 are complete. The current baseline is a `bf-top-navigation` action shell plus a dedicated Layers palette and a layer-following Parameters rail, with persisted documents now storing `sceneFamilyGraphs` without serializing `backgroundGraph`. Lane P is now the active follow-up lane: make the live shell and controller behavior read as authored formats or variants instead of output-only targets, starting with the existing compatible `project.targets` persistence shape.