# LLM Handoff Context

> Read this first in a new chat.
> Active plan and sequencing live in `docs/TODO.md`.
> Completed work archive lives in `docs/history.md`.
> Long-term direction lives in `docs/product-roadmap.md`.
> Agent workflow rules live in `AGENTS.md`.

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
- The live shell now uses a two-menu `bf-top-navigation`: `File` owns recent-file access, document setup, export settings, export commands, and source defaults through BF modal dialogs, while `View` owns overlay visibility, guide mode, and playback state. The current document name is shown in the top-navigation banner, the Parameters rail stays parameter-only, and it starts with a dedicated `Layers` palette.
- The stage now has a toggleable network overlay layer. `View` and `N` can show a 50% black scrim plus a deterministic DAG autolayout of the active background graph, with pseudo-nodes for overlay layout, preview composite, and output sinks so operator flow is visible without committing to a spatial editor yet.
- `preview-composition.ts` is now the shared preview compositor seam. Stage canvas visibility, SVG overlay visibility, export composition, automation state, and the network overlay all use the same ordered layer and sink model instead of carrying separate hardcoded assumptions.
- The Layers palette can now add background operators directly. New nodes get unique IDs and default params, are selected immediately for editing, and do not become the graph output until later edge or active-node authoring says so.
- Document setup is now a table-driven workflow instead of the older choice-row modal. It shows saved sizes as radio rows with width/height columns, supports direct custom-size entry, and allows row-level removal without forcing the user to activate a size first. Custom dimensions flow through generated `custom_{width}x{height}` output-profile keys.
- The shell uses the canonical `baseline-foundry` dark application, overlay, and resize contracts. The old local shell class layer is gone from source. The preview currently imports the valid exported `baseline-foundry/presets/app-tier.css` preset because the sibling repo's exported `presets/panel.css` artifact is malformed.
- `main.ts` is now a composition root around extracted controllers. The remaining work is product-shape work, not more parity recovery.

## Active queue

Lane N (graph authoring CRUD) is next.

- Lane M is complete: network overlay, deterministic autolayout, selection, composition seam, and named output sinks are all in place.
- N1 landed: Layers palette add-node authoring now works for the supported background operators.
- Next up: N2 edge creation for compatible typed ports, then N3 disconnect or edge removal without forcing whole-node deletion.
- Content-format as a user-facing concept is retired. The document authoring model replaces it, with Houdini as the north star. See `docs/product-roadmap.md` → "Document/project model — the Houdini ROP analogy" for the full synthesis.

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

Continue work in `c:\Users\lyubo\work\repos\brand-layout-ops` using `c:\Users\lyubo\work\repos\racoon-anim` as the read-only reference app. Read `AGENTS.md`, `llm-handoff-context.md`, `docs/TODO.md`, `docs/product-roadmap.md`, and `README.md` first. Treat `docs/TODO.md` as the canonical active queue. Stage 1 parity, the selected-operator pane, the baseline-foundry shell cleanup, the preset-residue cleanup, the graph-first family-persistence migration, Lane J1-J5, and Lane K1-K3 are complete. The current baseline is a `bf-top-navigation` action shell plus a dedicated Layers palette and a layer-following Parameters rail, with persisted documents now storing `sceneFamilyGraphs` without serializing `backgroundGraph`. Promote a new lane explicitly before starting another large refactor.