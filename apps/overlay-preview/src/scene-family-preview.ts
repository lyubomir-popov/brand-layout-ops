import type { BoidField, ColorRgba, PointField, PointRecord, Vector3 } from "@brand-layout-ops/core-types";
import { FuzzyBoidsSimulation } from "@brand-layout-ops/operator-fuzzy-boids";
import { resolvePhyllotaxisField } from "@brand-layout-ops/operator-phyllotaxis";
import type {
  OverlayBackgroundGraph,
  OverlayFuzzyBoidsConfig,
  OverlayPhyllotaxisConfig,
  OverlayScatterConfig,
  OverlaySceneFamilyKey
} from "@brand-layout-ops/operator-overlay-layout";
import {
  OVERLAY_BACKGROUND_FUZZY_BOIDS_OPERATOR_KEY,
  OVERLAY_BACKGROUND_HALO_OPERATOR_KEY,
  OVERLAY_BACKGROUND_PHYLLOTAXIS_OPERATOR_KEY,
  OVERLAY_BACKGROUND_SCATTER_OPERATOR_KEY
} from "@brand-layout-ops/operator-overlay-layout";
import {
  resolveScatterPointField,
  type ScatterDistributionMode,
} from "@brand-layout-ops/operator-scatter";

const fuzzyBoidsSimulation = new FuzzyBoidsSimulation();
import type { HaloFieldConfig } from "@brand-layout-ops/operator-halo-field";
let fuzzyBoidsPreviewGraphKey = "";

export type FuzzyBoidsPreviewConfig = OverlayFuzzyBoidsConfig;
export type PhyllotaxisPreviewConfig = OverlayPhyllotaxisConfig;
export type ScatterPreviewConfig = OverlayScatterConfig;

type PreviewableSceneFamilyKey = Exclude<OverlaySceneFamilyKey, "halo">;

interface BaseSceneFamilyPreviewState {
  pointField: PointField;
}

export interface PhyllotaxisSceneFamilyPreviewState extends BaseSceneFamilyPreviewState {
  sceneFamilyKey: "phyllotaxis";
  maxRadiusPx: number;
}

export interface FuzzyBoidsSceneFamilyPreviewState extends BaseSceneFamilyPreviewState {
  sceneFamilyKey: "fuzzy-boids";
  boidField: BoidField;
  dotSizePx: number;
}

export interface ScatterSceneFamilyPreviewState extends BaseSceneFamilyPreviewState {
  sceneFamilyKey: "scatter";
  distributionMode: ScatterDistributionMode;
}

export type SceneFamilyPreviewState =
  | PhyllotaxisSceneFamilyPreviewState
  | FuzzyBoidsSceneFamilyPreviewState
  | ScatterSceneFamilyPreviewState;

interface SceneFamilyPalette {
  point: ColorRgba;
  accent: ColorRgba;
  echo: ColorRgba;
  reference: ColorRgba;
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
  backgroundGraph: OverlayBackgroundGraph;
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

function getPointRadius(point: PointRecord, pointIndex: number, pointCount: number, sceneFamilyKey: PreviewableSceneFamilyKey): number {
  if (sceneFamilyKey === "fuzzy-boids") {
    const pscale = Number(point.attributes.pscale ?? 0.8);
    return clamp(1.25 + pscale * 1.8, 1.25, 4.5);
  }

  if (sceneFamilyKey === "scatter") {
    const densityWeight = Number(point.attributes.scatter_density_weight ?? 0.8);
    return clamp(1.1 + densityWeight * 2.4, 1.1, 3.8);
  }

  const normalizedIndex = pointCount <= 1 ? 0 : pointIndex / Math.max(1, pointCount - 1);
  return 0.9 + normalizedIndex * 2.1;
}

function getPointAlpha(point: PointRecord, pointIndex: number, pointCount: number, sceneFamilyKey: PreviewableSceneFamilyKey): number {
  if (sceneFamilyKey === "fuzzy-boids") {
    return Boolean(point.attributes.boid_active) ? 1 : 0;
  }

  if (sceneFamilyKey === "scatter") {
    const densityWeight = Number(point.attributes.scatter_density_weight ?? 0.8);
    return 0.42 + densityWeight * 0.5;
  }

  return 0.96;
}



function drawPointDot(
  ctx: CanvasRenderingContext2D,
  point: PointRecord,
  style: PointRenderStyle
): void {
  ctx.fillStyle = toCanvasColor(style.color, style.alpha);
  ctx.beginPath();
  ctx.arc(point.position.x, point.position.y, style.radiusPx, 0, Math.PI * 2);
  ctx.fill();
}

function getPhyllotaxisPointStyle(
  point: PointRecord,
  pointIndex: number,
  pointCount: number,
  previewState: PhyllotaxisSceneFamilyPreviewState
): PointRenderStyle {
  const pointRadius = Number(point.attributes.philo_radius ?? 0);
  const normalizedRadius = previewState.maxRadiusPx <= 0
    ? (pointCount <= 1 ? 0 : pointIndex / Math.max(1, pointCount - 1))
    : clamp(pointRadius / previewState.maxRadiusPx, 0, 1);

  return {
    color: DEFAULT_SCENE_FAMILY_COLOR,
    alpha: 0.96,
    radiusPx: 0.95 + normalizedRadius * 2.2
  };
}

function drawPhyllotaxisPreview(
  ctx: CanvasRenderingContext2D,
  previewState: PhyllotaxisSceneFamilyPreviewState
): void {
  previewState.pointField.points.forEach((point, pointIndex) => {
    drawPointDot(
      ctx,
      point,
      getPhyllotaxisPointStyle(point, pointIndex, previewState.pointField.points.length, previewState)
    );
  });
}

function drawScatterPreview(
  ctx: CanvasRenderingContext2D,
  previewState: ScatterSceneFamilyPreviewState
): void {
  previewState.pointField.points.forEach((point, pointIndex) => {
    drawPointDot(ctx, point, {
      color: DEFAULT_SCENE_FAMILY_COLOR,
      alpha: getPointAlpha(point, pointIndex, previewState.pointField.points.length, previewState.sceneFamilyKey),
      radiusPx: getPointRadius(point, pointIndex, previewState.pointField.points.length, previewState.sceneFamilyKey)
    });
  });
}

function drawFuzzyBoidsPreview(
  ctx: CanvasRenderingContext2D,
  previewState: FuzzyBoidsSceneFamilyPreviewState
): void {
  previewState.boidField.boids.forEach((boid, pointIndex) => {
    const point = previewState.pointField.points[pointIndex];
    if (!point) {
      return;
    }

    const pointAlpha = getPointAlpha(point, pointIndex, previewState.pointField.points.length, previewState.sceneFamilyKey);
    const isActive = Boolean(boid.attributes.boid_active);

    if (!isActive) {
      return;
    }

    drawPointDot(ctx, point, {
      color: normalizeColor(boid.attributes.color as ColorRgba | undefined, DEFAULT_SCENE_FAMILY_COLOR),
      alpha: pointAlpha,
      radiusPx: Math.max(0.5, previewState.dotSizePx)
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
  const center = getPreviewCenter(options.widthPx, options.heightPx, options.haloConfig);
  const nodesById = new Map(options.backgroundGraph.nodes.map((node) => [node.id, node]));
  const activeNode = nodesById.get(options.backgroundGraph.activeNodeId);
  if (!activeNode || activeNode.operatorKey === OVERLAY_BACKGROUND_HALO_OPERATOR_KEY) {
    return null;
  }

  const incomingEdgesByNodeId = new Map<string, typeof options.backgroundGraph.edges>();
  for (const edge of options.backgroundGraph.edges) {
    const incomingEdges = incomingEdgesByNodeId.get(edge.toNodeId) ?? [];
    incomingEdges.push(edge);
    incomingEdgesByNodeId.set(edge.toNodeId, incomingEdges);
  }

  interface ResolvedBackgroundNode {
    sceneFamilyKey: OverlaySceneFamilyKey;
    pointField?: PointField;
    boidField?: BoidField;
    distributionMode?: ScatterDistributionMode;
    maxRadiusPx?: number;
    dotSizePx?: number;
  }

  const resolvedNodeCache = new Map<string, ResolvedBackgroundNode | null>();
  const resolvingNodeIds = new Set<string>();

  const resolveNode = (nodeId: string): ResolvedBackgroundNode | null => {
    if (resolvedNodeCache.has(nodeId)) {
      return resolvedNodeCache.get(nodeId) ?? null;
    }

    if (resolvingNodeIds.has(nodeId)) {
      return null;
    }

    const node = nodesById.get(nodeId);
    if (!node) {
      resolvedNodeCache.set(nodeId, null);
      return null;
    }

    resolvingNodeIds.add(nodeId);
    const incomingEdges = incomingEdgesByNodeId.get(nodeId) ?? [];
    let resolvedNode: ResolvedBackgroundNode | null = null;

    switch (node.operatorKey) {
      case OVERLAY_BACKGROUND_PHYLLOTAXIS_OPERATOR_KEY: {
        const pc = node.params as OverlayPhyllotaxisConfig;
        const angleOffsetDeg = pc.angleOffsetDeg + (pc.animationEnabled ? options.playbackTimeSec * pc.animationSpeedDegPerSecond : 0);
        const pointField = resolvePhyllotaxisField({
          numPoints: pc.numPoints,
          radius: pc.radiusPx,
          radiusFalloff: pc.radiusFalloff,
          angleOffsetDeg,
          origin: center
        });
        resolvedNode = {
          sceneFamilyKey: "phyllotaxis",
          pointField,
          maxRadiusPx: Number(pointField.detail.max_radius ?? pc.radiusPx)
        };
        break;
      }
      case OVERLAY_BACKGROUND_SCATTER_OPERATOR_KEY: {
        const sc = node.params as OverlayScatterConfig;
        const scatterParams = {
          pointCount: sc.pointCount,
          seed: sc.seed,
          distributionMode: sc.distributionMode,
          marginPx: sc.marginPx,
          shape: {
            kind: sc.shapeKind,
            widthPx: sc.widthPx,
            heightPx: sc.heightPx,
            cornerRadiusPx: sc.cornerRadiusPx,
            svgPath: sc.svgPath,
            origin: center
          }
        };
        resolvedNode = {
          sceneFamilyKey: "scatter",
          pointField: resolveScatterPointField(scatterParams),
          distributionMode: sc.distributionMode
        };
        break;
      }
      case OVERLAY_BACKGROUND_FUZZY_BOIDS_OPERATOR_KEY: {
        const bc = node.params as OverlayFuzzyBoidsConfig;
        const seedEdge = incomingEdges.find((edge) => edge.toPortKey === "seedField");
        const seedSourceNode = seedEdge ? nodesById.get(seedEdge.fromNodeId) ?? null : null;
        const seedField = seedEdge ? resolveNode(seedEdge.fromNodeId)?.pointField ?? null : null;

        // Only reset for graph-topology changes (active node swap, seed wiring).
        // Param changes are handled by the simulation's own structural cache key
        // so behavioral slider drags apply live without replaying from t=0.
        const topologyKey = JSON.stringify({
          activeNodeId: options.backgroundGraph.activeNodeId,
          fuzzyNodeId: node.id,
          seedSourceNodeId: seedSourceNode?.id ?? null,
          seedSourceParams: seedSourceNode?.params ?? null
        });
        if (topologyKey !== fuzzyBoidsPreviewGraphKey) {
          fuzzyBoidsSimulation.reset();
          fuzzyBoidsPreviewGraphKey = topologyKey;
        }

        const fuzzyBoids = fuzzyBoidsSimulation.resolve({
          timeSeconds: options.playbackTimeSec,
          deltaTimeSeconds: 1 / 30,
          subSteps: bc.subSteps,
          worldScale: Math.min(options.widthPx, options.heightPx) / 6,
          numBoids: bc.numBoids,
          seed: bc.seed,
          center,
          spawnRadiusPx: bc.spawnRadiusPx,
          staggerStartSeconds: bc.staggerStartSeconds,
          initialSpeed: bc.initialSpeed,
          initialSpeedJitter: bc.initialSpeedJitter,
          massMin: bc.massMin,
          massMax: bc.massMax,
          pscaleMin: bc.pscaleMin,
          pscaleMax: bc.pscaleMax,
          maxNeighbors: bc.maxNeighbors,
          separationMinDist: bc.separationMinDist,
          separationMaxDist: bc.separationMaxDist,
          separationMaxStrength: bc.separationMaxStrength,
          alignNearThreshold: bc.alignNearThreshold,
          alignFarThreshold: bc.alignFarThreshold,
          alignSpeedThreshold: bc.alignSpeedThreshold,
          cohesionMinDist: bc.cohesionMinDist,
          cohesionMaxDist: bc.cohesionMaxDist,
          cohesionMaxAccel: bc.cohesionMaxAccel,
          attractToOrigin: bc.attractToOrigin,
          minSpeedLimit: bc.minSpeedLimit,
          maxSpeedLimit: bc.maxSpeedLimit,
          minAccelLimit: bc.minAccelLimit,
          maxAccelLimit: bc.maxAccelLimit,
          bounds: {
            kind: bc.boundsKind,
            radiusPx: bc.boundsRadiusPx,
            marginPx: bc.boundsMarginPx,
            forcePxPerSecond2: bc.boundsForcePxPerSecond2,
            ...(bc.boundsKind === "box"
              ? {
                widthPx: options.widthPx,
                heightPx: options.heightPx
              }
              : {})
          }
        }, center, seedField);

        resolvedNode = {
          sceneFamilyKey: "fuzzy-boids",
          pointField: fuzzyBoids.pointField,
          boidField: fuzzyBoids.boidField,
          dotSizePx: Math.max(0.5, bc.dotSizePx ?? 3)
        };
        break;
      }
      default:
        resolvedNode = null;
        break;
    }

    resolvingNodeIds.delete(nodeId);
    resolvedNodeCache.set(nodeId, resolvedNode);
    return resolvedNode;
  };

  const resolvedActiveNode = resolveNode(activeNode.id);
  if (!resolvedActiveNode?.pointField) {
    return null;
  }

  if (resolvedActiveNode.sceneFamilyKey === "phyllotaxis") {
    return {
      sceneFamilyKey: "phyllotaxis",
      pointField: resolvedActiveNode.pointField,
      maxRadiusPx: resolvedActiveNode.maxRadiusPx ?? 0
    };
  }

  if (resolvedActiveNode.sceneFamilyKey === "scatter" && resolvedActiveNode.distributionMode) {
    return {
      sceneFamilyKey: "scatter",
      pointField: resolvedActiveNode.pointField,
      distributionMode: resolvedActiveNode.distributionMode
    };
  }

  if (resolvedActiveNode.sceneFamilyKey === "fuzzy-boids" && resolvedActiveNode.boidField) {
    return {
      sceneFamilyKey: "fuzzy-boids",
      pointField: resolvedActiveNode.pointField,
      boidField: resolvedActiveNode.boidField,
      dotSizePx: resolvedActiveNode.dotSizePx ?? 3
    };
  }

  return null;
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

  if (options.previewState.sceneFamilyKey === "phyllotaxis") {
    drawPhyllotaxisPreview(context, options.previewState);
    return;
  }

  if (options.previewState.sceneFamilyKey === "scatter") {
    drawScatterPreview(context, options.previewState);
    return;
  }

  drawFuzzyBoidsPreview(context, options.previewState);
}