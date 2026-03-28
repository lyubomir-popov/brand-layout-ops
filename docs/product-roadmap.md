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
- layout stays rigorous and document-driven rather than freeform first
- scene families can be swapped behind the same layout and export stack
- halo, boids, phyllotaxis, and future generators should be peers at the scene layer rather than bespoke app branches
- stills, video, SVG, PDF, and EPS remain backend concerns instead of mutating the kernel semantics

It should not try to become a full freeform design tool first.

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
- compositing operator family
- background and layout composition in one graph
- swappable scene-family operators that can drive the same document through different motion systems

Success criteria:

- one campaign document can mix structured layout with procedural motion without bespoke glue code, and can swap one scene family for another without rewriting the layout or export path

### Stage 3. Stakeholder and operator surfaces

Goal:

- separate the operator-facing tuning surface from the stakeholder-facing export surface

Deliverables:

- operator mode for graph and parameter tuning
- stakeholder mode for template, row, and format selection
- document-size and template management without exposing low-level operator tuning
- content validation and safer writeback

### Stage 4. Export backends

Goal:

- support screen and print-oriented outputs through dedicated backends

Deliverables:

- PNG and MP4 parity
- SVG export backend
- PDF or EPS-capable backend
- CMYK intent path with controlled replacement or backend conversion

### Stage 5. Broader brand scene system

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