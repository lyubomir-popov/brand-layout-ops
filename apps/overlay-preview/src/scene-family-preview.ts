import type { ColorRgba, PointField, PointRecord, Vector3 } from "@brand-layout-ops/core-types";
import { resolveFuzzyBoidOutputs } from "@brand-layout-ops/operator-fuzzy-boids";
import { resolvePhyllotaxisField } from "@brand-layout-ops/operator-phyllotaxis";
import type { HaloFieldConfig } from "@brand-layout-ops/operator-halo-field";
import type { OverlaySceneFamilyKey } from "@brand-layout-ops/operator-overlay-layout";

type PreviewableSceneFamilyKey = Exclude<OverlaySceneFamilyKey, "halo">;

export interface SceneFamilyPreviewState {
  sceneFamilyKey: PreviewableSceneFamilyKey;
  title: string;
  subtitle: string;
  stats: string[];
  pointField: PointField;
}

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

function buildPreviewPalette(haloConfig: HaloFieldConfig): ColorRgba[] {
  const palette = [
    haloConfig.point_style.color,
    haloConfig.spoke_lines.color,
    haloConfig.spoke_lines.echo_color,
    haloConfig.spoke_lines.reference_color
  ];

  return palette
    .map((color) => (typeof color === "string" ? parseHexColor(color) : null))
    .filter((color): color is ColorRgba => color !== null);
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

function drawPreviewLabel(ctx: CanvasRenderingContext2D, previewState: SceneFamilyPreviewState, widthPx: number, heightPx: number): void {
  const insetX = Math.round(widthPx * 0.03);
  const insetY = Math.round(heightPx * 0.06);

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = '600 16px "Ubuntu Sans", "Ubuntu", sans-serif';
  ctx.fillText(previewState.title, insetX, insetY);
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = '400 12px "Ubuntu Sans", "Ubuntu", sans-serif';
  ctx.fillText(previewState.subtitle, insetX, insetY + 18);
  ctx.restore();
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
  ctx.moveTo(point.position.x, point.position.y);
  ctx.lineTo(
    point.position.x + directionX * trailLengthPx,
    point.position.y + directionY * trailLengthPx
  );
  ctx.stroke();
  ctx.restore();
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
      title: "Phyllotaxis",
      subtitle: `${pointField.points.length} procedural points`,
      stats: [
        `Center ${Math.round(center.x)}, ${Math.round(center.y)}`,
        `Radius ${Math.round(minDimensionPx * 0.34)}px`
      ],
      pointField
    };
  }

  const seedField = resolvePhyllotaxisField({
    numPoints: 220,
    radius: minDimensionPx * 0.18,
    radiusFalloff: 0.5,
    angleOffsetDeg: options.playbackTimeSec * 8,
    origin: center
  });
  const fuzzyBoids = resolveFuzzyBoidOutputs({
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
    palette: buildPreviewPalette(options.haloConfig)
  }, center, seedField);

  return {
    sceneFamilyKey: "fuzzy-boids",
    title: "Fuzzy Boids",
    subtitle: `${fuzzyBoids.boidField.simulation.activeBoidCount}/${fuzzyBoids.boidField.boids.length} active`,
    stats: [
      `Center ${Math.round(center.x)}, ${Math.round(center.y)}`,
      `Playback ${options.playbackTimeSec.toFixed(2)}s`
    ],
    pointField: fuzzyBoids.pointField
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

  const center = getPreviewCenter(options.widthPx, options.heightPx, options.haloConfig);
  const gradientRadiusPx = Math.min(options.widthPx, options.heightPx) * 0.42;
  const gradient = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, gradientRadiusPx);
  gradient.addColorStop(0, toCanvasColor(options.haloConfig.spoke_lines.reference_color, 0.12));
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, options.widthPx, options.heightPx);

  const defaultPointColor = options.previewState.sceneFamilyKey === "fuzzy-boids"
    ? options.haloConfig.spoke_lines.echo_color || options.haloConfig.point_style.color
    : options.haloConfig.point_style.color;

  options.previewState.pointField.points.forEach((point, pointIndex) => {
    const pointRadiusPx = getPointRadius(
      point,
      pointIndex,
      options.previewState.pointField.points.length,
      options.previewState.sceneFamilyKey
    );
    const pointAlpha = getPointAlpha(
      point,
      pointIndex,
      options.previewState.pointField.points.length,
      options.previewState.sceneFamilyKey
    );
    const pointColor = (point.attributes.color as ColorRgba | undefined) ?? defaultPointColor;
    const fillStyle = toCanvasColor(pointColor, pointAlpha);

    context.save();
    context.fillStyle = fillStyle;
    context.beginPath();
    context.arc(point.position.x, point.position.y, pointRadiusPx, 0, Math.PI * 2);
    context.fill();
    context.restore();

    if (options.previewState.sceneFamilyKey === "fuzzy-boids" && Boolean(point.attributes.boid_active)) {
      drawFuzzyBoidVelocity(context, point, pointRadiusPx, toCanvasColor(pointColor, pointAlpha * 0.55));
    }
  });

  drawPreviewLabel(context, options.previewState, options.widthPx, options.heightPx);
}