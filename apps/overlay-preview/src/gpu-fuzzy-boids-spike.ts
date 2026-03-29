import type { BoidField, BoidRecord, PointField, PointRecord, Vector3 } from "@brand-layout-ops/core-types";
import {
  resolveFuzzyBoidOutputs,
  type FuzzyBoidsOutputs,
  type FuzzyBoidsParams
} from "@brand-layout-ops/operator-fuzzy-boids";

const MAX_GPU_SPIKE_BOIDS = 512;

interface GpuProgramInfo {
  program: WebGLProgram;
  uStateTex: WebGLUniformLocation;
  uStaticTex: WebGLUniformLocation;
  uCount: WebGLUniformLocation;
  uTimeSeconds: WebGLUniformLocation;
  uDeltaTimeSeconds: WebGLUniformLocation;
  uWorldScale: WebGLUniformLocation;
  uSeparationMinDist: WebGLUniformLocation;
  uSeparationMaxDist: WebGLUniformLocation;
  uSeparationMaxStrength: WebGLUniformLocation;
  uAlignNearThreshold: WebGLUniformLocation;
  uAlignFarThreshold: WebGLUniformLocation;
  uAlignSpeedThreshold: WebGLUniformLocation;
  uCohesionMinDist: WebGLUniformLocation;
  uCohesionMaxDist: WebGLUniformLocation;
  uCohesionMaxAccel: WebGLUniformLocation;
  uMinSpeedLimit: WebGLUniformLocation;
  uMaxSpeedLimit: WebGLUniformLocation;
  uMinAccelLimit: WebGLUniformLocation;
  uMaxAccelLimit: WebGLUniformLocation;
  uCohesionTargetWorld: WebGLUniformLocation;
  uBoundsKind: WebGLUniformLocation;
  uBoundsRadiusPx: WebGLUniformLocation;
  uBoundsWidthPx: WebGLUniformLocation;
  uBoundsHeightPx: WebGLUniformLocation;
  uBoundsMarginPx: WebGLUniformLocation;
  uBoundsForcePxPerSecond2: WebGLUniformLocation;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

function normalizeVector(vector: Vector3, fallback: Vector3 = { x: 1, y: 0, z: 0 }): Vector3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length <= 0.00001) {
    return fallback;
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function getQueryParamFlag(paramName: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(paramName) === "1";
  } catch {
    return false;
  }
}

export function isGpuFuzzyBoidsSpikeEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (getQueryParamFlag("gpuBoids")) {
    return true;
  }

  try {
    return window.localStorage.getItem("brand-layout-ops-gpu-boids-spike") === "1";
  } catch {
    return false;
  }
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Failed to allocate WebGL shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) || "Unknown shader compile failure.";
    gl.deleteShader(shader);
    throw new Error(info);
  }

  return shader;
}

function getUniform(gl: WebGL2RenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);
  if (!location) {
    throw new Error(`Missing WebGL uniform: ${name}`);
  }

  return location;
}

function createProgram(gl: WebGL2RenderingContext): GpuProgramInfo {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, `#version 300 es
precision highp float;
const vec2 POSITIONS[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);
void main() {
  gl_Position = vec4(POSITIONS[gl_VertexID], 0.0, 1.0);
}`);

  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, `#version 300 es
precision highp float;
precision highp sampler2D;

#define MAX_GPU_SPIKE_BOIDS ${MAX_GPU_SPIKE_BOIDS}

uniform sampler2D uStateTex;
uniform sampler2D uStaticTex;
uniform int uCount;
uniform float uTimeSeconds;
uniform float uDeltaTimeSeconds;
uniform float uWorldScale;
uniform float uSeparationMinDist;
uniform float uSeparationMaxDist;
uniform float uSeparationMaxStrength;
uniform float uAlignNearThreshold;
uniform float uAlignFarThreshold;
uniform float uAlignSpeedThreshold;
uniform float uCohesionMinDist;
uniform float uCohesionMaxDist;
uniform float uCohesionMaxAccel;
uniform float uMinSpeedLimit;
uniform float uMaxSpeedLimit;
uniform float uMinAccelLimit;
uniform float uMaxAccelLimit;
uniform vec2 uCohesionTargetWorld;
uniform int uBoundsKind;
uniform float uBoundsRadiusPx;
uniform float uBoundsWidthPx;
uniform float uBoundsHeightPx;
uniform float uBoundsMarginPx;
uniform float uBoundsForcePxPerSecond2;

out vec4 fragColor;

float saturate(float value) {
  return clamp(value, 0.0, 1.0);
}

vec2 safeNormalize(vec2 value, vec2 fallback) {
  float len = length(value);
  if (len <= 0.00001) {
    return fallback;
  }

  return value / len;
}

vec2 getBoundsAccelWorld(vec2 worldPos) {
  if (uBoundsKind == 0) {
    return vec2(0.0);
  }

  float marginWorld = max(0.00001, uBoundsMarginPx / max(1.0, uWorldScale));
  float forceWorld = max(0.0, uBoundsForcePxPerSecond2 / max(1.0, uWorldScale));

  if (uBoundsKind == 1) {
    float radiusWorld = max(0.00001, uBoundsRadiusPx / max(1.0, uWorldScale));
    float boundaryStartWorld = max(0.0, radiusWorld - marginWorld);
    float distanceWorld = length(worldPos);
    if (distanceWorld <= boundaryStartWorld) {
      return vec2(0.0);
    }

    float overflowWorld = distanceWorld - boundaryStartWorld;
    float strength = saturate(overflowWorld / marginWorld) * forceWorld;
    return safeNormalize(-worldPos, vec2(0.0)) * strength;
  }

  vec2 halfSizeWorld = vec2(uBoundsWidthPx, uBoundsHeightPx) / max(1.0, uWorldScale) * 0.5;
  float accelX = 0.0;
  float accelY = 0.0;

  if (worldPos.x < -halfSizeWorld.x + marginWorld) {
    accelX += saturate(((-halfSizeWorld.x + marginWorld) - worldPos.x) / marginWorld) * forceWorld;
  } else if (worldPos.x > halfSizeWorld.x - marginWorld) {
    accelX -= saturate((worldPos.x - (halfSizeWorld.x - marginWorld)) / marginWorld) * forceWorld;
  }

  if (worldPos.y < -halfSizeWorld.y + marginWorld) {
    accelY += saturate(((-halfSizeWorld.y + marginWorld) - worldPos.y) / marginWorld) * forceWorld;
  } else if (worldPos.y > halfSizeWorld.y - marginWorld) {
    accelY -= saturate((worldPos.y - (halfSizeWorld.y - marginWorld)) / marginWorld) * forceWorld;
  }

  return vec2(accelX, accelY);
}

void main() {
  int index = int(gl_FragCoord.x - 0.5);
  if (index < 0 || index >= uCount) {
    fragColor = vec4(0.0);
    return;
  }

  vec4 stateSample = texelFetch(uStateTex, ivec2(index, 0), 0);
  vec4 staticSample = texelFetch(uStaticTex, ivec2(index, 0), 0);
  float startTimeSeconds = staticSample.x;
  float mass = staticSample.y;

  if (uTimeSeconds < startTimeSeconds) {
    fragColor = stateSample;
    return;
  }

  vec2 positionWorld = stateSample.xy;
  vec2 velocityWorld = stateSample.zw;
  float speed = length(velocityWorld);
  vec2 normalVelocity = speed > 0.00001 ? velocityWorld / speed : vec2(1.0, 0.0);
  vec2 correctionRt = safeNormalize(vec2(normalVelocity.y, -normalVelocity.x), vec2(0.0, 1.0));

  float effectiveRadius = max(uSeparationMaxDist, uAlignFarThreshold);
  float effectiveRadiusSq = effectiveRadius * effectiveRadius;
  float sepDistRange = max(0.001, uSeparationMaxDist - uSeparationMinDist);
  float alignDistRange = max(0.001, uAlignFarThreshold - uAlignNearThreshold);
  float cohesionDistRange = max(0.001, uCohesionMaxDist - uCohesionMinDist);

  vec2 accelWorld = vec2(0.0);

  for (int neighborIndex = 0; neighborIndex < MAX_GPU_SPIKE_BOIDS; neighborIndex += 1) {
    if (neighborIndex >= uCount) {
      break;
    }

    if (neighborIndex == index) {
      continue;
    }

    vec4 neighborStatic = texelFetch(uStaticTex, ivec2(neighborIndex, 0), 0);
    if (uTimeSeconds < neighborStatic.x) {
      continue;
    }

    vec4 neighborState = texelFetch(uStateTex, ivec2(neighborIndex, 0), 0);
    vec2 offsetWorld = neighborState.xy - positionWorld;
    float distanceSq = dot(offsetWorld, offsetWorld);
    if (distanceSq <= 0.0000001 || distanceSq > effectiveRadiusSq) {
      continue;
    }

    float distanceWorld = sqrt(distanceSq);
    vec2 directionToNeighbor = offsetWorld / distanceWorld;

    if (distanceWorld < uSeparationMaxDist) {
      float normalizedDistance = (max(distanceWorld, uSeparationMinDist) - uSeparationMinDist) / sepDistRange;
      float falloff = (1.0 - normalizedDistance) * (1.0 - normalizedDistance);
      float strength = falloff * uSeparationMaxStrength;
      accelWorld += -directionToNeighbor * strength;
    }

    if (distanceWorld < uAlignFarThreshold) {
      float significanceWeight = 1.0 - saturate((distanceWorld - uAlignNearThreshold) / alignDistRange);
      vec2 neighborVelocity = neighborState.zw;
      float neighborSpeed = length(neighborVelocity);
      vec2 normalizedNeighborVelocity = neighborSpeed > 0.00001 ? neighborVelocity / neighborSpeed : vec2(1.0, 0.0);
      float headingCorrectionWeight = 1.0 - dot(normalVelocity, normalizedNeighborVelocity);
      float steerSign = (normalVelocity.x * normalizedNeighborVelocity.y - normalVelocity.y * normalizedNeighborVelocity.x) < 0.0 ? 1.0 : -1.0;
      accelWorld += correctionRt * steerSign * headingCorrectionWeight * significanceWeight;

      vec2 velocityDelta = neighborVelocity - velocityWorld;
      float speedCorrectionWeight = saturate(length(velocityDelta) / max(0.001, uAlignSpeedThreshold));
      accelWorld += velocityDelta * speedCorrectionWeight * significanceWeight;
    }
  }

  vec2 cohesionVector = uCohesionTargetWorld - positionWorld;
  float cohesionDistance = length(cohesionVector);
  vec2 cohesionDirection = cohesionDistance > 0.00001 ? cohesionVector / cohesionDistance : vec2(0.0);
  float clampedCohesionDistance = clamp(cohesionDistance, uCohesionMinDist, uCohesionMaxDist);
  float cohesionStrength = (clampedCohesionDistance / cohesionDistRange) * uCohesionMaxAccel;
  accelWorld += cohesionDirection * cohesionStrength;

  float accelLength = length(accelWorld);
  if (accelLength > 0.00001) {
    accelWorld *= clamp(accelLength, uMinAccelLimit, uMaxAccelLimit) / accelLength;
  }

  vec2 nextVelocityWorld = velocityWorld + accelWorld * mass * uDeltaTimeSeconds;
  float nextSpeed = length(nextVelocityWorld);
  if (nextSpeed > 0.00001) {
    nextVelocityWorld *= clamp(nextSpeed, uMinSpeedLimit, uMaxSpeedLimit) / nextSpeed;
  } else {
    nextVelocityWorld = normalVelocity * uMinSpeedLimit;
  }

  vec2 nextPositionWorld = positionWorld + nextVelocityWorld * uDeltaTimeSeconds;
  vec2 boundsAccelWorld = getBoundsAccelWorld(nextPositionWorld);
  if (boundsAccelWorld.x != 0.0 || boundsAccelWorld.y != 0.0) {
    nextVelocityWorld += boundsAccelWorld * uDeltaTimeSeconds;
    nextPositionWorld += boundsAccelWorld * uDeltaTimeSeconds * uDeltaTimeSeconds;
  }

  fragColor = vec4(nextPositionWorld, nextVelocityWorld);
}`);

  const program = gl.createProgram();
  if (!program) {
    throw new Error("Failed to allocate WebGL program.");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) || "Unknown program link failure.";
    gl.deleteProgram(program);
    throw new Error(info);
  }

  return {
    program,
    uStateTex: getUniform(gl, program, "uStateTex"),
    uStaticTex: getUniform(gl, program, "uStaticTex"),
    uCount: getUniform(gl, program, "uCount"),
    uTimeSeconds: getUniform(gl, program, "uTimeSeconds"),
    uDeltaTimeSeconds: getUniform(gl, program, "uDeltaTimeSeconds"),
    uWorldScale: getUniform(gl, program, "uWorldScale"),
    uSeparationMinDist: getUniform(gl, program, "uSeparationMinDist"),
    uSeparationMaxDist: getUniform(gl, program, "uSeparationMaxDist"),
    uSeparationMaxStrength: getUniform(gl, program, "uSeparationMaxStrength"),
    uAlignNearThreshold: getUniform(gl, program, "uAlignNearThreshold"),
    uAlignFarThreshold: getUniform(gl, program, "uAlignFarThreshold"),
    uAlignSpeedThreshold: getUniform(gl, program, "uAlignSpeedThreshold"),
    uCohesionMinDist: getUniform(gl, program, "uCohesionMinDist"),
    uCohesionMaxDist: getUniform(gl, program, "uCohesionMaxDist"),
    uCohesionMaxAccel: getUniform(gl, program, "uCohesionMaxAccel"),
    uMinSpeedLimit: getUniform(gl, program, "uMinSpeedLimit"),
    uMaxSpeedLimit: getUniform(gl, program, "uMaxSpeedLimit"),
    uMinAccelLimit: getUniform(gl, program, "uMinAccelLimit"),
    uMaxAccelLimit: getUniform(gl, program, "uMaxAccelLimit"),
    uCohesionTargetWorld: getUniform(gl, program, "uCohesionTargetWorld"),
    uBoundsKind: getUniform(gl, program, "uBoundsKind"),
    uBoundsRadiusPx: getUniform(gl, program, "uBoundsRadiusPx"),
    uBoundsWidthPx: getUniform(gl, program, "uBoundsWidthPx"),
    uBoundsHeightPx: getUniform(gl, program, "uBoundsHeightPx"),
    uBoundsMarginPx: getUniform(gl, program, "uBoundsMarginPx"),
    uBoundsForcePxPerSecond2: getUniform(gl, program, "uBoundsForcePxPerSecond2")
  };
}

function createFloatTexture(gl: WebGL2RenderingContext, width: number, data: Float32Array | null): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Failed to allocate WebGL texture.");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, 1, 0, gl.RGBA, gl.FLOAT, data);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

function replaceTextureData(gl: WebGL2RenderingContext, texture: WebGLTexture, width: number, data: Float32Array): void {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, 1, 0, gl.RGBA, gl.FLOAT, data);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

function deleteTexture(gl: WebGL2RenderingContext | null, texture: WebGLTexture | null): void {
  if (gl && texture) {
    gl.deleteTexture(texture);
  }
}

export class GpuFuzzyBoidsSpike {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private programInfo: GpuProgramInfo | null = null;
  private framebuffer: WebGLFramebuffer | null = null;
  private readTexture: WebGLTexture | null = null;
  private writeTexture: WebGLTexture | null = null;
  private staticTexture: WebGLTexture | null = null;
  private stateBuffer = new Float32Array(0);
  private previousStateBuffer = new Float32Array(0);
  private staticBuffer = new Float32Array(0);
  private templateBoids: BoidRecord[] = [];
  private templatePoints: PointRecord[] = [];
  private pointDetail: Record<string, unknown> = {};
  private count = 0;
  private cacheKey = "";
  private currentTimeSeconds = 0;
  private totalSteps = 0;
  private lastDeltaTimeSeconds = 1 / 30;
  private lastError = "";

  reset(): void {
    this.cacheKey = "";
    this.currentTimeSeconds = 0;
    this.totalSteps = 0;
    this.count = 0;
    this.templateBoids = [];
    this.templatePoints = [];
    this.pointDetail = {};
    this.stateBuffer = new Float32Array(0);
    this.previousStateBuffer = new Float32Array(0);
    this.staticBuffer = new Float32Array(0);
    this.lastError = "";
  }

  dispose(): void {
    const gl = this.gl;
    deleteTexture(gl, this.readTexture);
    deleteTexture(gl, this.writeTexture);
    deleteTexture(gl, this.staticTexture);
    if (gl && this.framebuffer) {
      gl.deleteFramebuffer(this.framebuffer);
    }
    if (gl && this.programInfo) {
      gl.deleteProgram(this.programInfo.program);
    }
    this.framebuffer = null;
    this.readTexture = null;
    this.writeTexture = null;
    this.staticTexture = null;
    this.programInfo = null;
    this.gl = null;
    this.canvas = null;
    this.reset();
  }

  private ensureContext(): boolean {
    if (this.gl && this.programInfo && this.framebuffer) {
      return true;
    }

    if (typeof document === "undefined") {
      return false;
    }

    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false
    });
    if (!gl) {
      return false;
    }

    if (!gl.getExtension("EXT_color_buffer_float")) {
      return false;
    }

    this.canvas = canvas;
    this.gl = gl;
    this.programInfo = createProgram(gl);
    this.framebuffer = gl.createFramebuffer();
    return Boolean(this.framebuffer);
  }

  private buildCacheKey(params: FuzzyBoidsParams, center: Vector3, seedField?: PointField | null): string {
    return JSON.stringify({
      center,
      seedField: seedField?.points.map((point) => ({
        id: point.id,
        x: point.position.x,
        y: point.position.y,
        z: point.position.z
      })) ?? null,
      params: {
        worldScale: params.worldScale,
        numBoids: params.numBoids,
        seed: params.seed,
        subSteps: params.subSteps,
        spawnRadiusPx: params.spawnRadiusPx,
        staggerStartSeconds: params.staggerStartSeconds,
        initialSpeed: params.initialSpeed,
        initialSpeedJitter: params.initialSpeedJitter,
        massMin: params.massMin,
        massMax: params.massMax,
        pscaleMin: params.pscaleMin,
        pscaleMax: params.pscaleMax,
        separationMinDist: params.separationMinDist,
        separationMaxDist: params.separationMaxDist,
        separationMaxStrength: params.separationMaxStrength,
        alignNearThreshold: params.alignNearThreshold,
        alignFarThreshold: params.alignFarThreshold,
        alignSpeedThreshold: params.alignSpeedThreshold,
        cohesionMinDist: params.cohesionMinDist,
        cohesionMaxDist: params.cohesionMaxDist,
        cohesionMaxAccel: params.cohesionMaxAccel,
        attractToOrigin: params.attractToOrigin,
        attractOrigin: params.attractOrigin,
        minSpeedLimit: params.minSpeedLimit,
        maxSpeedLimit: params.maxSpeedLimit,
        minAccelLimit: params.minAccelLimit,
        maxAccelLimit: params.maxAccelLimit,
        bounds: params.bounds
      }
    });
  }

  private initializeState(params: FuzzyBoidsParams, center: Vector3, seedField?: PointField | null): boolean {
    if (!this.gl || !this.framebuffer) {
      return false;
    }

    const initialOutputs = resolveFuzzyBoidOutputs({
      ...params,
      timeSeconds: 0,
      deltaTimeSeconds: Math.max(0.001, toNumber(params.deltaTimeSeconds, 1 / 30))
    }, center, seedField);
    const count = initialOutputs.boidField.boids.length;
    if (count === 0 || count > MAX_GPU_SPIKE_BOIDS) {
      return false;
    }

    const worldScale = Math.max(1, toNumber(params.worldScale, 180));
    this.count = count;
    this.templateBoids = initialOutputs.boidField.boids.map((boid) => ({
      ...boid,
      position: { ...boid.position },
      velocity: { ...boid.velocity },
      accel: { ...boid.accel },
      N: { ...boid.N },
      up: { ...boid.up },
      attributes: { ...boid.attributes }
    }));
    this.templatePoints = initialOutputs.pointField.points.map((point) => ({
      ...point,
      position: { ...point.position },
      attributes: { ...point.attributes }
    }));
    this.pointDetail = { ...initialOutputs.pointField.detail };

    this.stateBuffer = new Float32Array(count * 4);
    this.previousStateBuffer = new Float32Array(count * 4);
    this.staticBuffer = new Float32Array(count * 4);

    for (let index = 0; index < count; index += 1) {
      const boid = this.templateBoids[index];
      const offset = index * 4;
      this.stateBuffer[offset] = (boid.position.x - center.x) / worldScale;
      this.stateBuffer[offset + 1] = (boid.position.y - center.y) / worldScale;
      this.stateBuffer[offset + 2] = boid.velocity.x / worldScale;
      this.stateBuffer[offset + 3] = boid.velocity.y / worldScale;
      this.staticBuffer[offset] = boid.startTimeSeconds;
      this.staticBuffer[offset + 1] = boid.mass;
      this.staticBuffer[offset + 2] = Number(boid.attributes.pscale ?? 1);
      this.staticBuffer[offset + 3] = 0;
    }
    this.previousStateBuffer.set(this.stateBuffer);

    if (!this.readTexture || !this.writeTexture || !this.staticTexture || this.canvas?.width !== count) {
      deleteTexture(this.gl, this.readTexture);
      deleteTexture(this.gl, this.writeTexture);
      deleteTexture(this.gl, this.staticTexture);
      this.readTexture = createFloatTexture(this.gl, count, this.stateBuffer);
      this.writeTexture = createFloatTexture(this.gl, count, null);
      this.staticTexture = createFloatTexture(this.gl, count, this.staticBuffer);
    } else {
      replaceTextureData(this.gl, this.readTexture, count, this.stateBuffer);
      replaceTextureData(this.gl, this.staticTexture, count, this.staticBuffer);
    }

    if (this.canvas) {
      this.canvas.width = count;
      this.canvas.height = 1;
    }

    this.currentTimeSeconds = 0;
    this.totalSteps = 0;
    this.lastDeltaTimeSeconds = Math.max(0.001, toNumber(params.deltaTimeSeconds, 1 / 30));
    return true;
  }

  private computeCohesionTargetWorld(params: FuzzyBoidsParams, center: Vector3): { x: number; y: number } {
    const worldScale = Math.max(1, toNumber(params.worldScale, 180));
    if (params.attractToOrigin) {
      const origin = toVector3(params.attractOrigin, center);
      return {
        x: (origin.x - center.x) / worldScale,
        y: (origin.y - center.y) / worldScale
      };
    }

    let centerX = 0;
    let centerY = 0;
    let count = 0;
    for (let index = 0; index < this.count; index += 1) {
      if (this.currentTimeSeconds < this.staticBuffer[index * 4]) {
        continue;
      }

      centerX += this.stateBuffer[index * 4];
      centerY += this.stateBuffer[index * 4 + 1];
      count += 1;
    }

    if (count <= 0) {
      return { x: 0, y: 0 };
    }

    return {
      x: centerX / count,
      y: centerY / count
    };
  }

  private stepGpu(params: FuzzyBoidsParams, stepTimeSeconds: number, deltaTimeSeconds: number, cohesionTargetWorld: { x: number; y: number }): void {
    if (!this.gl || !this.programInfo || !this.framebuffer || !this.readTexture || !this.writeTexture || !this.staticTexture) {
      return;
    }

    const gl = this.gl;
    const boundsKind = params.bounds?.kind === "radial"
      ? 1
      : params.bounds?.kind === "box"
        ? 2
        : 0;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.writeTexture, 0);
    gl.viewport(0, 0, this.count, 1);
    gl.useProgram(this.programInfo.program);
    gl.disable(gl.BLEND);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.readTexture);
    gl.uniform1i(this.programInfo.uStateTex, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.staticTexture);
    gl.uniform1i(this.programInfo.uStaticTex, 1);

    gl.uniform1i(this.programInfo.uCount, this.count);
    gl.uniform1f(this.programInfo.uTimeSeconds, stepTimeSeconds);
    gl.uniform1f(this.programInfo.uDeltaTimeSeconds, deltaTimeSeconds);
    gl.uniform1f(this.programInfo.uWorldScale, Math.max(1, toNumber(params.worldScale, 180)));
    gl.uniform1f(this.programInfo.uSeparationMinDist, Math.max(0, toNumber(params.separationMinDist, 0)));
    gl.uniform1f(this.programInfo.uSeparationMaxDist, Math.max(0.001, toNumber(params.separationMaxDist, 5)));
    gl.uniform1f(this.programInfo.uSeparationMaxStrength, Math.max(0, toNumber(params.separationMaxStrength, 0.25)));
    gl.uniform1f(this.programInfo.uAlignNearThreshold, Math.max(0, toNumber(params.alignNearThreshold, 1)));
    gl.uniform1f(this.programInfo.uAlignFarThreshold, Math.max(0.001, toNumber(params.alignFarThreshold, 5)));
    gl.uniform1f(this.programInfo.uAlignSpeedThreshold, Math.max(0.001, toNumber(params.alignSpeedThreshold, 50)));
    gl.uniform1f(this.programInfo.uCohesionMinDist, Math.max(0, toNumber(params.cohesionMinDist, 20)));
    gl.uniform1f(this.programInfo.uCohesionMaxDist, Math.max(0.001, toNumber(params.cohesionMaxDist, 200)));
    gl.uniform1f(this.programInfo.uCohesionMaxAccel, Math.max(0, toNumber(params.cohesionMaxAccel, 2.5)));
    gl.uniform1f(this.programInfo.uMinSpeedLimit, Math.max(0, toNumber(params.minSpeedLimit, 4)));
    gl.uniform1f(this.programInfo.uMaxSpeedLimit, Math.max(0, toNumber(params.maxSpeedLimit, 12)));
    gl.uniform1f(this.programInfo.uMinAccelLimit, Math.max(0, toNumber(params.minAccelLimit, 0)));
    gl.uniform1f(this.programInfo.uMaxAccelLimit, Math.max(0, toNumber(params.maxAccelLimit, 50)));
    gl.uniform2f(this.programInfo.uCohesionTargetWorld, cohesionTargetWorld.x, cohesionTargetWorld.y);
    gl.uniform1i(this.programInfo.uBoundsKind, boundsKind);
    gl.uniform1f(this.programInfo.uBoundsRadiusPx, Math.max(0, toNumber(params.bounds?.radiusPx, 0)));
    gl.uniform1f(this.programInfo.uBoundsWidthPx, Math.max(0, toNumber(params.bounds?.widthPx, 0)));
    gl.uniform1f(this.programInfo.uBoundsHeightPx, Math.max(0, toNumber(params.bounds?.heightPx, 0)));
    gl.uniform1f(this.programInfo.uBoundsMarginPx, Math.max(0, toNumber(params.bounds?.marginPx, 0)));
    gl.uniform1f(this.programInfo.uBoundsForcePxPerSecond2, Math.max(0, toNumber(params.bounds?.forcePxPerSecond2, 0)));

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const swap = this.readTexture;
    this.readTexture = this.writeTexture;
    this.writeTexture = swap;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private readStateToCpu(): boolean {
    if (!this.gl || !this.framebuffer || !this.readTexture) {
      return false;
    }

    this.previousStateBuffer.set(this.stateBuffer);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.readTexture, 0);
    this.gl.readPixels(0, 0, this.count, 1, this.gl.RGBA, this.gl.FLOAT, this.stateBuffer);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    return true;
  }

  private buildOutputs(params: FuzzyBoidsParams, center: Vector3): FuzzyBoidsOutputs {
    const worldScale = Math.max(1, toNumber(params.worldScale, 180));
    const boids: BoidRecord[] = [];
    const points: PointRecord[] = [];
    let activeBoidCount = 0;

    for (let index = 0; index < this.count; index += 1) {
      const templateBoid = this.templateBoids[index];
      const templatePoint = this.templatePoints[index];
      const offset = index * 4;
      const wx = this.stateBuffer[offset];
      const wy = this.stateBuffer[offset + 1];
      const wvx = this.stateBuffer[offset + 2];
      const wvy = this.stateBuffer[offset + 3];
      const previousVx = this.previousStateBuffer[offset + 2];
      const previousVy = this.previousStateBuffer[offset + 3];
      const position = {
        x: wx * worldScale + center.x,
        y: wy * worldScale + center.y,
        z: 0
      };
      const velocity = {
        x: wvx * worldScale,
        y: wvy * worldScale,
        z: 0
      };
      const accel = {
        x: ((wvx - previousVx) / Math.max(0.001, this.lastDeltaTimeSeconds)) * worldScale,
        y: ((wvy - previousVy) / Math.max(0.001, this.lastDeltaTimeSeconds)) * worldScale,
        z: 0
      };
      const isActive = this.currentTimeSeconds >= this.staticBuffer[offset];
      if (isActive) {
        activeBoidCount += 1;
      }

      const normal = normalizeVector(velocity, { x: 1, y: 0, z: 0 });
      const up = normalizeVector({ x: -normal.y, y: normal.x, z: 0 }, { x: 0, y: 1, z: 0 });
      const boidAttributes = {
        ...templateBoid.attributes,
        boid_active: isActive,
        simulation_backend: "gpu-spike"
      };
      const pointAttributes = {
        ...templatePoint.attributes,
        boid_active: isActive,
        simulation_backend: "gpu-spike"
      };

      boids.push({
        ...templateBoid,
        position,
        velocity,
        accel,
        N: normal,
        up,
        attributes: boidAttributes
      });
      points.push({
        ...templatePoint,
        position,
        attributes: pointAttributes
      });
    }

    return {
      boidField: {
        boids,
        simulation: {
          timeSeconds: this.currentTimeSeconds,
          deltaTimeSeconds: this.lastDeltaTimeSeconds,
          stepCount: this.totalSteps,
          activeBoidCount
        },
        detail: {
          ...this.pointDetail,
          simulation_backend: "gpu-spike",
          gpu_spike_max_boids: MAX_GPU_SPIKE_BOIDS,
          gpu_spike_neighbor_mode: "all-active-neighbors"
        }
      },
      pointField: {
        points,
        detail: {
          ...this.pointDetail,
          simulation_backend: "gpu-spike",
          gpu_spike_max_boids: MAX_GPU_SPIKE_BOIDS,
          gpu_spike_neighbor_mode: "all-active-neighbors"
        }
      }
    };
  }

  resolve(params: FuzzyBoidsParams, centerInput?: Partial<Vector3> | null, seedField?: PointField | null): FuzzyBoidsOutputs | null {
    if (!isGpuFuzzyBoidsSpikeEnabled()) {
      return null;
    }

    if (!this.ensureContext()) {
      return null;
    }

    const center = toVector3(params.center, toVector3(centerInput));
    const key = this.buildCacheKey(params, center, seedField);
    const targetTimeSeconds = Math.max(0, toNumber(params.timeSeconds, 0));
    if (Math.max(0, Math.round(toNumber(params.numBoids, 0))) > MAX_GPU_SPIKE_BOIDS) {
      return null;
    }

    if (key !== this.cacheKey || targetTimeSeconds < this.currentTimeSeconds - 0.0001) {
      if (!this.initializeState(params, center, seedField)) {
        return null;
      }
      this.cacheKey = key;
    }

    const dt = Math.max(0.001, toNumber(params.deltaTimeSeconds, 1 / 30));
    const subSteps = Math.max(1, Math.round(toNumber(params.subSteps, 1)));
    const subDt = dt / subSteps;
    const cohesionTargetWorld = this.computeCohesionTargetWorld(params, center);

    const stepsNeeded = Math.floor((targetTimeSeconds - this.currentTimeSeconds) / dt);
    for (let step = 0; step < stepsNeeded; step += 1) {
      for (let sub = 0; sub < subSteps; sub += 1) {
        const subTime = this.currentTimeSeconds + (sub + 1) * subDt;
        this.stepGpu(params, subTime, subDt, cohesionTargetWorld);
      }
      this.currentTimeSeconds += dt;
      this.totalSteps += 1;
    }

    const remainderSeconds = targetTimeSeconds - this.currentTimeSeconds;
    if (remainderSeconds > 0.00001) {
      const remainderSubDt = remainderSeconds / subSteps;
      for (let sub = 0; sub < subSteps; sub += 1) {
        const subTime = this.currentTimeSeconds + (sub + 1) * remainderSubDt;
        this.stepGpu(params, subTime, remainderSubDt, cohesionTargetWorld);
      }
      this.currentTimeSeconds = targetTimeSeconds;
      this.totalSteps += 1;
      this.lastDeltaTimeSeconds = remainderSeconds;
    } else {
      this.lastDeltaTimeSeconds = dt;
    }

    if (stepsNeeded > 0 || remainderSeconds > 0.00001) {
      if (!this.readStateToCpu()) {
        return null;
      }
    }

    return this.buildOutputs(params, center);
  }
}