/**
 * halo-renderer.ts — Three.js renderer for the halo field animation.
 * Faithful port of the rendering pipeline from racoon-anim rendering.js.
 *
 * Creates a WebGLRenderer with an orthographic camera, instanced circle/segment
 * layers, and renders: background spokes → dots → thin spokes → thick spokes →
 * echo markers.
 */
import * as THREE from "three";
import { createCircleLayer, createSegmentLayer, type CircleLayer, type SegmentLayer } from "./three-primitives.js";
import {
  type HaloFieldConfig,
  type IntroFieldState,
  type PostFinaleFieldState,
  type MascotBox,
  type Spoke,
  type RuntimePoint,
  type RuntimeTiming,
  type EchoMarkerVariant,
  TAU,
  clamp,
  lerp,
  smoothstep,
  radians,
  wrapPositive,
  getEchoMarkerVariant,
  buildIntroHaloFieldState,
  buildPostFinaleHaloFieldState,
  buildRuntimeTiming,
  buildRuntimePoints,
  createDefaultHaloFieldConfig,
  UBUNTU_RELEASE_LABELS
} from "@brand-layout-ops/operator-halo-field";

// ─── Constants ────────────────────────────────────────────────────────

const BACKGROUND_SPOKE_WIDTH_PX = 1;
const BACKGROUND_SPOKE_FADE_SEGMENTS = 16;
const ECHO_PLUS_SIZE_PX = 8;
const ECHO_MARKER_HALO_GAP_PX = 4;
const ECHO_TEXT_BASE_FONT_SIZE_PX = 18;
const TEXT_LABEL_FONT_FAMILY = '"Ubuntu Sans", "Ubuntu", sans-serif';
const TEXT_LABEL_MARGIN_PX = 16;

const LAYER_ORDER = {
  backgroundSpokes: 1,
  points: 5,
  haloThinSpokes: 10,
  haloThickSpokes: 11,
  haloEchoDots: 15,
  haloEchoMarks: 16
};

const LAYER_CAPACITIES = {
  backgroundSpokes: 2048,
  points: 8192,
  haloThinSpokes: 512,
  haloThickSpokes: 512,
  haloEchoDots: 8192,
  haloEchoMarks: 8192
};

// ─── renderer interface ───────────────────────────────────────────────

export interface HaloRendererConfig {
  canvas: HTMLCanvasElement;
  textOverlayCanvas: HTMLCanvasElement;
  widthPx: number;
  heightPx: number;
}

export interface HaloRendererLayers {
  backgroundSpokes: SegmentLayer;
  points: CircleLayer;
  haloThinSpokes: SegmentLayer;
  haloThickSpokes: SegmentLayer;
  haloEchoDots: CircleLayer;
  haloEchoMarks: SegmentLayer;
}

export interface HaloRenderer {
  /** Resize stage to the given pixel dimensions. */
  resize(widthPx: number, heightPx: number): void;
  /** Render one frame with the current field config. */
  renderFrame(config: HaloFieldConfig, mascotBox: MascotBox | null, timeSec: number): void;
  /** Dispose all GPU resources. */
  dispose(): void;
  /** Access to the canvas element. */
  canvas: HTMLCanvasElement;
  /** Access to the text overlay canvas. */
  textOverlayCanvas: HTMLCanvasElement;
}

// ─── Create renderer ──────────────────────────────────────────────────

export function createHaloRenderer(opts: HaloRendererConfig): HaloRenderer {
  const { canvas, textOverlayCanvas } = opts;
  let stageW = opts.widthPx;
  let stageH = opts.heightPx;
  const debugTriangleEnabled = new URLSearchParams(window.location.search).get("debugThree") === "triangle";

  // Three.js setup — orthographic camera in pixel space
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(stageW, stageH, false);
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = true;
  (renderer as unknown as Record<string, boolean>).sortObjects = false;

  const camera = new THREE.OrthographicCamera(0, stageW, stageH, 0, -100, 100);
  camera.position.set(0, 0, 10);

  const scene = new THREE.Scene();
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  let debugTriangleMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null = null;
  if (debugTriangleEnabled) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([
        stageW * 0.18, stageH * 0.82, 0,
        stageW * 0.82, stageH * 0.72, 0,
        stageW * 0.52, stageH * 0.18, 0
      ], 3)
    );
    const material = new THREE.MeshBasicMaterial({
      color: "#2dff87",
      depthTest: false,
      depthWrite: false
    });
    material.toneMapped = false;
    debugTriangleMesh = new THREE.Mesh(geometry, material);
    debugTriangleMesh.frustumCulled = false;
    debugTriangleMesh.renderOrder = 999;
    worldGroup.add(debugTriangleMesh);
  }

  // Instanced layers
  const layers: HaloRendererLayers = {
    backgroundSpokes: createSegmentLayer(LAYER_CAPACITIES.backgroundSpokes, "#333333", LAYER_ORDER.backgroundSpokes),
    points: createCircleLayer(LAYER_CAPACITIES.points, "#ffffff", LAYER_ORDER.points),
    haloThinSpokes: createSegmentLayer(LAYER_CAPACITIES.haloThinSpokes, "#666666", LAYER_ORDER.haloThinSpokes),
    haloThickSpokes: createSegmentLayer(LAYER_CAPACITIES.haloThickSpokes, "#ffffff", LAYER_ORDER.haloThickSpokes),
    haloEchoDots: createCircleLayer(LAYER_CAPACITIES.haloEchoDots, "#444444", LAYER_ORDER.haloEchoDots),
    haloEchoMarks: createSegmentLayer(LAYER_CAPACITIES.haloEchoMarks, "#444444", LAYER_ORDER.haloEchoMarks)
  };

  for (const layer of Object.values(layers)) {
    worldGroup.add(layer.mesh);
  }

  // Text overlay 2D context
  const textCtx = textOverlayCanvas.getContext("2d")!;

  // Scene state — rebuilt when config changes
  let cachedConfigJSON = "";
  let introField: IntroFieldState | null = null;
  let runtimePoints: RuntimePoint[] = [];
  let runtimeTiming: RuntimeTiming | null = null;

  // Screensaver state
  let spokeWidthPhaseUBySource = new Map<number, number>();
  let spokeClipCenterXBySource = new Map<number, number>();
  let lastWidthTransitionTimeSec: number | null = null;
  let previousPlaybackTimeSec: number | null = null;

  /** Rebuild intro field + runtime points when config changes. */
  function ensureSceneData(config: HaloFieldConfig, mascotBox: MascotBox | null) {
    const key = JSON.stringify(config);
    if (key !== cachedConfigJSON) {
      cachedConfigJSON = key;
      introField = buildIntroHaloFieldState(config, mascotBox);
      runtimeTiming = buildRuntimeTiming(config);
      runtimePoints = buildRuntimePoints(config, introField, runtimeTiming);
    }
  }

  // ── helpers ─────────────────────────────────────────────────────────

  function clearLayers() {
    for (const layer of Object.values(layers)) {
      layer.clear();
    }
  }

  function finalizeLayers() {
    for (const layer of Object.values(layers)) {
      layer.finalize();
    }
  }

  function updateLayerColors(config: HaloFieldConfig) {
    layers.backgroundSpokes.setColor(config.spoke_lines.construction_color);
    layers.points.setColor(config.point_style.color);
    layers.haloThinSpokes.setColor(config.spoke_lines.reference_color);
    layers.haloThickSpokes.setColor(config.spoke_lines.color);
    const echoColor = config.spoke_lines.echo_color || config.spoke_lines.color;
    layers.haloEchoDots.setColor(echoColor);
    layers.haloEchoMarks.setColor(echoColor);
  }

  function getGeometryScale(box: MascotBox | null): number {
    return box ? box.draw_size_px / 600 : 1;
  }

  function getFullFrameOuterRadius(cx: number, cy: number): number {
    const dx = Math.max(cx, stageW - cx);
    const dy = Math.max(cy, stageH - cy);
    return Math.hypot(dx, dy);
  }

  function getRadialFadeAlpha(radius: number, fullR: number, config: HaloFieldConfig): number {
    const strength = clamp(config.vignette?.shape_fade ?? 1, 0, 1);
    if (strength <= 0 || fullR <= 0) return 1;
    const startU = clamp(config.vignette?.shape_fade_start ?? 0.3, 0, 1);
    const endU = clamp(config.vignette?.shape_fade_end ?? 1.0, startU + 0.01, 1);
    const innerR = fullR * startU;
    const outerR = fullR * endU;
    const fadeU = clamp((radius - innerR) / Math.max(1, outerR - innerR), 0, 1);
    return 1 - strength * fadeU;
  }

  function getScreensaverStartTimeSec(config: HaloFieldConfig): number {
    return Math.max(0, Number(config.transition_wrangle?.duration_sec || 0));
  }

  function hasDynamicScreensaverMotion(config: HaloFieldConfig): boolean {
    const maxOrbitCount = Math.max(1, Number(config.generator_wrangle.num_orbits || 1));
    const minOrbitCount = clamp(
      Number(config.generator_wrangle.min_active_orbits || 1),
      1,
      maxOrbitCount
    );
    const orbitMotion = config.screensaver?.pulse_orbits !== false && maxOrbitCount - minOrbitCount > 0.001;
    const maxSpokeCount = Math.max(1, Number(config.generator_wrangle.spoke_count || 1));
    const minSpokeCount = clamp(
      Number(config.screensaver?.min_spoke_count ?? maxSpokeCount),
      1,
      maxSpokeCount
    );
    const spokeMotion = Boolean(config.screensaver?.pulse_spokes) && maxSpokeCount - minSpokeCount > 0.001;
    return orbitMotion || spokeMotion;
  }

  function getScreensaverPulseU(config: HaloFieldConfig, timeSec: number, screensaverStartTimeSec: number): number {
    const safeCycleSec = Math.max(0.001, Number(config.screensaver?.cycle_sec || 60));
    if (timeSec <= screensaverStartTimeSec) {
      return 1;
    }

    const loopTimeSec = timeSec - screensaverStartTimeSec;
    const rawPulseU = 0.5 + 0.5 * Math.cos((loopTimeSec / safeCycleSec) * TAU);
    const rampInSec = Math.max(0, Number(config.screensaver?.ramp_in_sec ?? 0));
    if (rampInSec <= 0) {
      return rawPulseU;
    }

    return lerp(1, rawPulseU, smoothstep(0, rampInSec, loopTimeSec));
  }

  function getEffectiveOrbitCount(
    config: HaloFieldConfig,
    timeSec: number,
    screensaverStartTimeSec: number
  ): number {
    const maxOrbitCount = Math.max(1, Number(config.generator_wrangle.num_orbits || 1));
    const minOrbitCount = clamp(
      Number(config.generator_wrangle.min_active_orbits || 1),
      1,
      maxOrbitCount
    );
    if (
      !config.screensaver?.pulse_orbits ||
      !hasDynamicScreensaverMotion(config) ||
      timeSec <= screensaverStartTimeSec
    ) {
      return maxOrbitCount;
    }

    const pulseU = getScreensaverPulseU(config, timeSec, screensaverStartTimeSec);
    return clamp(lerp(minOrbitCount, maxOrbitCount, pulseU), minOrbitCount, maxOrbitCount);
  }

  function getEffectiveSpokeCount(
    config: HaloFieldConfig,
    timeSec: number,
    screensaverStartTimeSec: number
  ): number {
    const maxSpokeCount = Math.max(1, Number(config.generator_wrangle.spoke_count || 1));
    const minSpokeCount = clamp(
      Number(config.screensaver?.min_spoke_count ?? maxSpokeCount),
      1,
      maxSpokeCount
    );
    if (
      !config.screensaver?.pulse_spokes ||
      !hasDynamicScreensaverMotion(config) ||
      timeSec <= screensaverStartTimeSec
    ) {
      return maxSpokeCount;
    }

    const pulseU = getScreensaverPulseU(config, timeSec, screensaverStartTimeSec);
    return clamp(lerp(minSpokeCount, maxSpokeCount, pulseU), minSpokeCount, maxSpokeCount);
  }

  // ── background spokes ───────────────────────────────────────────────

  function pushBackgroundSpokes(
    spokes: Spoke[],
    fullFrameR: number,
    config: HaloFieldConfig
  ) {
    const bgWidth = BACKGROUND_SPOKE_WIDTH_PX * getGeometryScale(null);
    const cx = config.composition.center_x_px;
    const cy = config.composition.center_y_px;

    for (const spoke of spokes) {
      if (spoke.seam_overlay_only) continue;
      const spokeAlpha = clamp(spoke.alpha ?? 1, 0, 1);
      if (spokeAlpha <= 0) continue;

      const cosA = Math.cos(spoke.angle);
      const sinA = Math.sin(spoke.angle);

      for (let seg = 0; seg < BACKGROUND_SPOKE_FADE_SEGMENTS; seg++) {
        const t0 = seg / BACKGROUND_SPOKE_FADE_SEGMENTS;
        const t1 = (seg + 1) / BACKGROUND_SPOKE_FADE_SEGMENTS;
        const r0 = lerp(spoke.start_radius, fullFrameR, t0);
        const r1 = lerp(spoke.start_radius, fullFrameR, t1);
        const midR = (r0 + r1) * 0.5;
        const fade = getRadialFadeAlpha(midR, fullFrameR, config);
        if (fade <= 0) continue;
        layers.backgroundSpokes.push(
          cx + cosA * r0, cy + sinA * r0,
          cx + cosA * r1, cy + sinA * r1,
          bgWidth,
          spokeAlpha * fade
        );
      }
    }
  }

  // ── dots (intro field — animated spiral) ─────────────────────────────

  function pushAnimatedIntroPoints(
    timeSec: number,
    forceFinal: boolean,
    config: HaloFieldConfig,
    timing: RuntimeTiming
  ) {
    const alphaRampDur = Math.max(0, config.transition_wrangle.alpha_ramp_duration_sec || 0);

    for (const pt of runtimePoints) {
      if (!forceFinal && timeSec < pt.birth_sec) continue;
      if (
        !forceFinal &&
        config.transition_wrangle.hide_invisible_by_pscale &&
        timeSec < pt.visible_sec
      ) continue;

      // Angle: spiral easing from spawn rotation to target
      let angle = pt.target_angle;
      if (!forceFinal) {
        const liveAgeSec = Math.max(0, timeSec - pt.birth_sec);
        const liveAngle = timing.spawn_angle_rad - pt.speed_rad_per_sec * liveAgeSec;

        const capDurSec = Math.max(0.0001, timing.dot_end_sec - pt.capture_start_sec);
        const rawCapU = clamp((timeSec - pt.capture_start_sec) / capDurSec, 0, 1);
        const capU = rawCapU * rawCapU * (3 - 2 * rawCapU); // Hermite smoothstep

        const deltaAngle = wrapPositive(liveAngle - pt.target_angle, TAU);
        angle = liveAngle - deltaAngle * capU;
      }

      const px = pt.center_x_px + Math.cos(angle) * pt.radius;
      const py = pt.center_y_px + Math.sin(angle) * pt.radius;

      // Alpha ramp
      let pointAlpha = config.point_style.alpha;
      if (!forceFinal && alphaRampDur > 0) {
        const alphaStart = Math.max(pt.birth_sec, pt.visible_sec);
        pointAlpha *= smoothstep(alphaStart, alphaStart + alphaRampDur, timeSec);
      }
      if (pointAlpha <= 0) continue;

      // Flash-on-capture: sine bell in last 20% of capture window
      if (!forceFinal) {
        const flashCapDur = Math.max(0.0001, timing.dot_end_sec - pt.capture_start_sec);
        const flashRawU = clamp((timeSec - pt.capture_start_sec) / flashCapDur, 0, 1);
        if (flashRawU >= 0.8) {
          const flashU = (flashRawU - 0.8) / 0.2;
          pointAlpha = Math.min(1, pointAlpha * (1 + 1.8 * Math.sin(flashU * Math.PI)));
        }
      }

      layers.points.push(px, py, pt.radius_px * 2, pt.radius_px * 2, pointAlpha);
    }
  }

  // ── dots (post-finale field) ────────────────────────────────────────

  function pushPostFinalePoints(
    fieldState: PostFinaleFieldState,
    config: HaloFieldConfig
  ) {
    for (const pt of fieldState.points) {
      const alpha = config.point_style.alpha * pt.alpha;
      if (alpha <= 0 || pt.radius_px <= 0) continue;
      layers.points.push(pt.x, pt.y, pt.radius_px * 2, pt.radius_px * 2, alpha);
    }
  }

  // ── finale reveal state ──────────────────────────────────────────────

  interface RevealState {
    haloU: number;
    startAngleRad: number;
    innerRadiusPx: number;
    outerRadiusPx: number;
  }

  function getFinaleHaloU(
    playbackTimeSec: number,
    timing: RuntimeTiming,
    config: HaloFieldConfig,
    forceFinal: boolean
  ): number {
    if (!config.finale?.enabled) return 0;
    if (forceFinal) return 1;
    return smoothstep(timing.finale_start_sec, timing.finale_end_sec, playbackTimeSec);
  }

  function getRevealState(
    config: HaloFieldConfig,
    box: MascotBox | null,
    fullFrameR: number,
    haloU: number,
    forceFinal: boolean
  ): RevealState | null {
    if (!box) return null;
    return {
      haloU: config.finale?.enabled ? (forceFinal ? 1 : haloU) : 1,
      startAngleRad:
        radians((config.finale?.start_angle_deg ?? 0) + (config.finale?.mask_angle_offset_deg ?? 0)) +
        radians(config.composition.global_rotation_deg || 0),
      innerRadiusPx: box.draw_size_px * clamp(config.finale?.halo_inner_radius_u ?? 0.2, 0.01, 0.5),
      outerRadiusPx: fullFrameR
    };
  }

  /** Soft-edged angle sweep reveal alpha (for echo dots). */
  function getRevealLocalAlpha(
    localX: number, localY: number,
    reveal: RevealState | null,
    spokeCount: number
  ): number {
    if (!reveal) return 1;
    if (reveal.haloU >= 0.999) return 1;
    if (reveal.haloU <= 0) return 0;

    const r = Math.hypot(localX, localY);
    if (r < reveal.innerRadiusPx - 0.01 || r > reveal.outerRadiusPx + 0.01) return 0;

    const pointAngle = Math.atan2(localY, localX);
    const sweepDist = wrapPositive(reveal.startAngleRad - pointAngle, TAU);
    const sweepLimit = TAU * reveal.haloU;
    const softness = TAU * 0.45 / Math.max(1, spokeCount);
    return 1 - smoothstep(sweepLimit, sweepLimit + softness, sweepDist);
  }

  /** Hard-edged angle sweep reveal alpha (for spokes/markers). */
  function getSpokeRevealAlpha(
    localX: number, localY: number,
    reveal: RevealState | null
  ): number {
    if (!reveal) return 1;
    if (reveal.haloU >= 0.999) return 1;
    if (reveal.haloU <= 0) return 0;

    const r = Math.hypot(localX, localY);
    if (r < reveal.innerRadiusPx - 0.01 || r > reveal.outerRadiusPx + 0.01) return 0;

    const pointAngle = Math.atan2(localY, localX);
    const sweepDist = wrapPositive(reveal.startAngleRad - pointAngle, TAU);
    const sweepLimit = TAU * reveal.haloU;
    return sweepDist <= sweepLimit ? 1 : 0;
  }

  // ── ray-circle intersection for thick spokes ────────────────────────

  function getWorldRayCircleSegment(
    oxPx: number, oyPx: number, angle: number,
    ccxPx: number, ccyPx: number, radiusPx: number,
    rayStart: number, rayEnd: number
  ): { start_x: number; start_y: number; end_x: number; end_y: number } | null {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const rcx = ccxPx - oxPx;
    const rcy = ccyPx - oyPx;
    const proj = dx * rcx + dy * rcy;
    const cDistSq = rcx * rcx + rcy * rcy;
    const disc = proj * proj - (cDistSq - radiusPx * radiusPx);
    if (disc <= 0) return null;

    const root = Math.sqrt(disc);
    const entry = proj - root;
    const exit = proj + root;
    const sr = Math.max(rayStart, Math.min(entry, exit));
    const er = Math.min(rayEnd, Math.max(entry, exit));
    if (er <= sr) return null;

    return {
      start_x: oxPx + dx * sr,
      start_y: oyPx + dy * sr,
      end_x: oxPx + dx * er,
      end_y: oyPx + dy * er
    };
  }

  function getThickSpokeWidthPx(spoke: Spoke, geoScale: number, config: HaloFieldConfig): number {
    const startPx = Math.max(0, config.spoke_lines.phase_start_width_px ?? 0);
    const endPx = Math.max(0, config.spoke_lines.phase_end_width_px ?? 0);
    const wpu = clamp(spoke.width_phase_u ?? spoke.phase_u ?? 1, 0, 1);
    return lerp(startPx, endPx, wpu) * geoScale;
  }

  // ── echo marker push helpers ────────────────────────────────────────

  function pushPlusMarker(
    cx: number, cy: number, size: number, strokeW: number, alpha: number, _angle: number
  ) {
    const half = size * 0.5;
    layers.haloEchoMarks.push(cx - half, cy, cx + half, cy, strokeW, alpha);
    layers.haloEchoMarks.push(cx, cy - half, cx, cy + half, strokeW, alpha);
  }

  function pushTriangleMarker(
    cx: number, cy: number, side: number, strokeW: number, alpha: number, angle: number
  ) {
    const r = side / Math.sqrt(3);
    for (let i = 0; i < 3; i++) {
      const a1 = angle + (TAU * i) / 3;
      const a2 = angle + (TAU * (i + 1)) / 3;
      layers.haloEchoMarks.push(
        cx + Math.cos(a1) * r, cy + Math.sin(a1) * r,
        cx + Math.cos(a2) * r, cy + Math.sin(a2) * r,
        strokeW, alpha
      );
    }
  }

  function pushDiamondMarker(
    cx: number, cy: number, size: number, strokeW: number, alpha: number, angle: number
  ) {
    const half = size * 0.5;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const pts = [
      [half, 0], [0, half], [-half, 0], [0, -half]
    ].map(([lx, ly]) => [cx + cos * lx - sin * ly, cy + sin * lx + cos * ly]);
    for (let i = 0; i < 4; i++) {
      const a = pts[i], b = pts[(i + 1) % 4];
      layers.haloEchoMarks.push(a[0], a[1], b[0], b[1], strokeW, alpha);
    }
  }

  function pushRadialDashMarker(
    cx: number, cy: number, len: number, strokeW: number, alpha: number, angle: number
  ) {
    const half = len * 0.5;
    const dx = Math.cos(angle) * half;
    const dy = Math.sin(angle) * half;
    layers.haloEchoMarks.push(cx - dx, cy - dy, cx + dx, cy + dy, strokeW, alpha);
  }

  function pushStarMarker(
    cx: number, cy: number, size: number, strokeW: number, alpha: number, _angle: number
  ) {
    const half = size * 0.5;
    for (let i = 0; i < 3; i++) {
      const a = (TAU * i) / 6;
      const cos = Math.cos(a) * half;
      const sin = Math.sin(a) * half;
      layers.haloEchoMarks.push(cx - cos, cy - sin, cx + cos, cy + sin, strokeW, alpha);
    }
  }

  function pushHexagonMarker(
    cx: number, cy: number, size: number, strokeW: number, alpha: number, angle: number
  ) {
    const r = size * 0.5;
    for (let i = 0; i < 6; i++) {
      const a1 = angle + (TAU * i) / 6;
      const a2 = angle + (TAU * (i + 1)) / 6;
      layers.haloEchoMarks.push(
        cx + Math.cos(a1) * r, cy + Math.sin(a1) * r,
        cx + Math.cos(a2) * r, cy + Math.sin(a2) * r,
        strokeW, alpha
      );
    }
  }

  // ── fold seam alpha (angle-dependent spoke fade at phase boundary) ──

  function getFoldSeamAlpha(angleRad: number, config: HaloFieldConfig): number {
    const baseAngleRad =
      (config.generator_wrangle.base_angle_deg ?? 0) * (Math.PI / 180) +
      (config.composition.global_rotation_deg ?? 0) * (Math.PI / 180);
    const displayU = wrapPositive(angleRad - baseAngleRad, TAU) / TAU;
    const seamDisplayU = 0.5;
    if (displayU <= seamDisplayU) return 1;
    const fadeWidthU = 3.5 / Math.max(1, config.generator_wrangle.spoke_count || 1);
    return smoothstep(0, fadeWidthU, displayU - seamDisplayU);
  }

  // ── halo layers (spokes + echo markers) ─────────────────────────────

  function pushHaloLayers(
    spokes: Spoke[],
    visibleSpokeCount: number,
    box: MascotBox | null,
    haloOuterR: number,
    fullFrameR: number,
    config: HaloFieldConfig,
    reveal: RevealState | null = null
  ) {
    if (!box) return;

    const cx = config.composition.center_x_px;
    const cy = config.composition.center_y_px;
    const geoScale = getGeometryScale(box);
    const outerWidthPx = Math.max(0, config.spoke_lines.width_px || 0) * geoScale;
    const thickEnabled =
      (config.spoke_lines.phase_start_width_px ?? 0) > 0 ||
      (config.spoke_lines.phase_end_width_px ?? 0) > 0;
    const echoCount = Math.max(0, Math.round(config.spoke_lines.echo_count || 0));
    const echoDotScaleMult = clamp(config.spoke_lines.echo_width_mult ?? 1, 0.01, 1);
    const echoWaveCount = Math.max(0, config.spoke_lines.echo_wave_count || 0);
    const echoFadeMult = clamp(config.spoke_lines.echo_opacity_mult ?? 1, 0, 1);
    const echoStyle = config.spoke_lines.echo_style || "dots";
    const echoMarkerScaleMult = Math.max(0.1, config.spoke_lines.echo_marker_scale_mult ?? 1);
    const maxSpokeCount = Math.max(1, config.generator_wrangle.spoke_count || 1);
    const minSpokeCount = clamp(
      config.screensaver?.min_spoke_count ?? maxSpokeCount, 1, maxSpokeCount
    );
    const currentVisCount = clamp(visibleSpokeCount || maxSpokeCount, 1, maxSpokeCount);
    const sparseScaleBoost = Math.max(0, config.spoke_lines.echo_sparse_scale_boost ?? 0);
    const sparseU = maxSpokeCount <= minSpokeCount
      ? 0
      : clamp(
        (maxSpokeCount - currentVisCount) / Math.max(0.0001, maxSpokeCount - minSpokeCount),
        0, 1
      );
    const echoSparseScaleMult = 1 + sparseScaleBoost * sparseU;
    const echoMarkerWidthPx = Math.max(
      0.5 * geoScale,
      Math.max(0, config.spoke_lines.echo_marker_stroke_px ?? config.spoke_lines.width_px ?? 0) * geoScale
    );
    const rippleMinScale = 0.45;
    const rippleMaxScale = 1.55;
    const rippleFadeStartU = lerp(0.2, 0.85, echoFadeMult);

    for (const spoke of spokes) {
      const foldSeam = getFoldSeamAlpha(spoke.angle, config);
      const spokeAlpha = clamp(spoke.alpha ?? 1, 0, 1) * foldSeam;
      if (spokeAlpha <= 0) continue;

      // thin spoke line: from start_radius to halo outer
      if (!spoke.seam_overlay_only && outerWidthPx > 0) {
        const worldSx = cx + Math.cos(spoke.angle) * spoke.start_radius;
        const worldSy = cy + Math.sin(spoke.angle) * spoke.start_radius;
        const worldEx = cx + Math.cos(spoke.angle) * haloOuterR;
        const worldEy = cy + Math.sin(spoke.angle) * haloOuterR;
        const midX = (worldSx + worldEx) * 0.5 - cx;
        const midY = (worldSy + worldEy) * 0.5 - cy;
        const revealA = getSpokeRevealAlpha(midX, midY, reveal);
        if (revealA > 0) {
          layers.haloThinSpokes.push(worldSx, worldSy, worldEx, worldEy, outerWidthPx, spokeAlpha * revealA);
        }
      }

      // thick spoke line: clipped by phase mask circle
      if (thickEnabled) {
        const seg = getWorldRayCircleSegment(
          cx, cy, spoke.angle,
          spoke.inner_clip_center_x_px, spoke.inner_clip_center_y_px,
          spoke.phase_clip_radius_px ?? spoke.phase_field_radius_px,
          spoke.start_radius, haloOuterR
        );
        if (seg) {
          const segMidX = (seg.start_x + seg.end_x) * 0.5 - cx;
          const segMidY = (seg.start_y + seg.end_y) * 0.5 - cy;
          const revealA = getSpokeRevealAlpha(segMidX, segMidY, reveal);
          if (revealA > 0) {
            layers.haloThickSpokes.push(
              seg.start_x, seg.start_y, seg.end_x, seg.end_y,
              getThickSpokeWidthPx(spoke, geoScale, config),
              spokeAlpha * revealA
            );
          }
        }
      }

      // echo dots/markers outside the halo
      const dotTemplates = spoke.echo_dots;
      const orbitStep = spoke.echo_dot_step_px;
      if (
        spoke.seam_overlay_only ||
        !dotTemplates.length ||
        orbitStep <= 0 ||
        echoCount <= 0 ||
        spoke.inner_clip_offset_px <= 0
      ) continue;

      // Compute text label clearance zone for shape culling
      let textClearStartR = -1;
      let textClearEndR = -1;
      if (config.spoke_text?.enabled) {
        const labelSlotId = wrapPositive(
          Math.round(spoke.label_slot_id ?? spoke.display_slot_id ?? 0),
          maxSpokeCount
        );
        if (labelSlotId < UBUNTU_RELEASE_LABELS.length) {
          const labelText = UBUNTU_RELEASE_LABELS[labelSlotId];
          const textFontSize = Math.max(
            3,
            Math.round(
              Math.max(3, config.spoke_text.font_size_px ?? ECHO_TEXT_BASE_FONT_SIZE_PX) *
              Math.max(0.01, Math.min(stageW, stageH) / 1080) *
              Math.max(0.01, config.composition.scale || 1)
            )
          );
          const tm = getTextLabelRadiusMetrics(spoke, haloOuterR, fullFrameR, textFontSize, labelText, config);
          textClearStartR = tm.clearStartR;
          textClearEndR = tm.clearEndR;
        }
      }

      const maxOrbitIdx = Math.ceil(
        (fullFrameR - spoke.echo_dot_origin_radius) / orbitStep
      );
      const rippleSpan = Math.max(1, fullFrameR - spoke.echo_dot_origin_radius);

      for (let oi = 0; oi <= maxOrbitIdx; oi++) {
        const tmpl = dotTemplates[Math.min(oi, dotTemplates.length - 1)];
        const dotR = spoke.echo_dot_origin_radius + oi * orbitStep;

        // Suppress shapes in the text-label clearance zone
        if (textClearStartR >= 0 && dotR >= textClearStartR && dotR <= textClearEndR) continue;

        const wdx = cx + Math.cos(spoke.angle) * dotR;
        const wdy = cy + Math.sin(spoke.angle) * dotR;
        const clipDist = Math.hypot(
          wdx - spoke.inner_clip_center_x_px,
          wdy - spoke.inner_clip_center_y_px
        );
        if (clipDist <= spoke.phase_field_radius_px + 0.01) continue;

        const echoIdx = Math.ceil(
          (clipDist - spoke.phase_field_radius_px) / spoke.inner_clip_offset_px
        );
        if (echoIdx < 1 || echoIdx > echoCount) continue;

        const rippleU = clamp(
          (dotR - spoke.echo_dot_origin_radius) / rippleSpan, 0, 1
        );
        const ripplePhase = rippleU * echoWaveCount * TAU;
        const rippleScale = echoWaveCount > 0
          ? lerp(rippleMinScale, rippleMaxScale, 0.5 + 0.5 * Math.cos(ripplePhase))
          : 1;
        const cappedMult = Math.min(
          1, Math.pow(echoDotScaleMult, echoIdx) * rippleScale
        );
        const dotRadiusPx = tmpl.radius_px * cappedMult;
        if (dotRadiusPx <= 0) continue;

        const dotAlpha =
          spokeAlpha *
          (1 - smoothstep(rippleFadeStartU, 1, rippleU)) *
          getRadialFadeAlpha(dotR, fullFrameR, config) *
          getRevealLocalAlpha(wdx - cx, wdy - cy, reveal, maxSpokeCount);
        if (dotAlpha <= 0) continue;

        // marker outside halo?
        if (dotR - dotRadiusPx <= haloOuterR + ECHO_MARKER_HALO_GAP_PX + 0.01) continue;

        const variant = getEchoMarkerVariant(
          echoStyle,
          spoke.source_spoke_id ?? spoke.display_slot_id,
          oi,
          config.spoke_lines.echo_shape_seed ?? 0,
          config.spoke_lines.echo_mix_shape_pct ?? 0.56
        );

        const scaleFactor =
          ECHO_PLUS_SIZE_PX * geoScale *
          clamp(dotRadiusPx / Math.max(0.0001, tmpl.radius_px), 0.25, 4) *
          echoMarkerScaleMult * echoSparseScaleMult;

        if (variant === "plus") {
          pushPlusMarker(wdx, wdy, scaleFactor, echoMarkerWidthPx, dotAlpha, spoke.angle);
        } else if (variant === "triangles") {
          const side = Math.max(6.4 * geoScale, dotRadiusPx * 3.2 * echoMarkerScaleMult * echoSparseScaleMult);
          pushTriangleMarker(wdx, wdy, side, echoMarkerWidthPx, dotAlpha, spoke.angle + Math.PI);
        } else if (variant === "diamond") {
          pushDiamondMarker(wdx, wdy, scaleFactor, echoMarkerWidthPx, dotAlpha, spoke.angle);
        } else if (variant === "radial_dash") {
          pushRadialDashMarker(wdx, wdy, scaleFactor * 0.75, echoMarkerWidthPx, dotAlpha, spoke.angle);
        } else if (variant === "star") {
          pushStarMarker(wdx, wdy, scaleFactor, echoMarkerWidthPx, dotAlpha, spoke.angle);
        } else if (variant === "hexagon") {
          pushHexagonMarker(wdx, wdy, scaleFactor * 1.1, echoMarkerWidthPx, dotAlpha, spoke.angle);
        } else {
          // "dots"
          layers.haloEchoDots.push(wdx, wdy, dotRadiusPx * 2, dotRadiusPx * 2, dotAlpha);
        }
      }
    }
  }

  // ── text label radius metrics (matching reference get_text_label_radius_metrics) ──

  interface TextLabelMetrics {
    startRadius: number;
    endRadius: number;
    clearStartR: number;
    clearEndR: number;
  }

  function getTextLabelWidthPx(label: string, fontSizePx: number): number {
    textCtx.save();
    textCtx.font = `${fontSizePx}px ${TEXT_LABEL_FONT_FAMILY}`;
    const w = textCtx.measureText(label).width;
    textCtx.restore();
    return w;
  }

  function getTextLabelRadiusMetrics(
    spoke: Spoke | null,
    haloOuterR: number,
    fullFrameR: number,
    fontSizePx: number,
    labelText: string,
    config: HaloFieldConfig
  ): TextLabelMetrics {
    const radialU = clamp(config.spoke_text?.radial_u ?? 0.55, 0, 1);
    const cx = config.composition.center_x_px;
    const cy = config.composition.center_y_px;
    const originRadius = Math.max(0, spoke?.echo_dot_origin_radius ?? haloOuterR);
    const maxOrbitCount = Math.max(1, Math.round(config.generator_wrangle.num_orbits || 1));
    const currentOrbitStepPx = Math.max(0, spoke?.echo_dot_step_px ?? 0);
    const baseOrbitStepPx = maxOrbitCount <= 1
      ? 0
      : Math.max(0, (fullFrameR - originRadius) / (maxOrbitCount - 1));
    const baseStartRadius = lerp(haloOuterR, fullFrameR, radialU);
    const pulsedOrbitIndex = baseOrbitStepPx <= 0
      ? 0
      : Math.max(0, (baseStartRadius - originRadius) / baseOrbitStepPx);
    const thickSegment = spoke
      ? getWorldRayCircleSegment(
          cx, cy, spoke.angle,
          spoke.inner_clip_center_x_px, spoke.inner_clip_center_y_px,
          spoke.phase_clip_radius_px ?? spoke.phase_field_radius_px,
          spoke.start_radius, haloOuterR
        )
      : null;
    const thickSegmentEndR = thickSegment
      ? Math.hypot(thickSegment.end_x - cx, thickSegment.end_y - cy)
      : haloOuterR;
    const minStartRadius = haloOuterR + ECHO_MARKER_HALO_GAP_PX + TEXT_LABEL_MARGIN_PX;
    const startRadius = clamp(
      Math.max(
        currentOrbitStepPx > 0
          ? originRadius + pulsedOrbitIndex * currentOrbitStepPx
          : baseStartRadius,
        thickSegmentEndR + TEXT_LABEL_MARGIN_PX
      ),
      minStartRadius,
      fullFrameR
    );
    const estimatedLengthPx = getTextLabelWidthPx(labelText, fontSizePx);
    const endRadius = clamp(
      startRadius + estimatedLengthPx,
      startRadius,
      fullFrameR
    );
    return {
      startRadius,
      endRadius,
      clearStartR: Math.max(
        haloOuterR + ECHO_MARKER_HALO_GAP_PX,
        startRadius - TEXT_LABEL_MARGIN_PX
      ),
      clearEndR: Math.min(fullFrameR, endRadius + TEXT_LABEL_MARGIN_PX)
    };
  }

  // ── draw release labels on text overlay canvas ──────────────────────

  function drawReleaseLabelOverlay(
    spokes: Spoke[],
    box: MascotBox | null,
    haloOuterR: number,
    fullFrameR: number,
    config: HaloFieldConfig,
    reveal: RevealState | null
  ) {
    if (!box || !config.spoke_text?.enabled) return;
    const cx = config.composition.center_x_px;
    const cy = config.composition.center_y_px;
    const fontSize = Math.max(
      3,
      Math.round(
        Math.max(3, config.spoke_text.font_size_px ?? ECHO_TEXT_BASE_FONT_SIZE_PX) *
        Math.max(0.01, Math.min(stageW, stageH) / 1080) *
        Math.max(0.01, config.composition.scale || 1)
      )
    );
    const bgColor = config.composition.background_color || "#202020";
    const textColor = config.spoke_lines.reference_color || "#666666";
    const labelPadX = Math.max(4, Math.round(fontSize * 0.28));
    const labelPadY = Math.max(2, Math.round(fontSize * 0.18));

    textCtx.save();
    textCtx.font = `${fontSize}px ${TEXT_LABEL_FONT_FAMILY}`;
    textCtx.textBaseline = "middle";

    const maxSlots = Math.max(1, Math.round(config.generator_wrangle.spoke_count || 1));

    for (const spoke of spokes) {
      if (spoke.seam_overlay_only) continue;
      const labelSlotId = wrapPositive(
        Math.round(spoke.label_slot_id ?? spoke.display_slot_id ?? 0),
        maxSlots
      );
      if (labelSlotId >= UBUNTU_RELEASE_LABELS.length) continue;

      const label = UBUNTU_RELEASE_LABELS[labelSlotId];
      if (!label) continue;

      const spokeAlpha = clamp(spoke.alpha ?? 1, 0, 1);
      if (spokeAlpha <= 0) continue;

      const textMetrics = getTextLabelRadiusMetrics(
        spoke, haloOuterR, fullFrameR, fontSize, label, config
      );
      // World coords (Y-up), then convert to canvas (Y-down)
      const worldX = cx + Math.cos(spoke.angle) * textMetrics.startRadius;
      const worldY = cy + Math.sin(spoke.angle) * textMetrics.startRadius;
      const canvasX = worldX;
      const canvasY = stageH - worldY;
      // Negate angle for canvas Y-down coordinate system
      let labelRotation = -spoke.angle;
      const normRot = wrapPositive(labelRotation + Math.PI, TAU) - Math.PI;
      const shouldFlip = normRot > Math.PI * 0.5 || normRot < -Math.PI * 0.5;
      if (shouldFlip) labelRotation += Math.PI;

      const revealAlpha = getRevealLocalAlpha(
        worldX - (box?.center_x_px ?? cx),
        worldY - (box?.center_y_px ?? cy),
        reveal, maxSlots
      );
      if (revealAlpha <= 0) continue;

      const radialFade = getRadialFadeAlpha(textMetrics.startRadius, fullFrameR, config);
      const alpha = spokeAlpha * revealAlpha * radialFade;
      if (alpha <= 0) continue;

      const measure = textCtx.measureText(label);
      const measuredAscent = measure.actualBoundingBoxAscent || fontSize * 0.38;
      const measuredDescent = measure.actualBoundingBoxDescent || fontSize * 0.18;
      const measuredHeight = measuredAscent + measuredDescent;

      textCtx.save();
      textCtx.translate(canvasX, canvasY);
      textCtx.rotate(labelRotation);
      textCtx.textAlign = shouldFlip ? "right" : "left";
      textCtx.globalAlpha = alpha;
      textCtx.fillStyle = bgColor;
      textCtx.fillRect(
        shouldFlip ? -measure.width - labelPadX : -labelPadX,
        -measuredAscent - labelPadY,
        measure.width + labelPadX * 2,
        measuredHeight + labelPadY * 2
      );
      textCtx.fillStyle = textColor;
      textCtx.fillText(label, 0, 0);
      textCtx.restore();
    }

    textCtx.restore();
  }

  // ── main render ─────────────────────────────────────────────────────

  function renderFrame(config: HaloFieldConfig, mascotBox: MascotBox | null, timeSec: number) {
    // Background + clear
    const bgHex = config.composition.background_color || "#202020";
    renderer.setClearColor(new THREE.Color(bgHex), 1);

    clearLayers();
    updateLayerColors(config);

    if (debugTriangleEnabled) {
      finalizeLayers();
      renderer.render(scene, camera);
      if (textOverlayCanvas.width !== stageW) textOverlayCanvas.width = stageW;
      if (textOverlayCanvas.height !== stageH) textOverlayCanvas.height = stageH;
      textCtx.clearRect(0, 0, stageW, stageH);
      return;
    }

    // Rebuild scene data when config changes
    ensureSceneData(config, mascotBox);

    const fullFrameR = getFullFrameOuterRadius(
      config.composition.center_x_px,
      config.composition.center_y_px
    );

    // Reset transition state on time rewind
    if (previousPlaybackTimeSec !== null && timeSec < previousPlaybackTimeSec) {
      spokeWidthPhaseUBySource = new Map();
      spokeClipCenterXBySource = new Map();
      lastWidthTransitionTimeSec = null;
      cachedConfigJSON = ""; // Force scene rebuild on rewind
      ensureSceneData(config, mascotBox);
    }
    previousPlaybackTimeSec = timeSec;

    const timing = runtimeTiming!;
    const effectivePlaybackTime = Math.max(0, timeSec);

    // ── Determine active phase ────────────────────────────────────────
    // Phase 1 (dot intro):     0 ≤ t ≤ dot_end_sec
    // Phase 2 (finale sweep):  dot_end_sec < t ≤ playback_end_sec
    // Phase 3 (screensaver):   t > playback_end_sec

    const isDotComplete = effectivePlaybackTime >= timing.dot_end_sec;
    const isPlaybackComplete = effectivePlaybackTime >= timing.playback_end_sec;
    const useScreensaverField = isPlaybackComplete &&
      Boolean(config.screensaver) &&
      hasDynamicScreensaverMotion(config);

    // Dot time is clamped to dot_end_sec (dots freeze after phase 1)
    const dotTimeSec = Math.min(effectivePlaybackTime, timing.dot_end_sec);

    // Finale halo_u: 0 during phase 1, 0→1 during phase 2, 1 during phase 3
    const haloU = getFinaleHaloU(effectivePlaybackTime, timing, config, isPlaybackComplete);

    // ── Build field state ─────────────────────────────────────────────

    let screensaverFieldState: PostFinaleFieldState | null = null;

    if (useScreensaverField) {
      const screensaverStartSec = timing.playback_end_sec;
      screensaverFieldState = buildPostFinaleHaloFieldState({
        config,
        mascotBox,
        playbackTimeSec: effectivePlaybackTime,
        effectiveSpokeCount: getEffectiveSpokeCount(config, effectivePlaybackTime, screensaverStartSec),
        effectiveOrbitCount: getEffectiveOrbitCount(config, effectivePlaybackTime, screensaverStartSec),
        previousWidthPhaseUBySource: spokeWidthPhaseUBySource,
        previousClipCenterXBySource: spokeClipCenterXBySource,
        lastWidthTransitionTimeSec,
        fullFrameOuterRadiusPx: fullFrameR
      });
      spokeWidthPhaseUBySource = screensaverFieldState.next_spoke_width_phase_u_by_source;
      spokeClipCenterXBySource = screensaverFieldState.next_spoke_clip_center_x_by_source;
      lastWidthTransitionTimeSec = screensaverFieldState.spoke_width_transition_playback_time_sec;
    }

    const haloOuterR = screensaverFieldState
      ? screensaverFieldState.halo_outer_radius_px
      : mascotBox ? mascotBox.draw_size_px * 0.5 : 0;
    const spokes = screensaverFieldState?.spokes ?? introField?.spokes ?? [];
    const visibleSpokeCount = screensaverFieldState?.visible_spoke_count
      ?? introField?.visible_spoke_count ?? 0;

    // Reveal state for the finale sweep (null during phase 1, active during phase 2, forced-final during phase 3)
    const reveal = getRevealState(config, mascotBox, fullFrameR, haloU, isPlaybackComplete);

    // ── Render ────────────────────────────────────────────────────────

    // Construction lines render from frame 1 (always visible).
    // Halo layers (spokes, echoes) are gated by reveal_state.haloU which is
    // 0 during dot intro, sweeps 0→1 during finale, and 1 after.
    pushBackgroundSpokes(spokes, fullFrameR, config);

    if (screensaverFieldState) {
      pushPostFinalePoints(screensaverFieldState, config);
    } else {
      pushAnimatedIntroPoints(dotTimeSec, isDotComplete, config, timing);
    }

    pushHaloLayers(
      spokes,
      visibleSpokeCount,
      mascotBox,
      haloOuterR,
      fullFrameR,
      config,
      reveal
    );

    finalizeLayers();
    renderer.render(scene, camera);

    // Text overlay (release labels)
    if (textOverlayCanvas.width !== stageW) textOverlayCanvas.width = stageW;
    if (textOverlayCanvas.height !== stageH) textOverlayCanvas.height = stageH;
    textCtx.clearRect(0, 0, stageW, stageH);
    drawReleaseLabelOverlay(spokes, mascotBox, haloOuterR, fullFrameR, config, reveal);
  }

  // ── resize ──────────────────────────────────────────────────────────

  function resize(w: number, h: number) {
    stageW = w;
    stageH = h;
    renderer.setSize(w, h, false);
    camera.left = 0;
    camera.right = w;
    camera.top = h;
    camera.bottom = 0;
    camera.updateProjectionMatrix();
    textOverlayCanvas.width = w;
    textOverlayCanvas.height = h;
  }

  // ── dispose ─────────────────────────────────────────────────────────

  function disposeAll() {
    for (const layer of Object.values(layers)) {
      layer.dispose();
    }
    if (debugTriangleMesh) {
      debugTriangleMesh.geometry.dispose();
      debugTriangleMesh.material.dispose();
      worldGroup.remove(debugTriangleMesh);
      debugTriangleMesh = null;
    }
    renderer.dispose();
  }

  return {
    resize,
    renderFrame,
    dispose: disposeAll,
    canvas,
    textOverlayCanvas
  };
}
