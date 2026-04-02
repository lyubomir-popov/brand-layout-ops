# TODO

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
- Background graph execution should converge on one graph-shaped authority. `project.sceneFamilyGraphs` is a sparse per-family store — new documents only contain the active family, others are created on demand. `project.backgroundGraph` is the live active-family projection for `project.sceneFamilyKey`. New saved files should derive that runtime projection on load instead of serializing it separately. Legacy `sceneFamilyConfigs` is now a load/apply compatibility bridge only. Do not re-introduce per-edit mirroring.
- The authored document should keep one authoritative instance of each editable layer or operator. Selection UIs, parameter panes, and shell chrome may point at that state, but they must not create parallel editable shadow models.
- UI work should reduce hardcoded preview ownership over time. Prefer section registration, manifests, and typed operator surfaces over adding more bespoke accordion builders indefinitely.
- Do not let Ubuntu-specific render quirks calcify into permanent one-off features. If a need is really "multiple ordered visual planes" or "a compositor above and below text," move toward a layer-stack model rather than adding another special-case toggle.
- Shell-level project actions belong in authoring chrome, not buried in operator panels.
- Export targets stay backend-driven. PNG, MP4, SVG, PDF, and EPS should share scene or document authority rather than each inventing their own semantics.
- Product direction is a Houdini-like operator app for branded documents, not a freeform-design-first clone. Template CRUD, document sizes, and stakeholder flows matter, but only in ways that preserve deterministic layout and operator composability.
- Parity is still the gate. If a task does not close parity, reduce future drift, or unblock backend separation, it needs a stronger reason.
- Content-format as a user-facing concept is retired. The document authoring model replaces it. Each document carries its own authored state, and the Houdini-like operator graph is the north star for how content, layout, and export relate.

### Standing rules

1. Keep halo stable and closed unless a concrete regression appears.
2. Keep label orientation in adapters, not kernels — the operator emits spoke angle and label-slot data.
3. Keep mascot composition adapter-side until reuse is concrete.
4. Three.js vs SVG renderer difference is an intentional architectural choice. Visual output parity is the goal, not renderer parity.

## Drift Signals — 2026-04-02

Active architectural risks requiring attention during the next work cycle.

| Signal | Severity | Detail |
|--------|----------|--------|
| `main.ts` at ~833 lines | **Medium** | CSV draft, playback, source-default, authoring, export, overlay editing, stage rendering/composition, inspector section registration, document target CRUD, profile/content switching, preview-document/workspace state orchestration, and background-graph selection or sync are all extracted from the former monolith. Remaining: DOM query helpers, overlay-visibility shell glue, and the final controller/bootstrap composition root. |
| `scene-family-preview.ts` at 724 lines | **Medium** | Graph orchestration now uses preview operators registered with the shared graph runtime, which is the right direction. Remaining cleanup should extract preview operator wrappers or draw adapters only when reuse is concrete, not as a file-split exercise. |

## Houdini-Like Parameter Pane — Architectural North Star

The product direction is a Houdini-like operator application for branded documents. The current multi-accordion panel with all sections visible at once is an interim shape. The target UI model is:

### Network view

- The document's active operator graph is visible as a list or simple node graph (list first, graph later).
- Each operator node shows its key, display name, and connection state.
- Selecting an operator in the network view shows only that operator's parameters in the parameter pane.
- Document-level concerns (output profiles, document metadata, source defaults) remain in a separate top-level section or header.
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

## Approved Execution Queue

Lanes A–K are complete. See `docs/history.md` for the closed parity, shell-reduction, authoring-shell, and serialization work.

### Lane L — Sparse operator graph inclusion + node CRUD

Goal: Documents only persist operator graphs for families the user has explicitly configured. The graph supports add and remove of operator nodes, not just editing existing ones.

| Step | Status | Summary |
|------|--------|---------|
| L1 | Done | `OverlaySceneFamilyGraphs` → `Partial<Record<OverlaySceneFamilyKey, OverlayBackgroundGraph>>` |
| L2 | Done | `createDefaultOverlaySceneFamilyGraphs` creates only the active family |
| L3 | Done | Family switching creates on demand via `syncDocumentBackgroundGraph` fallback + explicit map write |
| L5 | Done | `removeBackgroundNode()` — removes node, prunes edges, falls back `activeNodeId`, refuses to remove last node. Wired into Layers palette with hover-reveal × button |
| L6 | Verified | Source-default, legacy files, and automation all work unchanged under sparse type |

### Lane N — Graph authoring CRUD (next)

Goal: Move from graph inspection to graph authoring. The saved background graph should support add-node and edge CRUD without requiring manual spatial editing. The network overlay stays a read or select-first surface unless an editing affordance clearly improves the model instead of coupling it to the stage.

| Step | Status | Summary |
|------|--------|---------|
| N1 | Not started | Add-node action: browse the registered background operators for the active family and insert a new node into `backgroundGraph` with default params |
| N2 | Not started | Edge-create action: connect compatible typed ports while preserving DAG validity and rejecting cycles |
| N3 | Not started | Edge-remove and disconnect affordances so the graph can be edited without deleting entire nodes |
| N4 | Not started | Keep Layers palette, network overlay selection, and parameter pane focus synchronized after graph edits |
| N5 | Not started | Decide the first authoring surface deliberately: Layers palette first, overlay affordances second, with graph model logic staying surface-agnostic |

## Immediate next steps after the above is done
- **Promote the next lane explicitly.** Lane K is complete, so the next pass should choose a new approved lane instead of drifting into opportunistic shell work.
- **Keep the shell stable.** Treat the File/View `bf-top-navigation`, shell-level BF modals, dedicated Layers palette, and parameter-only rail as the current authoring baseline and only reopen it for a concrete product need.
- **Full compositor model.** Layer-stack direction is committed but the active queue should add parity-friendly seams first, not schedule a premature compositor rewrite.
- **Timeline and clip model.** Belongs after parity, as a sequencing layer above the operator graph.
- **Cross-operator transition choreography.** Future timeline/sequencing concern, not preview-local temporal glue.

### Non-blocking follow-ups

- Revisit the exported preset import once `baseline-foundry/presets/panel.css` is rebuilt upstream. The preview is temporarily using the valid exported `app-tier` preset because the current panel artifact in the sibling repo is malformed.

These are optional spot checks, not Stage 1 parity gates and not part of the active execution lane.

## Discussion Items Not Yet Scheduled

Deferred until explicitly promoted. Each carries a working assumption.

- **Document and source-default discoverability.** The File/View shell moved source-default writeback and document-size editing out of the Parameters rail, but the workflow is not yet self-evident. Clarify that Document Setup changes persist when the current document is saved, and verify the save path is obvious to new users.
- **Content-format retirement.** Content-format as a user-facing concept is dead. The remaining `contentFormatKey` state in the profile bucket machine is internal plumbing that can be simplified or removed in a later pass. No new UI surface is needed for it.
- **GPU/execution backends.** Keep moderate operators in TypeScript. Allow GPU paths only where profiling proves TypeScript insufficient.
- **Spokes decomposition.** Keep `operator-spokes` coarse for parity. Later split toward wave, mask, and polar-field operators.
- **Arbitrary output-size authoring.** Custom sizes stay below parity-critical work.
- **Paragraph-style set authoring.** Wait for stable project model and operator-scoped parameter surfaces. When this is promoted, include per-style text-color authoring and a dedicated paragraph-styles modal with an InDesign-like workflow instead of treating style editing as scattered inline controls.

### Candidate next shell follow-up

Inbox-promoted shell ergonomics request to keep in view when the next lane is chosen. This is a concrete product need, but it is not yet an approved execution lane.

1. Audit the stage shell contract. Confirm whether a `baseline-foundry` stage-shell primitive exists or whether the current preview stage is still local CSS, then decide whether the behavior should stay local or become an upstream request.
2. Treat the preview surround like a document canvas. The stage background should read more like Photoshop or Lightroom: a neutral light-gray surround around the document so the document edges are visually obvious instead of blending into the app shell.
3. Remove forced stage overflow caused by canvas-shell padding. The preview stage should not show a gratuitous scrollbar when the fitted document still conceptually fits in view.
4. Keep fit-to-viewport as the default stage behavior, but add a `100%` zoom action so authored output can be inspected at real pixels.
5. Evaluate panning for oversized documents while holding `Space`, matching the expected canvas-hand interaction for inspection.
6. Replace the current playback shortcut before `Space` is reassigned to pan. Choose a playback shortcut that does not conflict with canvas navigation and document-shell text inputs.

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
