# Planned Next Step: Fuzzy Boids Point Field

## Status

Planned next-step operator.

Do not implement this until the new repo has:

- a runnable preview shell
- a clear time-step or simulation-state pattern in the graph runtime
- first-pass parity for overlay layout and current motion background

## Goal

Add a boids-style point-field operator inspired by the Houdini setup used in the source project.

The purpose is to generate a richer animated point field that can later feed:

- Three.js instancing
- copy-to-points style geometry placement
- eventually SVG-capable render or export backends

## Backend priority

### First

- Three.js preview support

### Later

- SVG-aware adapter or export path

This operator should still emit renderer-agnostic data.

Three.js is only the first consumer.

## Recommended package shape

Use one coarse operator package first:

- `@brand-layout-ops/operator-fuzzy-boids`

Do not split immediately into separate packages for:

- separation
- alignment
- cohesion
- orientation
- integration
- boundary handling

Reason:

- the simulation terms are tightly coupled
- the parameter surface is easier to reason about as one flock operator
- premature splitting will create interface churn and slow the rebuild

If needed later, these can become internal modules within the package before they become separate public operators.

## Suggested data model

This probably needs a stateful simulation payload rather than a plain static `PointField`.

Recommended new shared types later:

- `BoidRecord`
- `BoidSimulationState`
- `BoidField`

Minimum boid state per point:

- `position`
- `velocity`
- `accel`
- `mass`
- `id`
- `N`
- `up`
- `start_frame`

Field or detail attributes:

- `flock_center`
- optional bounds metadata
- simulation config snapshot if useful for debugging

## Houdini node mapping

### Initialization node

Map this into an initialization step inside the operator:

- seeded velocity
- random velocity perturbation
- normalized direction
- zero acceleration
- mass
- id
- orientation from velocity
- staggered start frame

### Separation behavior

Keep as one internal phase.

Inputs and params:

- `min_dist`
- `max_dist`
- `max_strength`
- `max_neighbours`
- optional falloff ramp representation later

Implementation note:

- this will need neighbor search
- start with brute force if point counts are small
- move to a spatial hash or grid later if needed

### Alignment behavior

Keep heading and speed alignment together initially.

Inputs and params:

- `near_threshold`
- `far_threshold`
- `speed_threshold`
- `max_neighbours`

### Cohesion behavior

Keep as one internal phase driven by field-level flock center.

Inputs and params:

- `min_dist`
- `max_dist`
- `max_accel`

### Orientation update

Support two modes:

- 2D mode
- 3D mode

2D mode:

- `N = normalize(v)`
- ignore extra roll and lift logic

3D mode:

- banking into turns
- conditional lift
- gravity bias
- flock-relative vertical equilibrium
- roll damping
- tiny symmetry-breaking noise

This should remain inside the same operator package for the first version.

### Integration

Preserve the existing feel:

- clamp accel magnitude
- integrate velocity
- clamp speed magnitude
- integrate position
- stabilize orientation
- reset acceleration

### Boundary handling

Boundary SDF is explicitly optional and should be deferred.

Reason:

- Three.js itself does not give you Houdini-style SDF field workflows out of the box
- implementing robust SDF sampling and gradients is possible, but not needed for the first boids pass

Recommended plan:

- first release: support simple box, sphere, or radial bounds
- later: optional signed-distance-field boundary adapter if a real use case survives

## Phase plan

### Phase A

Create the operator package and the state contracts.

### Phase B

Implement 2D boids first.

That includes:

- initialization
- separation
- alignment
- cohesion
- simple integrate
- simple bounds

### Phase C

Wire the output into the existing copy-to-points path for Three.js preview.

### Phase D

Add 3D orientation and banked motion.

### Phase E

Evaluate whether SDF-style boundaries are worth adding.

## Output contract expectations

The operator should produce a field that downstream instance adapters can consume directly.

Important propagated attributes include:

- `pscale`
- `N`
- `up`
- `orient` if available later
- `color` if introduced
- stable `id`

This should align cleanly with the existing copy-to-points operator.

## Warnings

### Warning 1. Do not over-split early

The fuzzy boids system is exactly the kind of thing that becomes messy if every force is made into a separate public operator too soon.

Keep it coarse first.

### Warning 2. Avoid backend leakage

Do not make the boids operator depend on Three.js types.

It should emit generic simulation data only.

### Warning 3. Delay SDF until justified

SDF-based containment is interesting but not a first-pass requirement for the rebuild.

## Intended next action when ready

When the repo is ready for this work, the next model should:

1. add a `@brand-layout-ops/operator-fuzzy-boids` package
2. add a stateful boid-field contract to `core-types`
3. implement 2D boids first
4. connect it to the Three.js-side instancing path before attempting SVG support