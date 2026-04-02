# Product Roadmap

## Product shape

This product is a browser-native operator graph for branded editorial and motion output.

It should behave like a simplified Houdini for brand work with a rigorous, InDesign-like layout engine layered into the same document model:

- reusable operators
- inspectable intermediate data
- deterministic layouts
- interchangeable preview and export backends

The key product shape is not "Figma for brand design." It is a structured operator app where:

- a document can target one or more output sizes
- documents should be real local project files, not only browser-local state
- source defaults can seed new documents, but authored operator settings and graph wiring belong to the document itself
- layout stays rigorous and document-driven rather than freeform first
- scene families can be swapped behind the same layout and export stack
- halo, boids, phyllotaxis, and future generators should be peers at the scene layer rather than bespoke app branches
- composition should grow toward a true layer stack where multiple background, image, text, and future media layers can be ordered intentionally instead of freezing the current Three.js-under-text arrangement into a permanent special case
- shell-level project actions such as new, open, save, duplicate, reset default, and export should live in dedicated authoring chrome rather than being treated as just another parameter section
- stills, video, SVG, PDF, and EPS remain backend concerns instead of mutating the kernel semantics

The preferred document analogy is closer to draw.io or local Canva-style projects than browser-local preset CRUD:

- open an existing local document
- save the current state as a new document
- persist in-editor text placement, added or removed text blocks, and logo changes in the document itself
- treat CSV as an optional import or source path, not the primary persistence model for authored layout state

It should not try to become a full freeform design tool first.

## Document/project model — the Houdini ROP analogy

The working unit in this product is a **document-project hybrid**: one `.brand-layout-ops.json` file that carries authored layout state, operator graphs, content bindings, and target-size definitions together — more like a Houdini `.hip` than a single-page InDesign document.

### Multi-size documents

A single document can define multiple output sizes through Document Setup. This is intentional and maps directly to the Houdini ROP model:

| Houdini concept | brand-layout-ops equivalent |
|-----------------|---------------------------|
| `.hip` file | `.brand-layout-ops.json` document |
| SOPs (geometry operators) | `sceneFamilyGraphs` — per-family operator graphs |
| Display flag / current ROP | `backgroundGraph` — runtime projection of the active family |
| Multiple ROP outputs | Multiple document target sizes |
| Render to disk from ROPs | Export PNG / PNG sequence per target size |

**How Document Setup persists:**

1. User opens `File → Document Setup...` and adds, removes, or modifies target sizes.
2. Those sizes live in the document's `project.targets` array (runtime state).
3. When the user saves (`Ctrl+S` or `File → Save`), the full document including all target sizes is written to disk.
4. If the document is **not saved**, target changes exist only in runtime memory and are lost on reload — same as unsaved edits in any file-based editor.
5. Source defaults (`File → Source Defaults → Save Defaults`) provides a separate persistence path: the default set of sizes for **new** documents. Modifying source defaults does not retroactively change existing saved documents.

**Benefits of multi-size per document:**

- Bulk export: one document can emit `1080×1350` (Instagram), `1920×1080` (YouTube), `1080×1080` (square) sequences in a single export pass, like Houdini rendering multiple ROP outputs from the same scene.
- The layout engine re-evaluates per target size, so responsive text wrapping and grid behavior are document-driven rather than requiring separate files per format.
- Scene families, operator graphs, content bindings, and authored overlay objects are shared across all sizes. Only the layout evaluation differs.

**Risks and best practices:**

- **Not every project needs multiple sizes.** A single 1080×1350 document for one campaign is perfectly valid. Multi-size is opt-in via Document Setup, not the default complexity.
- **Target sizes should stay within the same campaign intent.** A single document should not try to be a Swiss Army file for every possible brand deliverable. If the content, scene family, or operator graph would differ significantly between sizes, use separate documents.
- **The active preview shows one size at a time.** The radio selection in Document Setup controls which target drives the live preview. Export can target all sizes or a selection.
- **Source defaults are the template mechanism.** When a team standardizes on a set of sizes (e.g., "Ubuntu Summit 2026 social pack"), those sizes should be saved as source defaults so every `File → New` starts from that baseline. This is the equivalent of a Houdini project template.

### Persistence architecture summary

```
sceneFamilyGraphs     ← persisted, carries ALL operator graphs per family
backgroundGraph       ← runtime-only, rebuilt from sceneFamilyGraphs[sceneFamilyKey]
project.targets       ← persisted, the document's output size definitions
project.sceneFamilyKey ← persisted, which family is active
params (overlay)      ← persisted, authored text, logo, layout state
exportSettings        ← persisted, per-profile export config
contentFormatKey      ← internal plumbing (retired concept, no UI surface)
```

The file on disk carries everything needed to reconstruct the full runtime state. Runtime-only projections like `backgroundGraph` are rebuilt during normalization/load — the same way Houdini rebuilds display-flag geometry from SOPs on scene open rather than caching the viewport mesh.

### Content-format retirement

Content-format as a user-facing concept is dead. The document authoring model replaces it:

- Each document **is** its own content variant. Instead of switching formats within one document, you save separate documents or rely on CSV row selection for per-row content.
- The remaining `contentFormatKey` plumbing in the profile bucket system is legacy internal state. It can be simplified or removed in a future cleanup pass, but it does not need a replacement UI surface.
- The Houdini north star reinforces this: a `.hip` file does not have "content modes" — it has authored state, operator graphs, and outputs. So should this product.

## Roadmap

### Stage 0. Kernel extraction

Goal:

- establish the shared graph and kernel packages

Deliverables:

- core types
- graph runtime
- grid kernel
- text kernel
- layout engine
- rebuild plan and handoff docs

### Stage 1. Parity rebuild

Goal:

- reproduce the current app's working overlay and scene behavior in this repo

Deliverables:

- runnable preview app
- overlay layout operator
- parameter UI engine
- selected-element interaction layer
- coarse spokes and orbits operators

Success criteria:

- the new repo can match current overlay placement and editing behavior closely enough to replace the current architecture for ongoing work

### Stage 2. Operatorized scene building

Goal:

- make procedural scene composition reusable rather than app-specific

Deliverables:

- point or field generator operator
- SVG instancing operator
- compositing or layer-stack operator family
- background and layout composition in one graph
- typed point or field handoff between operators so generators can seed downstream solvers without preview-local glue
- swappable scene-family operators that can drive the same document through different motion systems

Success criteria:

- one campaign document can mix structured layout with procedural motion without bespoke glue code, and can swap one scene family for another without rewriting the layout or export path
- operator outputs can be passed forward as first-order graph payloads rather than being collapsed into preview-only state

### Stage 3. Local document model

Goal:

- make authored layout state persist as real local documents instead of transient browser state

Deliverables:

- local filesystem-backed document format for overlay and scene state
- open, save, save-as, and recent-document workflow
- persistence for in-editor text placement, added or removed text fields, logo asset changes, and per-document output settings
- document-owned scene-family selection plus saved background or operator graph state so the same document model can point at halo today and boids, phyllotaxis, or other background operator stacks later
- document-owned per-node parameter state and connection data for swappable background or scene-family stacks
- document-owned target-size groups so one document can carry multiple output destinations instead of being trapped in a single preview session
- clearer separation between authored document state and imported content sources like CSV

Success criteria:

- a user can treat the app like a real local project editor: open a document, edit text and placement, add or remove fields, change the logo, save, duplicate as a new document, and reopen later without relying on browser localStorage
- the document model is broad enough that scene-family swaps, target-size additions, and PNG or image-sequence or MP4 export all remain document-driven instead of becoming preview-only glue
- the saved document, not browser-local UI state, is authoritative for scene-family choice, operator settings, and graph wiring

### Stage 4. Stakeholder and operator surfaces

Goal:

- separate the operator-facing tuning surface from the stakeholder-facing export surface

Deliverables:

- operator mode for graph and parameter tuning
- contextual parameter panels driven by the selected operator, layer, or graph node instead of one monolithic document accordion
- a list-first layer or network palette that lets the document root, background operators, overlay root, and overlay child objects expose their own scoped controls, with a graphical node editor later if needed
- the network view reads the persisted operator graph from the document model instead of introducing a second source of truth
- dedicated shell navigation for project and export actions so file operations do not stay mixed into the operator parameter stack
- stakeholder mode for template, row, and format selection
- document-size and template management without exposing low-level operator tuning
- content validation and safer writeback
- stakeholder actions that operate on document files instead of only transient browser state

### Stage 5. Export backends

Goal:

- support screen and print-oriented outputs through dedicated backends

Deliverables:

- PNG and MP4 parity
- SVG export backend
- PDF or EPS-capable backend
- CMYK intent path with controlled replacement or backend conversion

### Stage 6. Broader brand scene system

Goal:

- support multiple branded scene families beyond the current mascot motion use case

Deliverables:

- reusable operator libraries
- template packages
- scene presets
- document-size presets and template CRUD for new branded scene families
- better packaging and dependency management per project

## Product warnings

### Warning 1. Over-splitting too early

If every visual sub-step becomes its own package too soon, the graph becomes harder to reason about than the current monolith.

### Warning 2. Renderer-led regression

If Three.js owns placement or document semantics, the rebuild will fail its main purpose.

### Warning 4. Preview-shell product drift

If canonical document rules, scene defaults, or operator surfaces keep living in the overlay-preview app, the repo will slowly recreate a bespoke Ubuntu Summit editor instead of becoming a reusable operator product.

### Warning 3. Print complexity too early

SVG, EPS, PDF, and CMYK matter, but they must remain backend-driven until the kernel is stable.