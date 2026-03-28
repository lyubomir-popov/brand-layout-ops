# Brand Layout Ops

This repo is the extracted product kernel for the browser-native operator-graph direction.
Original repo for reference: h:\HOUDINI PROJECTS\RacoonTail\mascot-animation-clean-port\
It is intentionally not the current full app.

It holds the pieces that should survive renderer changes:

- typed document and operator contracts
- graph evaluation runtime
- layout-grid math
- text-layout math
- layout composition kernel

## Architectural position

Treat this like a simplified Houdini for branded layouts and motion scenes:

- layout is one operator family
- field or point generation is another
- SVG or vector instancing is another
- compositing is another
- preview backends are adapters
- export backends are adapters

The long-term rule is simple:

- no layout semantics inside Three.js
- no print semantics inside the preview runtime
- no monolithic app-level geometry rules

## Start Here

If you are resuming work in a fresh chat, read this first:

1. `llm-handoff-context.md` — cold-start handoff with current state and sprint TODO

For deeper context:

2. `docs/rebuild-plan.md` — architecture, parity audit, phase checklist
3. `docs/product-roadmap.md` — long-term vision

Agent behavior rules are in `AGENTS.md` (auto-loaded by Copilot).

If the task is parity-related, inspect these comparison sources next:

- Reference app behavior and presets: `c:\Users\lyubo\work\repos\racoon-anim\src\app\config-schema.js`, `default-config-source.js`, `editor-constants.js`, `index.js`
- Reference motion and halo-field rendering: `c:\Users\lyubo\work\repos\racoon-anim\src\app\rendering.js`, `halo-field.js`
- Reference content and assets: `c:\Users\lyubo\work\repos\racoon-anim\assets\content.csv`, `content-speaker-highlight.csv`, `UbuntuTagLogo.svg`, `racoon-mascot-face.svg`, `racoon-mascot-halo.svg`
- Current preview implementation: `apps/overlay-preview/src/main.ts`, `apps/overlay-preview/src/document-workspace.ts`, `apps/overlay-preview/src/preview-document.ts`, `apps/overlay-preview/src/sample-document.ts`, `apps/overlay-preview/src/sample-motion.ts`
- Current layout and motion kernels: `packages/operator-overlay-layout/src/index.ts`, `packages/layout-engine/src/index.ts`, `packages/operator-orbits/src/index.ts`, `packages/operator-spokes/src/index.ts`

## Local Preview

There is now a browser preview shell for parity work.

Run:

```bash
npm run dev
npm run preview:dev
```

That starts a Vite app at `apps/overlay-preview/` which currently:

- evaluates the overlay-layout operator graph in the browser
- renders the overlay layout and a lightweight SVG motion layer using the coarse orbits and spokes operators
- supports text and logo selection, double-click text editing, drag snapping, guide toggling, and CSV or inline content switching
- surfaces the main operator document controls from an operator parameter schema instead of only from preview-local hardcoded controls
- includes left and right snapped resize handles for selected text fields, a first-baseline guide, and staged CSV apply or discard controls
- persists local `.brand-layout-ops.json` documents through the shared overlay document metadata/state envelope, with preview-only preset and CSV-draft extras layered on top and legacy preview-file compatibility retained
- treats local documents as the source of truth for working state; browser-local preset storage is no longer supposed to seed a new session's working document

Other useful local checks:

```bash
npm run typecheck
npm run demo:overlay-layout
npm run demo:copy-to-points
npm run demo:orbits
npm run demo:spokes
```

## Packages

- `@brand-layout-ops/core-types`: shared contracts and data payloads
- `@brand-layout-ops/graph-runtime`: minimal deterministic graph evaluator
- `@brand-layout-ops/layout-grid`: baseline-grid and column-grid resolution
- `@brand-layout-ops/layout-text`: wrapping and placement math using a provided measurer
- `@brand-layout-ops/layout-engine`: scene-level layout composition for branded overlay content
- `@brand-layout-ops/operator-overlay-layout`: graph-facing overlay composition operator built on the layout kernels
- `@brand-layout-ops/operator-copy-to-points`: Houdini-style point instancing with propagated attributes for later Three.js and SVG backends
- `@brand-layout-ops/operator-orbits`: coarse orbit-ring point-field generator for motion-side rebuild work
- `@brand-layout-ops/operator-phyllotaxis`: golden-angle point-field generation matching the current Houdini phyllotaxis HDA logic
- `@brand-layout-ops/operator-spokes`: coarse spoke-band point-field generator for motion-side rebuild work
- `@brand-layout-ops/operator-ubuntu-summit-animation`: coarse scene-family operator boundary for the full non-reusable Ubuntu Summit parity port, including mascot and full animation timeline state
- `@brand-layout-ops/overlay-interaction`: snapped text/logo drag math for operator-facing overlay editing
- `@brand-layout-ops/parameter-ui`: small DOM helpers for operator-facing control surfaces in preview apps

## Resume Point

The repo is past pure kernel extraction.

Implemented so far:

- overlay-layout operator and deterministic text measurement path
- preview shell with guides, selection, double-click text editing, snapped drag interaction, and CSV or inline content switching
- lightweight motion preview layer using `operator-orbits` and `operator-spokes`
- richer motion preview layering with orbit trails, spoke segments, and echo rings, still kept adapter-side for parity work
- denser phase-lobed motion treatment in the preview shell so the background reads closer to the old halo-field composition without moving motion semantics into the kernel
- schema-driven operator parameter controls for frame, safe area, grid, and content source
- selected-text baseline guide, snapped resize handles, and staged CSV flow with row diagnostics, header mapping status, and seed/apply/discard controls in the preview shell
- deterministic export-geometry parity script for text anchors, bounds, grid edges, and resolved logo rectangles
- copy-to-points instancing path
- coarse orbits and spokes operators with runnable demos

Parity is not closed yet. A full March 27 audit against the reference repo reopened the remaining checklist around output profiles, presets and exports, source-backed content formats, style-aware authoring, logo asset semantics, and the halo-field renderer stack.

The next work should stay parity-first:

1. close the unchecked items in `docs/rebuild-plan.md`
2. validate against the reference app visually and with geometry checks
3. keep broader feature work such as fuzzy boids deferred until the reopened parity checklist is materially closed

## Later additions

- field generator operators
- SVG instancing operators
- Canvas/WebGL/Three preview adapters
- SVG export backend
- PDF/EPS print backend
- CMYK intent and mapping pipeline

See `docs/architecture.md` and `docs/future-backends.md`.

## Documentation & Agent Workflow

This repo uses a lightweight 3-file documentation system designed for AI-assisted development with long-running chat sessions. The rules are codified in `AGENTS.md` (auto-loaded by GitHub Copilot agents).

### The 3 canonical files

| File | Purpose | When to update |
|------|---------|----------------|
| `llm-handoff-context.md` | Cold-start handoff for a new chat. Repo orientation + current sprint TODO. | Every session |
| `docs/rebuild-plan.md` | Architecture decisions, parity audit, phase checklist | When phases/gaps change |
| `docs/product-roadmap.md` | Long-term 5-stage vision | Rarely |

### Recommended workflow

1. **Start a new chat** → paste or point the agent at `llm-handoff-context.md`. It has everything needed to resume.
2. **During work** → make code changes, run `npm run typecheck` to verify.
3. **After completing a task** → update `llm-handoff-context.md` (check off TODOs, update current state). Update `docs/rebuild-plan.md` if a phase item or gap closed.
4. **Commit** with area prefix: `halo: add fold seam alpha`, `ui: accordion sections`, `docs: update sprint TODO`.
5. **End of session** → verify `llm-handoff-context.md` reflects where you stopped. The next chat (or human) picks up from there.

### Copying to another project

1. Copy `AGENTS.md` to the new repo root.
2. Create `llm-handoff-context.md` with: repo orientation, current state, sprint TODO, key file map.
3. Optionally create `docs/<plan>.md` and `docs/<roadmap>.md`.
4. That's it — no other status/TODO files needed.