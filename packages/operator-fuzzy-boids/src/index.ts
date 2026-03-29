import type { BoidField, BoidRecord, ColorRgba, OperatorDefinition, PointField, PointRecord, Vector3 } from "@brand-layout-ops/core-types";

export const FUZZY_BOIDS_OPERATOR_KEY = "operator.fuzzy-boids";

export interface FuzzyBoidsBoundsParams {
  kind: "none" | "radial" | "box";
  radiusPx?: number;
  widthPx?: number;
  heightPx?: number;
  marginPx?: number;
  forcePxPerSecond2?: number;
}

/**
 * VEX-aligned boid simulation parameters.
 *
 * All force, distance, speed, and acceleration values are in **world units**
 * matching the Houdini coordinate space (default ~6 units across).
 * `worldScale` (pixels per world unit) bridges pixel-space positions
 * to the world-space simulation and back.
 *
 * Parameter groups match the Houdini solver wrangles:
 * - Solver: subSteps controls how many iterations per render-frame dt
 * - Initial: spawn layout and initial velocity
 * - Separation: distance-normalized repulsion (separation by n wrangle)
 * - Fuzzy Alignment: cross-product heading correction + speed matching
 * - Cohesion: attract toward flock centroid or explicit origin
 * - Integrate: semi-implicit Euler with accel + speed clamping
 * - Bounds: box/radial boundary repulsion (replaces Houdini SDF volumes)
 */
export interface FuzzyBoidsParams {
  timeSeconds: number;
  deltaTimeSeconds: number;
  subSteps?: number;
  worldScale?: number;
  numBoids?: number;
  seed?: number;
  center?: Partial<Vector3>;
  spawnRadiusPx: number;
  staggerStartSeconds?: number;
  initialSpeed: number;
  initialSpeedJitter?: number;
  massMin?: number;
  massMax?: number;
  pscaleMin?: number;
  pscaleMax?: number;
  maxNeighbors?: number;

  // Separation (VEX: separation by n)
  separationMinDist: number;
  separationMaxDist: number;
  separationMaxStrength: number;

  // Fuzzy alignment (VEX: fuzzy alignment wrangle)
  alignNearThreshold: number;
  alignFarThreshold: number;
  alignSpeedThreshold: number;

  // Cohesion (VEX: cohesion wrangle)
  cohesionMinDist: number;
  cohesionMaxDist: number;
  cohesionMaxAccel: number;
  attractToOrigin?: boolean;
  attractOrigin?: Partial<Vector3>;

  // Integration (VEX: integrate wrangle)
  minSpeedLimit: number;
  maxSpeedLimit: number;
  minAccelLimit: number;
  maxAccelLimit: number;

  bounds?: FuzzyBoidsBoundsParams;
  palette?: ColorRgba[];
  prototypeIds?: string[];
}

export interface FuzzyBoidsOutputs extends Record<string, unknown> {
  boidField: BoidField;
  pointField: PointField;
}

const DEFAULT_FUZZY_BOID_COLOR: ColorRgba = {
  r: 255,
  g: 255,
  b: 255,
  a: 1
};

interface MutableBoidState {
  id: string;
  position: Vector3;
  velocity: Vector3;
  accel: Vector3;
  mass: number;
  pscale: number;
  startTimeSeconds: number;
  prototypeId?: string;
  attributes: Record<string, unknown>;
}

function toNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toVector3(value: Partial<Vector3> | null | undefined, fallback: Vector3 = { x: 0, y: 0, z: 0 }): Vector3 {
  return {
    x: toNumber(value?.x, fallback.x),
    y: toNumber(value?.y, fallback.y),
    z: toNumber(value?.z, fallback.z)
  };
}

function addVectors(left: Vector3, right: Vector3): Vector3 {
  return { x: left.x + right.x, y: left.y + right.y, z: left.z + right.z };
}

function subtractVectors(left: Vector3, right: Vector3): Vector3 {
  return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z };
}

function multiplyVector(vector: Vector3, scalar: number): Vector3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

function divideVector(vector: Vector3, scalar: number): Vector3 {
  if (scalar === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  return { x: vector.x / scalar, y: vector.y / scalar, z: vector.z / scalar };
}

function lengthOf(vector: Vector3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function normalizeVector(vector: Vector3, fallback: Vector3 = { x: 1, y: 0, z: 0 }): Vector3 {
  const magnitude = lengthOf(vector);
  if (magnitude <= 0.00001) {
    return fallback;
  }

  return divideVector(vector, magnitude);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}



function createRng(seed: number): () => number {
  let state = Math.floor(seed) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createPerpendicularUp(normal: Vector3): Vector3 {
  return normalizeVector({ x: -normal.y, y: normal.x, z: 0 }, { x: 0, y: 1, z: 0 });
}

function pickPrototypeId(prototypeIds: string[] | undefined, index: number): string | undefined {
  const safePrototypeIds = prototypeIds?.filter((value) => value.trim()) ?? [];
  if (safePrototypeIds.length === 0) {
    return undefined;
  }

  return safePrototypeIds[index % safePrototypeIds.length];
}

function getBoundsForce(position: Vector3, center: Vector3, bounds: FuzzyBoidsBoundsParams | undefined): Vector3 {
  if (!bounds || bounds.kind === "none") {
    return { x: 0, y: 0, z: 0 };
  }

  const marginPx = Math.max(1, toNumber(bounds.marginPx, 40));
  const forcePxPerSecond2 = Math.max(0, toNumber(bounds.forcePxPerSecond2, 180));

  if (bounds.kind === "radial") {
    const radiusPx = Math.max(1, toNumber(bounds.radiusPx, 0));
    const offset = subtractVectors(position, center);
    const distance = lengthOf(offset);
    const boundaryStartPx = Math.max(0, radiusPx - marginPx);
    if (distance <= boundaryStartPx) {
      return { x: 0, y: 0, z: 0 };
    }

    const overflowPx = distance - boundaryStartPx;
    const strength = clamp(overflowPx / marginPx, 0, 1) * forcePxPerSecond2;
    return multiplyVector(normalizeVector(subtractVectors(center, position)), strength);
  }

  const halfWidth = Math.max(1, toNumber(bounds.widthPx, 0)) * 0.5;
  const halfHeight = Math.max(1, toNumber(bounds.heightPx, 0)) * 0.5;
  const minX = center.x - halfWidth;
  const maxX = center.x + halfWidth;
  const minY = center.y - halfHeight;
  const maxY = center.y + halfHeight;

  let accelX = 0;
  let accelY = 0;

  if (position.x < minX + marginPx) {
    accelX += clamp((minX + marginPx - position.x) / marginPx, 0, 1) * forcePxPerSecond2;
  } else if (position.x > maxX - marginPx) {
    accelX -= clamp((position.x - (maxX - marginPx)) / marginPx, 0, 1) * forcePxPerSecond2;
  }

  if (position.y < minY + marginPx) {
    accelY += clamp((minY + marginPx - position.y) / marginPx, 0, 1) * forcePxPerSecond2;
  } else if (position.y > maxY - marginPx) {
    accelY -= clamp((position.y - (maxY - marginPx)) / marginPx, 0, 1) * forcePxPerSecond2;
  }

  return { x: accelX, y: accelY, z: 0 };
}



function stripInheritedVisualAttributes(attributes: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!attributes) {
    return {};
  }

  const nextAttributes = { ...attributes };
  delete nextAttributes.color;
  return nextAttributes;
}

function initializeBoids(
  params: FuzzyBoidsParams,
  center: Vector3,
  seedField?: PointField | null
): MutableBoidState[] {
  const rng = createRng(toNumber(params.seed, 1));
  const seededPoints = seedField?.points ?? [];
  const hasExplicitNumBoids = params.numBoids !== undefined && params.numBoids !== null;
  const numBoids = hasExplicitNumBoids
    ? Math.max(0, Math.round(toNumber(params.numBoids, seededPoints.length)))
    : seededPoints.length;
  const spawnRadiusPx = Math.max(0, toNumber(params.spawnRadiusPx, 0));
  const worldScale = Math.max(1, toNumber(params.worldScale, 180));
  // VEX: v@v = {0, -10, 0} * ch('speed') — initialSpeed is the ch('speed')
  // channel; the VEX direction vector {0,-10,0} gives magnitude 10*speed.
  // We use random direction instead of uniform downward, same magnitude.
  const baseSpeedWorld = Math.max(0, toNumber(params.initialSpeed, 0)) * 10;
  const baseSpeedPx = baseSpeedWorld * worldScale;
  const speedJitter = Math.max(0, toNumber(params.initialSpeedJitter, 0.25));
  const staggerStartSeconds = Math.max(0, toNumber(params.staggerStartSeconds, 0));
  const massMin = Math.max(0.001, toNumber(params.massMin, 0.85));
  const massMax = Math.max(massMin, toNumber(params.massMax, 1.15));
  const pscaleMin = Math.max(0.05, toNumber(params.pscaleMin, 0.55));
  const pscaleMax = Math.max(pscaleMin, toNumber(params.pscaleMax, 1.2));

  return Array.from({ length: numBoids }, (_, index) => {
    const seededPoint = seededPoints[index];
    const angle = rng() * Math.PI * 2;
    const radius = Math.sqrt(rng()) * spawnRadiusPx;
    const seededPosition = seededPoint ? toVector3(seededPoint.position, center) : addVectors(center, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: 0
    });
    // VEX initial direction: default downward with jitter, or from seed
    const initialDirection = normalizeVector(
      seededPoint ? toVector3(seededPoint.attributes.velocity as Partial<Vector3> | undefined, { x: Math.cos(angle), y: Math.sin(angle), z: 0 }) : { x: Math.cos(angle), y: Math.sin(angle), z: 0 },
      { x: Math.cos(angle), y: Math.sin(angle), z: 0 }
    );
    const speed = Math.max(0, baseSpeedPx * (1 - speedJitter + rng() * speedJitter * 2));
    const velocity = multiplyVector(initialDirection, speed);
    const pscale = pscaleMin + (pscaleMax - pscaleMin) * rng();
    const prototypeId = pickPrototypeId(params.prototypeIds, index) ?? (typeof seededPoint?.attributes.prototype_id === "string" ? seededPoint.attributes.prototype_id : undefined);

    return {
      id: seededPoint?.id ?? `boid-${index}`,
      // VEX: @P.z = 0 — flatten to XY plane
      position: { x: seededPosition.x, y: seededPosition.y, z: 0 },
      // VEX: @v.z = 0
      velocity: { x: velocity.x, y: velocity.y, z: 0 },
      accel: { x: 0, y: 0, z: 0 },
      mass: massMin + (massMax - massMin) * rng(),
      pscale,
      startTimeSeconds: numBoids <= 1 ? 0 : staggerStartSeconds * (index / Math.max(1, numBoids - 1)),
      ...(prototypeId ? { prototypeId } : {}),
      attributes: seededPoint ? stripInheritedVisualAttributes(seededPoint.attributes) : {}
    };
  });
}

/**
 * VEX-faithful boid step — runs in world coordinates internally.
 *
 * Converts pixel-space positions/velocities → world-space, computes all forces
 * in the original Houdini coordinate system (preserving the intentional
 * dimensional mixing), integrates, then converts back to pixel-space.
 *
 * Mirrors the Houdini solver wrangle order:
 *   1. Separation by N — distance-normalized repulsion with quadratic falloff
 *   2. Fuzzy alignment — per-neighbor heading correction (cross-product left/right)
 *      plus per-neighbor speed matching
 *   3. Cohesion — attract toward flock centroid (or explicit origin)
 *   4. Integration — clamp accel, semi-implicit Euler (v += accel * mass * dt),
 *      clamp speed, flatten to XY, integrate position
 *   5. Bounds — box/radial pixel-space containment (applied after accel clamp
 *      as an override, similar to Houdini SDF volumes)
 */
function stepBoids(states: MutableBoidState[], params: FuzzyBoidsParams, center: Vector3, simulationTimeSeconds: number): void {
  const n = states.length;
  if (n === 0) {
    return;
  }

  const worldScale = Math.max(1, toNumber(params.worldScale, 180));
  const invScale = 1 / worldScale;
  const dt = Math.max(0.001, toNumber(params.deltaTimeSeconds, 1 / 30));
  const maxNeighborsParam = Math.round(toNumber(params.maxNeighbors, 0));
  const maxNeighbors = maxNeighborsParam > 0 ? maxNeighborsParam : n;
  const needSort = maxNeighbors < n;

  // Separation params (VEX: separation by n) — all in world units
  const sepMinDist = Math.max(0, toNumber(params.separationMinDist, 0));
  const sepMaxDist = Math.max(sepMinDist + 0.001, toNumber(params.separationMaxDist, 5));
  const sepMaxStrength = Math.max(0, toNumber(params.separationMaxStrength, 0.25));
  const sepDistRange = sepMaxDist - sepMinDist;

  // Fuzzy alignment params (VEX: fuzzy alignment wrangle) — world units
  const alignNear = Math.max(0, toNumber(params.alignNearThreshold, 1));
  const alignFar = Math.max(alignNear + 0.001, toNumber(params.alignFarThreshold, 5));
  const alignSpeedThreshold = Math.max(0.001, toNumber(params.alignSpeedThreshold, 50));
  const alignDistRange = alignFar - alignNear;

  // Cohesion params (VEX: cohesion wrangle) — world units
  const cohMinDist = Math.max(0, toNumber(params.cohesionMinDist, 20));
  const cohMaxDist = Math.max(cohMinDist + 0.001, toNumber(params.cohesionMaxDist, 200));
  const cohMaxAccel = Math.max(0, toNumber(params.cohesionMaxAccel, 2.5));
  const cohDistRange = cohMaxDist - cohMinDist;
  const attractToOrigin = Boolean(params.attractToOrigin);

  // Integration params (VEX: integrate wrangle) — world units
  const minSpeedLimit = Math.max(0, toNumber(params.minSpeedLimit, 4));
  const maxSpeedLimit = Math.max(minSpeedLimit, toNumber(params.maxSpeedLimit, 12));
  const minAccelLimit = Math.max(0, toNumber(params.minAccelLimit, 0));
  const maxAccelLimit = Math.max(minAccelLimit, toNumber(params.maxAccelLimit, 50));

  // Effective interaction radius — neighbors beyond this contribute zero
  // force from both separation and alignment, so skip them entirely.
  const effectiveRadius = Math.max(sepMaxDist, alignFar);
  const effectiveRadiusSq = effectiveRadius * effectiveRadius;

  // --- Flat snapshot arrays (no per-step heap allocation) ---
  const wxArr = new Float64Array(n);
  const wyArr = new Float64Array(n);
  const wvxArr = new Float64Array(n);
  const wvyArr = new Float64Array(n);
  const activeArr = new Uint8Array(n);

  let fcx = 0;
  let fcy = 0;
  let activeCount = 0;
  for (let i = 0; i < n; i += 1) {
    const s = states[i];
    const wx = (s.position.x - center.x) * invScale;
    const wy = (s.position.y - center.y) * invScale;
    wxArr[i] = wx;
    wyArr[i] = wy;
    wvxArr[i] = s.velocity.x * invScale;
    wvyArr[i] = s.velocity.y * invScale;
    const isActive = simulationTimeSeconds >= s.startTimeSeconds ? 1 : 0;
    activeArr[i] = isActive;
    if (isActive) {
      fcx += wx;
      fcy += wy;
      activeCount += 1;
    }
  }
  if (activeCount > 0) {
    fcx /= activeCount;
    fcy /= activeCount;
  }

  // Cohesion target in world space
  let ctX: number;
  let ctY: number;
  if (attractToOrigin) {
    const origin = toVector3(params.attractOrigin, center);
    ctX = (origin.x - center.x) * invScale;
    ctY = (origin.y - center.y) * invScale;
  } else {
    ctX = fcx;
    ctY = fcy;
  }

  // Pre-allocated typed-array buffers for top-k neighbor selection (zero per-frame allocations).
  // Sized to maxNeighbors; reused across all boids within a step.
  const topKIdx = needSort ? new Int32Array(maxNeighbors) : null;
  const topKDistSq = needSort ? new Float64Array(maxNeighbors) : null;

  for (let index = 0; index < n; index += 1) {
    const current = states[index];
    if (!activeArr[index]) {
      current.accel = { x: 0, y: 0, z: 0 };
      continue;
    }

    let ax = 0;
    let ay = 0;
    const wx = wxArr[index];
    const wy = wyArr[index];
    const wvx = wvxArr[index];
    const wvy = wvyArr[index];
    const wSpeedSq = wvx * wvx + wvy * wvy;
    const wSpeed = Math.sqrt(wSpeedSq);
    const nvx = wSpeed > 0.00001 ? wvx / wSpeed : 1;
    const nvy = wSpeed > 0.00001 ? wvy / wSpeed : 0;

    // correction_rt for fuzzy alignment
    const crtx = nvy;
    const crty = -nvx;
    const crtLenSq = crtx * crtx + crty * crty;
    const crtLen = Math.sqrt(crtLenSq);
    const ncrtx = crtLen > 0.00001 ? crtx / crtLen : 0;
    const ncrty = crtLen > 0.00001 ? crty / crtLen : 1;

    if (needSort) {
      // Zero-allocation top-k nearest neighbor selection.
      // Uses pre-allocated typed arrays; defers sqrt to the final k neighbors.
      const tkIdx = topKIdx!;
      const tkDSq = topKDistSq!;
      let nbrCount = 0;
      let worstSlot = 0;
      let worstDSq = 0;

      for (let ni = 0; ni < n; ni += 1) {
        if (ni === index || !activeArr[ni]) { continue; }
        const dx = wxArr[ni] - wx;
        const dy = wyArr[ni] - wy;
        const distSq = dx * dx + dy * dy;
        if (distSq <= 0.0000000001) { continue; }

        if (nbrCount < maxNeighbors) {
          tkIdx[nbrCount] = ni;
          tkDSq[nbrCount] = distSq;
          if (distSq > worstDSq) {
            worstDSq = distSq;
            worstSlot = nbrCount;
          }
          nbrCount += 1;
        } else if (distSq < worstDSq) {
          tkIdx[worstSlot] = ni;
          tkDSq[worstSlot] = distSq;
          // Rescan to find new worst among k entries
          worstSlot = 0;
          worstDSq = tkDSq[0];
          for (let s = 1; s < maxNeighbors; s += 1) {
            if (tkDSq[s] > worstDSq) {
              worstDSq = tkDSq[s];
              worstSlot = s;
            }
          }
        }
      }

      // Apply forces for the k nearest; compute sqrt only here
      for (let k = 0; k < nbrCount; k += 1) {
        applyNeighborForces(tkIdx[k], Math.sqrt(tkDSq[k]));
      }
    } else {
      // No sort needed — iterate all neighbors with distance cutoff
      for (let ni = 0; ni < n; ni += 1) {
        if (ni === index || !activeArr[ni]) { continue; }
        const dx = wxArr[ni] - wx;
        const dy = wyArr[ni] - wy;
        const distSq = dx * dx + dy * dy;
        if (distSq <= 0.0000000001 || distSq > effectiveRadiusSq) { continue; }
        const dist = Math.sqrt(distSq);
        applyNeighborForces(ni, dist);
      }
    }

    function applyNeighborForces(ni: number, dist: number): void {
      const nwx = wxArr[ni];
      const nwy = wyArr[ni];
      const nwvx = wvxArr[ni];
      const nwvy = wvyArr[ni];
      const dx = nwx - wx;
      const dy = nwy - wy;
      const ndx = dx / dist;
      const ndy = dy / dist;

      // === SEPARATION ===
      if (dist < sepMaxDist) {
        const normDist = (Math.max(dist, sepMinDist) - sepMinDist) / sepDistRange;
        const falloff = (1 - normDist) * (1 - normDist);
        const strength = falloff * sepMaxStrength;
        ax += -ndx * strength;
        ay += -ndy * strength;
      }

      // === FUZZY ALIGNMENT ===
      if (dist < alignFar) {
        const fitDist = clamp((dist - alignNear) / alignDistRange, 0, 1);
        const sigW = 1 - fitDist;

        const nVelSq = nwvx * nwvx + nwvy * nwvy;
        const nSpeed = Math.sqrt(nVelSq);
        const nnvx = nSpeed > 0.00001 ? nwvx / nSpeed : 1;
        const nnvy = nSpeed > 0.00001 ? nwvy / nSpeed : 0;

        // heading correction
        const hcw = 1 - (nvx * nnvx + nvy * nnvy);
        const crossZ = nvx * nnvy - nvy * nnvx;
        const steerSign = crossZ < 0 ? 1 : -1;
        ax += ncrtx * steerSign * hcw * sigW;
        ay += ncrty * steerSign * hcw * sigW;

        // speed correction
        const vdx = nwvx - wvx;
        const vdy = nwvy - wvy;
        const speedDiffSq = vdx * vdx + vdy * vdy;
        const speedDiff = Math.sqrt(speedDiffSq);
        const scw = clamp(speedDiff / alignSpeedThreshold, 0, 1);
        ax += vdx * scw * sigW;
        ay += vdy * scw * sigW;
      }
    }

    // === COHESION (VEX: cohesion wrangle) ===
    const cVecX = ctX - wx;
    const cVecY = ctY - wy;
    const cDistSq = cVecX * cVecX + cVecY * cVecY;
    const cDist = Math.sqrt(cDistSq);
    const cNormX = cDist > 0.00001 ? cVecX / cDist : 0;
    const cNormY = cDist > 0.00001 ? cVecY / cDist : 0;
    const clampedCDist = clamp(cDist, cohMinDist, cohMaxDist);
    const cohStr = (clampedCDist / cohDistRange) * cohMaxAccel;
    ax += cNormX * cohStr;
    ay += cNormY * cohStr;

    // === INTEGRATION (VEX: integrate wrangle) — all in world units ===
    const accelMag = Math.sqrt(ax * ax + ay * ay);
    if (accelMag > 0.00001) {
      const clampedAccelMag = clamp(accelMag, minAccelLimit, maxAccelLimit);
      const accelScale = clampedAccelMag / accelMag;
      ax *= accelScale;
      ay *= accelScale;
    }

    let newVx = wvx + ax * current.mass * dt;
    let newVy = wvy + ay * current.mass * dt;

    const newSpeedSq = newVx * newVx + newVy * newVy;
    let newSpeed = Math.sqrt(newSpeedSq);
    if (newSpeed > 0.00001) {
      const clampedSpeed = clamp(newSpeed, minSpeedLimit, maxSpeedLimit);
      const speedScale = clampedSpeed / newSpeed;
      newVx *= speedScale;
      newVy *= speedScale;
      newSpeed = clampedSpeed;
    } else {
      newVx = nvx * minSpeedLimit;
      newVy = nvy * minSpeedLimit;
    }

    let newWx = wx + newVx * dt;
    let newWy = wy + newVy * dt;

    // --- Convert back to pixel space ---
    let newPxVx = newVx * worldScale;
    let newPxVy = newVy * worldScale;
    let newPxX = newWx * worldScale + center.x;
    let newPxY = newWy * worldScale + center.y;

    // === BOUNDS (pixel-space containment, applied after integration) ===
    const boundsForce = getBoundsForce({ x: newPxX, y: newPxY, z: 0 }, center, params.bounds);
    if (boundsForce.x !== 0 || boundsForce.y !== 0) {
      newPxVx += boundsForce.x * dt;
      newPxVy += boundsForce.y * dt;
      newPxX += boundsForce.x * dt * dt;
      newPxY += boundsForce.y * dt * dt;
    }

    current.accel = { x: ax * worldScale, y: ay * worldScale, z: 0 };
    current.velocity = { x: newPxVx, y: newPxVy, z: 0 };
    current.position = { x: newPxX, y: newPxY, z: 0 };
  }
}

function toBoidRecord(state: MutableBoidState, timeSeconds: number): BoidRecord {
  const normal = normalizeVector(state.velocity, { x: 1, y: 0, z: 0 });
  const up = createPerpendicularUp(normal);
  const isActive = timeSeconds >= state.startTimeSeconds;

  return {
    id: state.id,
    position: state.position,
    velocity: state.velocity,
    accel: state.accel,
    mass: state.mass,
    N: normal,
    up,
    startTimeSeconds: state.startTimeSeconds,
    attributes: {
      ...state.attributes,
      boid_active: isActive,
      pscale: state.pscale,
      speed_px_per_second: lengthOf(state.velocity),
      color: DEFAULT_FUZZY_BOID_COLOR,
      ...(state.prototypeId ? { prototype_id: state.prototypeId } : {})
    }
  };
}

function toPointRecord(boid: BoidRecord, index: number): PointRecord {
  return {
    id: boid.id,
    position: boid.position,
    attributes: {
      ...boid.attributes,
      boid_index: index,
      velocity: boid.velocity,
      accel: boid.accel,
      mass: boid.mass,
      start_time_seconds: boid.startTimeSeconds,
      N: boid.N,
      normal: boid.N,
      up: boid.up
    }
  };
}

function buildOutputs(states: MutableBoidState[], center: Vector3, totalTimeSeconds: number, dt: number, stepCount: number, boundsKind: string): FuzzyBoidsOutputs {
  const boids = states.map((state) => toBoidRecord(state, totalTimeSeconds));
  const activeBoidCount = boids.filter((boid) => Boolean(boid.attributes.boid_active)).length;
  const boidField: BoidField = {
    boids,
    simulation: {
      timeSeconds: totalTimeSeconds,
      deltaTimeSeconds: dt,
      stepCount,
      activeBoidCount
    },
    detail: {
      center,
      boid_count: boids.length,
      active_boid_count: activeBoidCount,
      bounds_kind: boundsKind
    }
  };

  return {
    boidField,
    pointField: {
      points: boids.map((boid, index) => toPointRecord(boid, index)),
      detail: {
        center,
        boid_count: boids.length,
        active_boid_count: activeBoidCount,
        bounds_kind: boundsKind,
        time_seconds: totalTimeSeconds
      }
    }
  };
}

/**
 * Structural cache key — only includes params that require a full re-init
 * (boid count, seed, spawn geometry, initial speed, mass/pscale ranges).
 * Force-tuning params (separation, alignment, cohesion, speed limits, bounds)
 * are intentionally excluded so slider drags apply live without replaying
 * the entire simulation from t=0.
 */
function buildCacheKey(params: FuzzyBoidsParams, centerInput?: Partial<Vector3> | null): string {
  return JSON.stringify({
    n: params.numBoids,
    s: params.seed,
    r: params.spawnRadiusPx,
    st: params.staggerStartSeconds,
    is: params.initialSpeed,
    ij: params.initialSpeedJitter,
    ws: params.worldScale,
    mMin: params.massMin,
    mMax: params.massMax,
    pMin: params.pscaleMin,
    pMax: params.pscaleMax,
    c: centerInput ?? null
  });
}

/**
 * Incremental boid simulation that caches state across frames.
 * Only steps forward from the last cached time instead of re-simulating
 * from time 0 on every call.
 */
export class FuzzyBoidsSimulation {
  private states: MutableBoidState[] | null = null;
  private currentTimeSeconds = 0;
  private totalSteps = 0;
  private cacheKey = "";
  private center: Vector3 = { x: 0, y: 0, z: 0 };

  reset(): void {
    this.states = null;
    this.currentTimeSeconds = 0;
    this.totalSteps = 0;
    this.cacheKey = "";
  }

  resolve(params: FuzzyBoidsParams, centerInput?: Partial<Vector3> | null, seedField?: PointField | null): FuzzyBoidsOutputs {
    const center = toVector3(params.center, toVector3(centerInput));
    const totalTimeSeconds = Math.max(0, toNumber(params.timeSeconds, 0));
    const dt = Math.max(0.001, toNumber(params.deltaTimeSeconds, 1 / 30));
    const key = buildCacheKey(params, centerInput);

    let justReset = false;
    if (key !== this.cacheKey || !this.states || totalTimeSeconds < this.currentTimeSeconds - 0.0001) {
      this.states = initializeBoids(params, center, seedField);
      this.currentTimeSeconds = 0;
      this.totalSteps = 0;
      this.cacheKey = key;
      this.center = center;
      justReset = true;
    }

    // subSteps: subdivide each render-frame dt (mirrors Houdini Solver SOP SubSteps)
    const subSteps = Math.max(1, Math.round(toNumber(params.subSteps, 1)));
    const subDt = dt / subSteps;
    const subParams = subSteps > 1 ? { ...params, deltaTimeSeconds: subDt } : params;

    // After a structural reset, only step one frame forward instead of
    // replaying the entire history to the current playback time (which
    // would freeze the UI for seconds).  The caller's animation loop
    // will naturally advance from here.
    const targetTimeSeconds = justReset ? Math.min(totalTimeSeconds, dt) : totalTimeSeconds;

    const stepsNeeded = Math.floor((targetTimeSeconds - this.currentTimeSeconds) / dt);
    for (let i = 0; i < stepsNeeded; i += 1) {
      for (let sub = 0; sub < subSteps; sub += 1) {
        const subTime = this.currentTimeSeconds + (sub + 1) * subDt;
        stepBoids(this.states, subParams, this.center, subTime);
      }
      this.currentTimeSeconds += dt;
      this.totalSteps += 1;
    }

    const remainderSeconds = targetTimeSeconds - this.currentTimeSeconds;
    if (remainderSeconds > 0.00001) {
      const remainderSubDt = remainderSeconds / subSteps;
      const remainderSubParams = subSteps > 1 ? { ...params, deltaTimeSeconds: remainderSubDt } : { ...params, deltaTimeSeconds: remainderSeconds };
      for (let sub = 0; sub < subSteps; sub += 1) {
        const subTime = this.currentTimeSeconds + (sub + 1) * remainderSubDt;
        stepBoids(this.states, remainderSubParams, this.center, subTime);
      }
      this.currentTimeSeconds = targetTimeSeconds;
      this.totalSteps += 1;
    }

    return buildOutputs(this.states, this.center, totalTimeSeconds, dt, this.totalSteps, params.bounds?.kind ?? "none");
  }
}

export function resolveFuzzyBoidOutputs(params: FuzzyBoidsParams, centerInput?: Partial<Vector3> | null, seedField?: PointField | null): FuzzyBoidsOutputs {
  const center = toVector3(params.center, toVector3(centerInput));
  const states = initializeBoids(params, center, seedField);
  const totalTimeSeconds = Math.max(0, toNumber(params.timeSeconds, 0));
  const dt = Math.max(0.001, toNumber(params.deltaTimeSeconds, 1 / 30));
  const subSteps = Math.max(1, Math.round(toNumber(params.subSteps, 1)));
  const subDt = dt / subSteps;
  const subParams = subSteps > 1 ? { ...params, deltaTimeSeconds: subDt } : params;
  const fullSteps = Math.floor(totalTimeSeconds / dt);
  const remainderSeconds = totalTimeSeconds - fullSteps * dt;

  for (let stepIndex = 0; stepIndex < fullSteps; stepIndex += 1) {
    for (let sub = 0; sub < subSteps; sub += 1) {
      const subTime = stepIndex * dt + (sub + 1) * subDt;
      stepBoids(states, subParams, center, subTime);
    }
  }

  if (remainderSeconds > 0.00001) {
    const remainderSubDt = remainderSeconds / subSteps;
    const remainderSubParams = subSteps > 1 ? { ...params, deltaTimeSeconds: remainderSubDt } : { ...params, deltaTimeSeconds: remainderSeconds };
    for (let sub = 0; sub < subSteps; sub += 1) {
      const subTime = fullSteps * dt + (sub + 1) * remainderSubDt;
      stepBoids(states, remainderSubParams, center, subTime);
    }
  }

  return buildOutputs(states, center, totalTimeSeconds, dt, fullSteps + (remainderSeconds > 0.00001 ? 1 : 0), params.bounds?.kind ?? "none");
}

export const fuzzyBoidsOperator: OperatorDefinition<FuzzyBoidsParams> = {
  key: FUZZY_BOIDS_OPERATOR_KEY,
  version: "0.1.0",
  inputs: [
    {
      key: "center",
      kind: "vector3",
      description: "Optional external center used as the flock anchor and bounds origin."
    },
    {
      key: "seedField",
      kind: "point-field",
      description: "Optional seed point field used to initialize boid positions and inherited attributes."
    }
  ],
  outputs: [
    {
      key: "boidField",
      kind: "boid-field",
      description: "Resolved boid records with velocity, acceleration, mass, and orientation state."
    },
    {
      key: "pointField",
      kind: "point-field",
      description: "Point-field projection of the boid simulation suitable for copy-to-points and renderer adapters."
    }
  ],
  run({ params, inputs }) {
    return resolveFuzzyBoidOutputs(
      params,
      inputs.center as Partial<Vector3> | null | undefined,
      inputs.seedField as PointField | null | undefined
    );
  }
};