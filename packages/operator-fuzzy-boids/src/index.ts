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

export interface FuzzyBoidsParams {
  timeSeconds: number;
  deltaTimeSeconds: number;
  numBoids?: number;
  seed?: number;
  center?: Partial<Vector3>;
  spawnRadiusPx: number;
  staggerStartSeconds?: number;
  initialSpeedPxPerSecond: number;
  initialSpeedJitter?: number;
  minSpeedPxPerSecond: number;
  maxSpeedPxPerSecond: number;
  maxAccelerationPxPerSecond2: number;
  massMin?: number;
  massMax?: number;
  pscaleMin?: number;
  pscaleMax?: number;
  separationRadiusPx: number;
  separationStrength: number;
  alignmentRadiusPx: number;
  alignmentStrength: number;
  cohesionRadiusPx: number;
  cohesionStrength: number;
  centerPullStrength?: number;
  maxNeighbors?: number;
  bounds?: FuzzyBoidsBoundsParams;
  palette?: ColorRgba[];
  prototypeIds?: string[];
}

export interface FuzzyBoidsOutputs extends Record<string, unknown> {
  boidField: BoidField;
  pointField: PointField;
}

interface MutableBoidState {
  id: string;
  position: Vector3;
  velocity: Vector3;
  accel: Vector3;
  mass: number;
  pscale: number;
  startTimeSeconds: number;
  color?: ColorRgba;
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

function clampVectorMagnitude(vector: Vector3, maxMagnitude: number): Vector3 {
  const magnitude = lengthOf(vector);
  if (magnitude <= maxMagnitude || magnitude <= 0.00001) {
    return vector;
  }

  return multiplyVector(vector, maxMagnitude / magnitude);
}

function withSpeedLimits(vector: Vector3, minSpeed: number, maxSpeed: number, fallbackDirection: Vector3): Vector3 {
  const speed = lengthOf(vector);
  if (speed <= 0.00001) {
    return multiplyVector(normalizeVector(fallbackDirection), minSpeed);
  }

  if (speed < minSpeed) {
    return multiplyVector(normalizeVector(vector, fallbackDirection), minSpeed);
  }

  if (speed > maxSpeed) {
    return multiplyVector(normalizeVector(vector, fallbackDirection), maxSpeed);
  }

  return vector;
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

function pickPaletteColor(palette: ColorRgba[] | undefined, index: number): ColorRgba | undefined {
  if (!palette || palette.length === 0) {
    return undefined;
  }

  return palette[index % palette.length];
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

function createSteerForce(currentVelocity: Vector3, desiredVelocity: Vector3, strength: number): Vector3 {
  return multiplyVector(subtractVectors(desiredVelocity, currentVelocity), Math.max(0, strength));
}

function initializeBoids(
  params: FuzzyBoidsParams,
  center: Vector3,
  seedField?: PointField | null
): MutableBoidState[] {
  const rng = createRng(toNumber(params.seed, 1));
  const seededPoints = seedField?.points ?? [];
  const numBoids = Math.max(0, Math.round(toNumber(params.numBoids, seededPoints.length)));
  const safeCount = seededPoints.length > 0 ? Math.min(numBoids || seededPoints.length, seededPoints.length) : numBoids;
  const spawnRadiusPx = Math.max(0, toNumber(params.spawnRadiusPx, 0));
  const baseSpeed = Math.max(0, toNumber(params.initialSpeedPxPerSecond, 0));
  const speedJitter = Math.max(0, toNumber(params.initialSpeedJitter, 0.25));
  const staggerStartSeconds = Math.max(0, toNumber(params.staggerStartSeconds, 0));
  const massMin = Math.max(0.001, toNumber(params.massMin, 0.85));
  const massMax = Math.max(massMin, toNumber(params.massMax, 1.15));
  const pscaleMin = Math.max(0.05, toNumber(params.pscaleMin, 0.55));
  const pscaleMax = Math.max(pscaleMin, toNumber(params.pscaleMax, 1.2));

  return Array.from({ length: safeCount }, (_, index) => {
    const seededPoint = seededPoints[index];
    const angle = rng() * Math.PI * 2;
    const radius = Math.sqrt(rng()) * spawnRadiusPx;
    const seededPosition = seededPoint ? toVector3(seededPoint.position, center) : addVectors(center, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: 0
    });
    const initialDirection = normalizeVector(
      seededPoint ? toVector3(seededPoint.attributes.velocity as Partial<Vector3> | undefined, { x: Math.cos(angle), y: Math.sin(angle), z: 0 }) : { x: Math.cos(angle), y: Math.sin(angle), z: 0 },
      { x: Math.cos(angle), y: Math.sin(angle), z: 0 }
    );
    const speed = Math.max(0, baseSpeed * (1 - speedJitter + rng() * speedJitter * 2));
    const velocity = multiplyVector(initialDirection, speed);
    const pscale = pscaleMin + (pscaleMax - pscaleMin) * clamp(index / Math.max(1, safeCount - 1), 0, 1);
    const color = pickPaletteColor(params.palette, index) ?? (seededPoint?.attributes.color as ColorRgba | undefined);
    const prototypeId = pickPrototypeId(params.prototypeIds, index) ?? (typeof seededPoint?.attributes.prototype_id === "string" ? seededPoint.attributes.prototype_id : undefined);

    return {
      id: seededPoint?.id ?? `boid-${index}`,
      position: seededPosition,
      velocity,
      accel: { x: 0, y: 0, z: 0 },
      mass: massMin + (massMax - massMin) * rng(),
      pscale,
      startTimeSeconds: safeCount <= 1 ? 0 : staggerStartSeconds * (index / Math.max(1, safeCount - 1)),
      ...(color ? { color } : {}),
      ...(prototypeId ? { prototypeId } : {}),
      attributes: seededPoint ? { ...seededPoint.attributes } : {}
    };
  });
}

function stepBoids(states: MutableBoidState[], params: FuzzyBoidsParams, center: Vector3, simulationTimeSeconds: number): void {
  if (states.length === 0) {
    return;
  }

  const dt = Math.max(0.001, toNumber(params.deltaTimeSeconds, 1 / 30));
  const maxNeighbors = Math.max(1, Math.round(toNumber(params.maxNeighbors, 12)));
  const separationRadiusPx = Math.max(0, toNumber(params.separationRadiusPx, 0));
  const alignmentRadiusPx = Math.max(0, toNumber(params.alignmentRadiusPx, 0));
  const cohesionRadiusPx = Math.max(0, toNumber(params.cohesionRadiusPx, 0));
  const separationStrength = Math.max(0, toNumber(params.separationStrength, 0));
  const alignmentStrength = Math.max(0, toNumber(params.alignmentStrength, 0));
  const cohesionStrength = Math.max(0, toNumber(params.cohesionStrength, 0));
  const centerPullStrength = Math.max(0, toNumber(params.centerPullStrength, 0));
  const minSpeed = Math.max(0, toNumber(params.minSpeedPxPerSecond, 0));
  const maxSpeed = Math.max(minSpeed, toNumber(params.maxSpeedPxPerSecond, minSpeed));
  const maxAcceleration = Math.max(0, toNumber(params.maxAccelerationPxPerSecond2, 0));

  const snapshot = states.map((state) => ({
    position: { ...state.position },
    velocity: { ...state.velocity },
    mass: state.mass,
    startTimeSeconds: state.startTimeSeconds
  }));

  for (let index = 0; index < states.length; index += 1) {
    const current = states[index];
    const snapshotCurrent = snapshot[index];
    if (simulationTimeSeconds < current.startTimeSeconds) {
      current.accel = { x: 0, y: 0, z: 0 };
      continue;
    }

    let separationForce = { x: 0, y: 0, z: 0 };
    let alignmentVelocity = { x: 0, y: 0, z: 0 };
    let cohesionCenter = { x: 0, y: 0, z: 0 };
    let alignmentCount = 0;
    let cohesionCount = 0;
    let neighborsSeen = 0;

    for (let neighborIndex = 0; neighborIndex < snapshot.length; neighborIndex += 1) {
      if (neighborIndex === index) {
        continue;
      }

      const neighbor = snapshot[neighborIndex];
      if (simulationTimeSeconds < neighbor.startTimeSeconds) {
        continue;
      }

      const offset = subtractVectors(snapshotCurrent.position, neighbor.position);
      const distance = lengthOf(offset);
      if (distance <= 0.00001) {
        continue;
      }

      neighborsSeen += 1;
      if (neighborsSeen > maxNeighbors) {
        break;
      }

      if (distance <= separationRadiusPx) {
        const falloff = 1 - clamp(distance / Math.max(1, separationRadiusPx), 0, 1);
        separationForce = addVectors(separationForce, multiplyVector(normalizeVector(offset), falloff));
      }

      if (distance <= alignmentRadiusPx) {
        alignmentVelocity = addVectors(alignmentVelocity, neighbor.velocity);
        alignmentCount += 1;
      }

      if (distance <= cohesionRadiusPx) {
        cohesionCenter = addVectors(cohesionCenter, neighbor.position);
        cohesionCount += 1;
      }
    }

    let accel = { x: 0, y: 0, z: 0 };

    if (lengthOf(separationForce) > 0.00001) {
      const desiredSeparationVelocity = multiplyVector(normalizeVector(separationForce), maxSpeed);
      accel = addVectors(accel, createSteerForce(snapshotCurrent.velocity, desiredSeparationVelocity, separationStrength));
    }

    if (alignmentCount > 0) {
      const averageVelocity = divideVector(alignmentVelocity, alignmentCount);
      const desiredAlignmentVelocity = multiplyVector(normalizeVector(averageVelocity, snapshotCurrent.velocity), clamp(lengthOf(averageVelocity), minSpeed, maxSpeed));
      accel = addVectors(accel, createSteerForce(snapshotCurrent.velocity, desiredAlignmentVelocity, alignmentStrength));
    }

    if (cohesionCount > 0) {
      const averagePosition = divideVector(cohesionCenter, cohesionCount);
      const desiredCohesionVelocity = multiplyVector(normalizeVector(subtractVectors(averagePosition, snapshotCurrent.position), snapshotCurrent.velocity), maxSpeed);
      accel = addVectors(accel, createSteerForce(snapshotCurrent.velocity, desiredCohesionVelocity, cohesionStrength));
    }

    if (centerPullStrength > 0) {
      const desiredCenterVelocity = multiplyVector(normalizeVector(subtractVectors(center, snapshotCurrent.position), snapshotCurrent.velocity), maxSpeed);
      accel = addVectors(accel, createSteerForce(snapshotCurrent.velocity, desiredCenterVelocity, centerPullStrength));
    }

    accel = addVectors(accel, getBoundsForce(snapshotCurrent.position, center, params.bounds));
    accel = clampVectorMagnitude(divideVector(accel, current.mass), maxAcceleration);

    const nextVelocity = withSpeedLimits(
      addVectors(snapshotCurrent.velocity, multiplyVector(accel, dt)),
      minSpeed,
      maxSpeed,
      snapshotCurrent.velocity
    );
    const nextPosition = addVectors(snapshotCurrent.position, multiplyVector(nextVelocity, dt));

    current.accel = accel;
    current.velocity = nextVelocity;
    current.position = nextPosition;
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
      ...(state.color ? { color: state.color } : {}),
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

function buildCacheKey(params: FuzzyBoidsParams, centerInput?: Partial<Vector3> | null): string {
  const { timeSeconds: _t, ...rest } = params;
  return JSON.stringify({ p: rest, c: centerInput ?? null });
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

    if (key !== this.cacheKey || !this.states || totalTimeSeconds < this.currentTimeSeconds - 0.0001) {
      this.states = initializeBoids(params, center, seedField);
      this.currentTimeSeconds = 0;
      this.totalSteps = 0;
      this.cacheKey = key;
      this.center = center;
    }

    const stepsNeeded = Math.floor((totalTimeSeconds - this.currentTimeSeconds) / dt);
    for (let i = 0; i < stepsNeeded; i += 1) {
      this.currentTimeSeconds += dt;
      this.totalSteps += 1;
      stepBoids(this.states, params, this.center, this.currentTimeSeconds);
    }

    const remainderSeconds = totalTimeSeconds - this.currentTimeSeconds;
    if (remainderSeconds > 0.00001) {
      stepBoids(this.states, { ...params, deltaTimeSeconds: remainderSeconds }, this.center, totalTimeSeconds);
      this.currentTimeSeconds = totalTimeSeconds;
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
  const fullSteps = Math.floor(totalTimeSeconds / dt);
  const remainderSeconds = totalTimeSeconds - fullSteps * dt;

  for (let stepIndex = 0; stepIndex < fullSteps; stepIndex += 1) {
    stepBoids(states, params, center, (stepIndex + 1) * dt);
  }

  if (remainderSeconds > 0.00001) {
    stepBoids(states, { ...params, deltaTimeSeconds: remainderSeconds }, center, totalTimeSeconds);
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