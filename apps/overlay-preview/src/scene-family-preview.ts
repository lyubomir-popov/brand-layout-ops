import type { BoidField, BoidRecord, ColorRgba, PointField, PointRecord, Vector3 } from "@brand-layout-ops/core-types";
import { FuzzyBoidsSimulation, type FuzzyBoidsBoundsParams } from "@brand-layout-ops/operator-fuzzy-boids";

const fuzzyBoidsSimulation = new FuzzyBoidsSimulation();
import { resolvePhyllotaxisField } from "@brand-layout-ops/operator-phyllotaxis";
import type { HaloFieldConfig } from "@brand-layout-ops/operator-halo-field";
import type { OverlaySceneFamilyKey } from "@brand-layout-ops/operator-overlay-layout";

type PreviewableSceneFamilyKey = Exclude<OverlaySceneFamilyKey, "halo">;

interface BaseSceneFamilyPreviewState {
  pointField: PointField;
  center: Vector3;
}

export interface PhyllotaxisSceneFamilyPreviewState extends BaseSceneFamilyPreviewState {
  sceneFamilyKey: "phyllotaxis";
  maxRadiusPx: number;
  armSteps: number[];
}

export interface FuzzyBoidsSceneFamilyPreviewState extends BaseSceneFamilyPreviewState {
  sceneFamilyKey: "fuzzy-boids";
  boidField: BoidField;
  seedField: PointField;
  bounds: FuzzyBoidsBoundsParams;
  linkRadiusPx: number;
}

export type SceneFamilyPreviewState =
  | PhyllotaxisSceneFamilyPreviewState
  | FuzzyBoidsSceneFamilyPreviewState;

interface SceneFamilyPalette {
  point: ColorRgba;
  accent: ColorRgba;
  echo: ColorRgba;
  reference: ColorRgba;
}

interface LinkSegment {
  from: Vector3;
  to: Vector3;
  alpha: number;
}

interface PointRenderStyle {
  color: ColorRgba;
  alpha: number;
  radiusPx: number;
}

const DEFAULT_SCENE_FAMILY_COLOR: ColorRgba = {
  r: 255,
  g: 255,
  b: 255,
  a: 1
};

export interface BuildSceneFamilyPreviewStateOptions {
  sceneFamilyKey: OverlaySceneFamilyKey;
  widthPx: number;
  heightPx: number;
  playbackTimeSec: number;
  haloConfig: HaloFieldConfig;
}

export interface RenderSceneFamilyPreviewFrameOptions {
  canvas: HTMLCanvasElement;
  widthPx: number;
  heightPx: number;
  transparentBackground: boolean;
  haloConfig: HaloFieldConfig;
  previewState: SceneFamilyPreviewState;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mix(left: number, right: number, amount: number): number {
  return left + (right - left) * clamp(amount, 0, 1);
}

function lengthOf(vector: Vector3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function divideVector(vector: Vector3, scalar: number): Vector3 {
  if (scalar === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  return {
    x: vector.x / scalar,
    y: vector.y / scalar,
    z: vector.z / scalar
  };
}

function normalizeVector(vector: Vector3, fallback: Vector3 = { x: 1, y: 0, z: 0 }): Vector3 {
  const magnitude = lengthOf(vector);
  if (magnitude <= 0.00001) {
    return fallback;
  }

  return divideVector(vector, magnitude);
}

function createPerpendicularUp(normal: Vector3): Vector3 {
  return normalizeVector({ x: -normal.y, y: normal.x, z: 0 }, { x: 0, y: 1, z: 0 });
}

function normalizeCanvasSize(canvas: HTMLCanvasElement, widthPx: number, heightPx: number): void {
  if (canvas.width !== widthPx) {
    canvas.width = widthPx;
  }
  if (canvas.height !== heightPx) {
    canvas.height = heightPx;
  }
}

function parseHexColor(rawColor: string): ColorRgba | null {
  const normalized = rawColor.trim();
  if (!normalized.startsWith("#")) {
    return null;
  }

  const hex = normalized.slice(1);
  if (hex.length === 3) {
    const [red, green, blue] = hex.split("");
    return {
      r: parseInt(`${red}${red}`, 16),
      g: parseInt(`${green}${green}`, 16),
      b: parseInt(`${blue}${blue}`, 16),
      a: 1
    };
  }

  if (hex.length === 6 || hex.length === 8) {
    const alpha = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: alpha
    };
  }

  return null;
}

function normalizeColor(color: ColorRgba | string | undefined, fallback: ColorRgba = DEFAULT_SCENE_FAMILY_COLOR): ColorRgba {
  if (!color) {
    return { ...fallback };
  }

  if (typeof color === "string") {
    return parseHexColor(color) ?? { ...fallback };
  }

  return {
    r: Number(color.r ?? fallback.r),
    g: Number(color.g ?? fallback.g),
    b: Number(color.b ?? fallback.b),
    a: Number(color.a ?? fallback.a ?? 1)
  };
}

function mixColors(left: ColorRgba | string, right: ColorRgba | string, amount: number): ColorRgba {
  const safeLeft = normalizeColor(left);
  const safeRight = normalizeColor(right);
  return {
    r: mix(safeLeft.r, safeRight.r, amount),
    g: mix(safeLeft.g, safeRight.g, amount),
    b: mix(safeLeft.b, safeRight.b, amount),
    a: mix(typeof safeLeft.a === "number" ? safeLeft.a : 1, typeof safeRight.a === "number" ? safeRight.a : 1, amount)
  };
}

function toCanvasColor(color: ColorRgba | string, alpha = 1): string {
  if (typeof color === "string") {
    const parsed = parseHexColor(color);
    if (parsed) {
      return toCanvasColor(parsed, alpha);
    }

    return color;
  }

  const colorAlpha = typeof color.a === "number" ? color.a : 1;
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${clamp(colorAlpha * alpha, 0, 1)})`;
}

function getPreviewCenter(widthPx: number, heightPx: number, haloConfig: HaloFieldConfig): Vector3 {
  return {
    x: Number(haloConfig.composition.center_x_px ?? widthPx * 0.5),
    y: Number(haloConfig.composition.center_y_px ?? heightPx * 0.5),
    z: 0
  };
}

function buildPreviewPalette(haloConfig: HaloFieldConfig): SceneFamilyPalette {
  return {
    point: normalizeColor(haloConfig.point_style.color),
    accent: normalizeColor(haloConfig.spoke_lines.color, normalizeColor(haloConfig.point_style.color)),
    echo: normalizeColor(haloConfig.spoke_lines.echo_color, normalizeColor(haloConfig.point_style.color)),
    reference: normalizeColor(haloConfig.spoke_lines.reference_color, normalizeColor(haloConfig.spoke_lines.color))
  };
}

function getPointRadius(point: PointRecord, pointIndex: number, pointCount: number, sceneFamilyKey: PreviewableSceneFamilyKey): number {
  if (sceneFamilyKey === "fuzzy-boids") {
    const pscale = Number(point.attributes.pscale ?? 0.8);
    return clamp(1.25 + pscale * 1.8, 1.25, 4.5);
  }

  const normalizedIndex = pointCount <= 1 ? 0 : pointIndex / Math.max(1, pointCount - 1);
  return 0.9 + normalizedIndex * 2.1;
}

function getPointAlpha(point: PointRecord, pointIndex: number, pointCount: number, sceneFamilyKey: PreviewableSceneFamilyKey): number {
  if (sceneFamilyKey === "fuzzy-boids") {
    return Boolean(point.attributes.boid_active) ? 0.88 : 0.18;
  }

  const normalizedIndex = pointCount <= 1 ? 1 : pointIndex / Math.max(1, pointCount - 1);
  return 0.22 + normalizedIndex * 0.65;
}



function drawGuideRing(
  ctx: CanvasRenderingContext2D,
  center: Vector3,
  radiusPx: number,
  strokeStyle: string,
  lineWidthPx: number,
  lineDash: number[] = []
): void {
  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidthPx;
  ctx.setLineDash(lineDash);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPointDot(
  ctx: CanvasRenderingContext2D,
  point: PointRecord,
  style: PointRenderStyle
): void {
  ctx.save();
  ctx.fillStyle = toCanvasColor(style.color, style.alpha);
  ctx.beginPath();
  ctx.arc(point.position.x, point.position.y, style.radiusPx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPhyllotaxisArmSet(
  ctx: CanvasRenderingContext2D,
  points: PointRecord[],
  armStep: number,
  strokeColor: ColorRgba | string,
  alpha: number,
  lineWidthPx: number
): void {
  if (armStep < 2 || points.length < armStep * 2) {
    return;
  }

  const arms = Array.from({ length: armStep }, () => [] as PointRecord[]);
  points.forEach((point, index) => {
    arms[index % armStep].push(point);
  });

  ctx.save();
  ctx.strokeStyle = toCanvasColor(strokeColor, alpha);
  ctx.lineWidth = lineWidthPx;

  for (const arm of arms) {
    if (arm.length < 2) {
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(arm[0].position.x, arm[0].position.y);
    for (let index = 1; index < arm.length; index += 1) {
      ctx.lineTo(arm[index].position.x, arm[index].position.y);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function getPhyllotaxisPointStyle(
  point: PointRecord,
  pointIndex: number,
  pointCount: number,
  previewState: PhyllotaxisSceneFamilyPreviewState,
  palette: SceneFamilyPalette
): PointRenderStyle {
  const pointRadius = Number(point.attributes.philo_radius ?? 0);
  const normalizedRadius = previewState.maxRadiusPx <= 0
    ? (pointCount <= 1 ? 0 : pointIndex / Math.max(1, pointCount - 1))
    : clamp(pointRadius / previewState.maxRadiusPx, 0, 1);

  return {
    color: mixColors(palette.point, palette.reference, normalizedRadius * 0.72),
    alpha: 0.18 + normalizedRadius * 0.72,
    radiusPx: 0.9 + normalizedRadius * 2.5
  };
}

function drawPhyllotaxisPreview(
  ctx: CanvasRenderingContext2D,
  previewState: PhyllotaxisSceneFamilyPreviewState,
  haloConfig: HaloFieldConfig,
  widthPx: number,
  heightPx: number
): void {
  const palette = buildPreviewPalette(haloConfig);

  [0.25, 0.5, 0.75, 1].forEach((ratio, index) => {
    drawGuideRing(
      ctx,
      previewState.center,
      previewState.maxRadiusPx * ratio,
      toCanvasColor(index === 3 ? palette.reference : palette.echo, index === 3 ? 0.2 : 0.1),
      index === 3 ? 1.25 : 1,
      index === 3 ? [] : [4, 8]
    );
  });

  previewState.armSteps.forEach((armStep, armIndex) => {
    const strokeColor = armIndex === 0 ? palette.echo : palette.reference;
    drawPhyllotaxisArmSet(ctx, previewState.pointField.points, armStep, strokeColor, armIndex === 0 ? 0.24 : 0.14, armIndex === 0 ? 1.15 : 0.8);
  });

  previewState.pointField.points.forEach((point, pointIndex) => {
    drawPointDot(
      ctx,
      point,
      getPhyllotaxisPointStyle(point, pointIndex, previewState.pointField.points.length, previewState, palette)
    );
  });

  drawGuideRing(ctx, previewState.center, Math.max(3, previewState.maxRadiusPx * 0.025), toCanvasColor(palette.point, 0.7), 1.25);
}

function drawFuzzyBoidVelocity(
  ctx: CanvasRenderingContext2D,
  point: PointRecord,
  pointRadiusPx: number,
  strokeStyle: string
): void {
  const velocity = point.attributes.velocity as Partial<Vector3> | undefined;
  if (!velocity || typeof velocity.x !== "number" || typeof velocity.y !== "number") {
    return;
  }

  const velocityMagnitude = Math.hypot(velocity.x, velocity.y);
  if (velocityMagnitude <= 0.001) {
    return;
  }

  const directionX = velocity.x / velocityMagnitude;
  const directionY = velocity.y / velocityMagnitude;
  const trailLengthPx = pointRadiusPx * 4.2;

  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = Math.max(1, pointRadiusPx * 0.6);
  ctx.beginPath();
  ctx.moveTo(
    point.position.x - directionX * trailLengthPx,
    point.position.y - directionY * trailLengthPx
  );
  ctx.lineTo(
    point.position.x,
    point.position.y
  );
  ctx.stroke();
  ctx.restore();
}

function drawFuzzyBoidGlyph(
  ctx: CanvasRenderingContext2D,
  boid: BoidRecord,
  radiusPx: number,
  fillStyle: string,
  strokeStyle: string
): void {
  const direction = normalizeVector(boid.velocity, { x: 1, y: 0, z: 0 });
  const perpendicular = createPerpendicularUp(direction);
  const head = {
    x: boid.position.x + direction.x * radiusPx * 1.55,
    y: boid.position.y + direction.y * radiusPx * 1.55
  };
  const left = {
    x: boid.position.x - direction.x * radiusPx * 0.7 + perpendicular.x * radiusPx * 0.8,
    y: boid.position.y - direction.y * radiusPx * 0.7 + perpendicular.y * radiusPx * 0.8
  };
  const right = {
    x: boid.position.x - direction.x * radiusPx * 0.7 - perpendicular.x * radiusPx * 0.8,
    y: boid.position.y - direction.y * radiusPx * 0.7 - perpendicular.y * radiusPx * 0.8
  };

  ctx.save();
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = Math.max(0.75, radiusPx * 0.2);
  ctx.beginPath();
  ctx.moveTo(head.x, head.y);
  ctx.lineTo(left.x, left.y);
  ctx.lineTo(right.x, right.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSeedField(
  ctx: CanvasRenderingContext2D,
  seedField: PointField,
  palette: SceneFamilyPalette
): void {
  seedField.points.forEach((point, pointIndex) => {
    const radiusPx = 0.7 + clamp(pointIndex / Math.max(1, seedField.points.length - 1), 0, 1) * 0.8;
    drawPointDot(ctx, point, {
      color: mixColors(palette.reference, palette.echo, 0.35),
      alpha: 0.08,
      radiusPx
    });
  });
}

function getFuzzyBoidLinks(
  boids: BoidRecord[],
  linkRadiusPx: number,
  maxLinks = 280
): LinkSegment[] {
  const links: LinkSegment[] = [];

  for (let leftIndex = 0; leftIndex < boids.length; leftIndex += 1) {
    const left = boids[leftIndex];
    if (!Boolean(left.attributes.boid_active)) {
      continue;
    }

    for (let rightIndex = leftIndex + 1; rightIndex < boids.length; rightIndex += 1) {
      const right = boids[rightIndex];
      if (!Boolean(right.attributes.boid_active)) {
        continue;
      }

      const distancePx = Math.hypot(
        left.position.x - right.position.x,
        left.position.y - right.position.y
      );
      if (distancePx > linkRadiusPx) {
        continue;
      }

      const alpha = Math.pow(1 - clamp(distancePx / Math.max(1, linkRadiusPx), 0, 1), 2) * 0.18;
      if (alpha < 0.015) {
        continue;
      }

      links.push({ from: left.position, to: right.position, alpha });
      if (links.length >= maxLinks) {
        return links;
      }
    }
  }

  return links;
}

function drawFuzzyBoidLinks(
  ctx: CanvasRenderingContext2D,
  links: LinkSegment[],
  strokeColor: ColorRgba | string
): void {
  ctx.save();
  ctx.lineWidth = 1;

  for (const link of links) {
    ctx.strokeStyle = toCanvasColor(strokeColor, link.alpha);
    ctx.beginPath();
    ctx.moveTo(link.from.x, link.from.y);
    ctx.lineTo(link.to.x, link.to.y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBoundsGuide(
  ctx: CanvasRenderingContext2D,
  center: Vector3,
  bounds: FuzzyBoidsBoundsParams,
  palette: SceneFamilyPalette
): void {
  if (bounds.kind === "radial") {
    const radiusPx = Math.max(1, Number(bounds.radiusPx ?? 0));
    const marginPx = Math.max(0, Number(bounds.marginPx ?? 0));

    drawGuideRing(ctx, center, radiusPx, toCanvasColor(palette.reference, 0.24), 1.2);
    if (marginPx > 0 && radiusPx > marginPx) {
      drawGuideRing(ctx, center, radiusPx - marginPx, toCanvasColor(palette.echo, 0.12), 1, [5, 9]);
    }
    return;
  }

  if (bounds.kind !== "box") {
    return;
  }

  const widthPx = Math.max(1, Number(bounds.widthPx ?? 0));
  const heightPx = Math.max(1, Number(bounds.heightPx ?? 0));
  const marginPx = Math.max(0, Number(bounds.marginPx ?? 0));

  ctx.save();
  ctx.strokeStyle = toCanvasColor(palette.reference, 0.22);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(center.x - widthPx * 0.5, center.y - heightPx * 0.5, widthPx, heightPx);

  if (marginPx > 0 && widthPx > marginPx * 2 && heightPx > marginPx * 2) {
    ctx.setLineDash([5, 9]);
    ctx.strokeStyle = toCanvasColor(palette.echo, 0.12);
    ctx.lineWidth = 1;
    ctx.strokeRect(
      center.x - widthPx * 0.5 + marginPx,
      center.y - heightPx * 0.5 + marginPx,
      widthPx - marginPx * 2,
      heightPx - marginPx * 2
    );
  }

  ctx.restore();
}

function drawFuzzyBoidsPreview(
  ctx: CanvasRenderingContext2D,
  previewState: FuzzyBoidsSceneFamilyPreviewState,
  haloConfig: HaloFieldConfig,
  widthPx: number,
  heightPx: number
): void {
  const palette = buildPreviewPalette(haloConfig);

  drawBoundsGuide(ctx, previewState.center, previewState.bounds, palette);
  drawSeedField(ctx, previewState.seedField, palette);
  drawFuzzyBoidLinks(ctx, getFuzzyBoidLinks(previewState.boidField.boids, previewState.linkRadiusPx), palette.echo);

  previewState.boidField.boids.forEach((boid, pointIndex) => {
    const point = previewState.pointField.points[pointIndex];
    if (!point) {
      return;
    }

    const pointRadiusPx = getPointRadius(point, pointIndex, previewState.pointField.points.length, previewState.sceneFamilyKey);
    const pointAlpha = getPointAlpha(point, pointIndex, previewState.pointField.points.length, previewState.sceneFamilyKey);
    const pointColor = normalizeColor(boid.attributes.color as ColorRgba | undefined, palette.echo);
    const isActive = Boolean(boid.attributes.boid_active);

    if (!isActive) {
      drawPointDot(ctx, point, { color: mixColors(pointColor, palette.reference, 0.55), alpha: 0.12, radiusPx: pointRadiusPx * 0.75 });
      return;
    }

    drawFuzzyBoidVelocity(ctx, point, pointRadiusPx, toCanvasColor(pointColor, pointAlpha * 0.52));
    drawFuzzyBoidGlyph(
      ctx,
      boid,
      Math.max(1.2, pointRadiusPx * 0.95),
      toCanvasColor(pointColor, Math.max(0.34, pointAlpha)),
      toCanvasColor(mixColors(pointColor, palette.reference, 0.28), pointAlpha * 0.72)
    );
    drawPointDot(ctx, point, {
      color: mixColors(pointColor, palette.point, 0.2),
      alpha: Math.min(1, pointAlpha + 0.12),
      radiusPx: Math.max(0.95, pointRadiusPx * 0.45)
    });
  });
}

export function clearSceneFamilyPreviewCanvas(canvas: HTMLCanvasElement, widthPx: number, heightPx: number): void {
  normalizeCanvasSize(canvas, widthPx, heightPx);
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, widthPx, heightPx);
}

export function buildSceneFamilyPreviewState(
  options: BuildSceneFamilyPreviewStateOptions
): SceneFamilyPreviewState | null {
  if (options.sceneFamilyKey === "halo") {
    return null;
  }

  const center = getPreviewCenter(options.widthPx, options.heightPx, options.haloConfig);
  const minDimensionPx = Math.min(options.widthPx, options.heightPx);

  if (options.sceneFamilyKey === "phyllotaxis") {
    const pointField = resolvePhyllotaxisField({
      numPoints: 720,
      radius: minDimensionPx * 0.34,
      radiusFalloff: 0.68,
      angleOffsetDeg: options.playbackTimeSec * 14,
      origin: center
    });

    return {
      sceneFamilyKey: "phyllotaxis",
      pointField,
      center,
      maxRadiusPx: Number(pointField.detail.max_radius ?? minDimensionPx * 0.34),
      armSteps: [21, 34]
    };
  }

  const seedField = resolvePhyllotaxisField({
    numPoints: 220,
    radius: minDimensionPx * 0.18,
    radiusFalloff: 0.5,
    angleOffsetDeg: options.playbackTimeSec * 8,
    origin: center
  });
  const fuzzyBoids = fuzzyBoidsSimulation.resolve({
    timeSeconds: options.playbackTimeSec,
    deltaTimeSeconds: 1 / 30,
    numBoids: 220,
    center,
    spawnRadiusPx: minDimensionPx * 0.16,
    initialSpeedPxPerSecond: minDimensionPx * 0.065,
    initialSpeedJitter: 0.35,
    minSpeedPxPerSecond: minDimensionPx * 0.018,
    maxSpeedPxPerSecond: minDimensionPx * 0.09,
    maxAccelerationPxPerSecond2: minDimensionPx * 0.09,
    pscaleMin: 0.4,
    pscaleMax: 1.1,
    separationRadiusPx: minDimensionPx * 0.035,
    separationStrength: 0.55,
    alignmentRadiusPx: minDimensionPx * 0.12,
    alignmentStrength: 0.28,
    cohesionRadiusPx: minDimensionPx * 0.16,
    cohesionStrength: 0.22,
    centerPullStrength: 0.12,
    maxNeighbors: 14,
    bounds: {
      kind: "radial",
      radiusPx: minDimensionPx * 0.28,
      marginPx: minDimensionPx * 0.08,
      forcePxPerSecond2: minDimensionPx * 0.32
    },
    palette: Object.values(buildPreviewPalette(options.haloConfig))
  }, center, seedField);

  const bounds: FuzzyBoidsBoundsParams = {
    kind: "radial",
    radiusPx: minDimensionPx * 0.28,
    marginPx: minDimensionPx * 0.08,
    forcePxPerSecond2: minDimensionPx * 0.32
  };

  return {
    sceneFamilyKey: "fuzzy-boids",
    pointField: fuzzyBoids.pointField,
    center,
    boidField: fuzzyBoids.boidField,
    seedField,
    bounds,
    linkRadiusPx: minDimensionPx * 0.09
  };
}

export function renderSceneFamilyPreviewFrame(
  options: RenderSceneFamilyPreviewFrameOptions
): void {
  normalizeCanvasSize(options.canvas, options.widthPx, options.heightPx);
  const context = options.canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, options.widthPx, options.heightPx);

  if (!options.transparentBackground) {
    context.fillStyle = options.haloConfig.composition.background_color || "#202020";
    context.fillRect(0, 0, options.widthPx, options.heightPx);
  }

  const palette = buildPreviewPalette(options.haloConfig);

  if (options.previewState.sceneFamilyKey === "phyllotaxis") {
    drawPhyllotaxisPreview(context, options.previewState, options.haloConfig, options.widthPx, options.heightPx);
    return;
  }

  drawFuzzyBoidsPreview(context, options.previewState, options.haloConfig, options.widthPx, options.heightPx);
}