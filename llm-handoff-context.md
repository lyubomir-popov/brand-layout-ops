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
- `project.sceneFamilyGraphs` is the persisted per-family store. `project.backgroundGraph` is the live active-family projection used by the preview runtime. Legacy `sceneFamilyConfigs` remains load/apply compatibility only.
- The live inspector is split into a `Workspace` rail and a `Parameters` rail. The Parameters rail now starts with a dedicated `Layers` palette that can select background nodes, the overlay root, text fields, and the logo.
- The shell uses the canonical `baseline-foundry` dark application, overlay, and resize contracts. The old local shell class layer is gone from source.
- `main.ts` is now a composition root around extracted controllers. The remaining work is product-shape work, not more parity recovery.

## Active queue

No approved lane is currently open in `docs/TODO.md`.

- Lane J is complete.
- The current authoring baseline is: top-level shell chrome for workspace actions, a dedicated Layers palette, and a Parameters rail that follows the current layer selection.
- The next pass should promote a new lane explicitly rather than drifting into unscheduled shell polish.

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
| Background graph selection and family switching | `apps/overlay-preview/src/background-graph-controller.ts` |
| Preview document model and compatibility | `apps/overlay-preview/src/preview-document.ts` |
| Document open/save orchestration | `apps/overlay-preview/src/document-workspace.ts` |
| Shared document schema and graph persistence | `packages/operator-overlay-layout/src/document-schema.ts` |
| Shared background graph helpers | `packages/operator-overlay-layout/src/background-graph.ts` |
| Schema-driven parameter rendering | `packages/parameter-ui/src/schema-renderer.ts` |

## Fresh chat prompt

Continue work in `c:\Users\lyubo\work\repos\brand-layout-ops` using `c:\Users\lyubo\work\repos\racoon-anim` as the read-only reference app. Read `AGENTS.md`, `llm-handoff-context.md`, `docs/TODO.md`, `docs/product-roadmap.md`, and `README.md` first. Treat `docs/TODO.md` as the canonical active queue. Stage 1 parity, the selected-operator pane, the baseline-foundry shell cleanup, the preset-residue cleanup, the graph-first family-persistence migration, and Lane J1-J5 are complete. The current baseline is a top-level action chrome plus a dedicated Layers palette and a layer-following Parameters rail. Promote a new lane explicitly before starting another large refactor.