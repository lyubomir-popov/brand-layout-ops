# Architecture

## Goal

Provide a stable kernel for a browser-native operator graph that can drive branded layout, procedural background generation, composition, preview, and export.

## Layers

### 1. Canonical document model

Stores:

- frame definitions
- safe areas
- grid settings
- template and style definitions
- content records
- graph wiring
- export intent

### 2. Operator graph runtime

Each operator should be:

- deterministic
- typed
- serializable
- cacheable by inputs and params

### 3. Kernels

Kernels are reusable domain packages, not UI code.

Examples:

- grid kernel
- text layout kernel
- field generator kernel
- geometry instancing kernel
- compositor kernel

### 4. Adapters

Adapters are allowed to be runtime-specific.

Examples:

- Canvas 2D preview
- Three.js preview
- SVG export
- PDF/EPS export

The adapters should consume kernel outputs. They should not become the source of truth.

## Design rule

If a function answers "where does this go?" or "what width should this be?", it belongs in a kernel.

If a function answers "how do I draw this in Three.js or Canvas?", it belongs in an adapter.