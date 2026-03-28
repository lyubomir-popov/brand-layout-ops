import type { OperatorDefinition } from "@brand-layout-ops/core-types";
import {
  COMPOSITION_SIZE_PX,
  UBUNTU_RELEASE_LABELS,
  buildPostFinaleHaloFieldState,
  buildRuntimeTiming,
  clamp,
  lerp,
  radians,
  smoothstep,
  type PostFinaleFieldState,
  type RuntimeTiming,
  type HaloFieldConfig,
  type MascotBox
} from "@brand-layout-ops/operator-halo-field";

export const UBUNTU_SUMMIT_ANIMATION_OPERATOR_KEY = "operator.ubuntu-summit-animation";

export type UbuntuSummitAnimationPhase = "dot-intro" | "finale" | "screensaver";

export interface UbuntuSummitAnimationParams {
  haloConfig: HaloFieldConfig;
  playbackTimeSec: number;
  frameWidthPx?: number;
  frameHeightPx?: number;
  previousTransitionState?: UbuntuSummitAnimationTransitionState;
  forceDotFinal?: boolean;
  forceMascotFinal?: boolean;
}

export interface UbuntuSummitAnimationRevealState {
  haloU: number;
  startAngleRad: number;
  innerRadiusPx: number;
  outerRadiusPx: number;
}

export interface UbuntuSummitAnimationTransitionState {
  configFingerprint: string;
  previousPlaybackTimeSec: number | null;
  spokeWidthPhaseUBySource: ReadonlyArray<readonly [number, number]>;
  spokeClipCenterXBySource: ReadonlyArray<readonly [number, number]>;
  lastWidthTransitionTimeSec: number | null;
}

export interface UbuntuSummitAnimationFrameState {
  effectivePlaybackTimeSec: number;
  dotTimeSec: number;
  isDotComplete: boolean;
  isPlaybackComplete: boolean;
  useScreensaverField: boolean;
  effectiveOrbitCount: number;
  effectiveSpokeCount: number;
  haloU: number;
  haloOuterRadiusPx: number;
  fullFrameOuterRadiusPx: number;
  reveal: UbuntuSummitAnimationRevealState | null;
  screensaverFieldState: PostFinaleFieldState | null;
  nextTransitionState: UbuntuSummitAnimationTransitionState;
}

export interface UbuntuSummitAnimationSceneDescriptor {
  family: "ubuntu-summit-animation";
  playbackTimeSec: number;
  phase: UbuntuSummitAnimationPhase;
  forceDotFinal: boolean;
  forceMascotFinal: boolean;
  haloConfig: HaloFieldConfig;
  mascotBox: MascotBox | null;
  releaseLabels: readonly string[];
  runtimeTiming: RuntimeTiming;
  loopTimeSec: number;
  frameState: UbuntuSummitAnimationFrameState;
}

function toNumber(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function getFullFrameOuterRadius(
  config: HaloFieldConfig,
  frameWidthPx: number,
  frameHeightPx: number
): number {
  const cx = toNumber(config.composition.center_x_px, 0);
  const cy = toNumber(config.composition.center_y_px, 0);
  const dx = Math.max(cx, Math.max(0, frameWidthPx) - cx);
  const dy = Math.max(cy, Math.max(0, frameHeightPx) - cy);
  return Math.hypot(dx, dy);
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
  const rawPulseU = 0.5 + 0.5 * Math.cos((loopTimeSec / safeCycleSec) * Math.PI * 2);
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

function getFinaleHaloU(
  playbackTimeSec: number,
  runtimeTiming: RuntimeTiming,
  config: HaloFieldConfig,
  forceFinal: boolean
): number {
  if (!config.finale?.enabled) {
    return 0;
  }

  if (forceFinal) {
    return 1;
  }

  return smoothstep(runtimeTiming.finale_start_sec, runtimeTiming.finale_end_sec, playbackTimeSec);
}

function getRevealState(
  config: HaloFieldConfig,
  box: MascotBox | null,
  fullFrameOuterRadiusPx: number,
  haloU: number,
  forceFinal: boolean
): UbuntuSummitAnimationRevealState | null {
  if (!box) {
    return null;
  }

  return {
    haloU: config.finale?.enabled ? (forceFinal ? 1 : haloU) : 1,
    startAngleRad:
      radians((config.finale?.start_angle_deg ?? 0) + (config.finale?.mask_angle_offset_deg ?? 0)) +
      radians(config.composition.global_rotation_deg || 0),
    innerRadiusPx: box.draw_size_px * clamp(config.finale?.halo_inner_radius_u ?? 0.2, 0.01, 0.5),
    outerRadiusPx: fullFrameOuterRadiusPx
  };
}

function toTransitionEntries(map: Map<number, number>): Array<[number, number]> {
  return Array.from(map.entries());
}

function toTransitionMap(entries: ReadonlyArray<readonly [number, number]> | undefined): Map<number, number> {
  return new Map((entries ?? []).map(([key, value]) => [Number(key), Number(value)]));
}

function createEmptyTransitionState(configFingerprint: string): UbuntuSummitAnimationTransitionState {
  return {
    configFingerprint,
    previousPlaybackTimeSec: null,
    spokeWidthPhaseUBySource: [],
    spokeClipCenterXBySource: [],
    lastWidthTransitionTimeSec: null
  };
}

export function getUbuntuSummitMascotBox(config: HaloFieldConfig): MascotBox | null {
  const scale = Math.max(0, toNumber(config.composition.scale, 0));
  if (scale <= 0) {
    return null;
  }

  return {
    center_x_px: toNumber(config.composition.center_x_px, 0),
    center_y_px: toNumber(config.composition.center_y_px, 0),
    draw_size_px: COMPOSITION_SIZE_PX * scale
  };
}

export function getUbuntuSummitAnimationPhase(
  playbackTimeSec: number,
  runtimeTiming: RuntimeTiming,
  forceDotFinal = false
): UbuntuSummitAnimationPhase {
  if (!forceDotFinal && playbackTimeSec <= runtimeTiming.dot_end_sec) {
    return "dot-intro";
  }

  if (playbackTimeSec <= runtimeTiming.finale_end_sec) {
    return "finale";
  }

  return "screensaver";
}

export function buildUbuntuSummitAnimationSceneDescriptor(
  params: UbuntuSummitAnimationParams
): UbuntuSummitAnimationSceneDescriptor {
  const playbackTimeSec = Math.max(0, toNumber(params.playbackTimeSec, 0));
  const frameWidthPx = Math.max(0, toNumber(params.frameWidthPx, 0));
  const frameHeightPx = Math.max(0, toNumber(params.frameHeightPx, 0));
  const runtimeTiming = buildRuntimeTiming(params.haloConfig);
  const phase = getUbuntuSummitAnimationPhase(
    playbackTimeSec,
    runtimeTiming,
    Boolean(params.forceDotFinal)
  );
  const mascotBox = getUbuntuSummitMascotBox(params.haloConfig);
  const fullFrameOuterRadiusPx = getFullFrameOuterRadius(params.haloConfig, frameWidthPx, frameHeightPx);
  const effectivePlaybackTimeSec = Math.max(0, playbackTimeSec);
  const isDotComplete = effectivePlaybackTimeSec >= runtimeTiming.dot_end_sec;
  const isPlaybackComplete = effectivePlaybackTimeSec >= runtimeTiming.playback_end_sec;
  const screensaverStartTimeSec = runtimeTiming.playback_end_sec;
  const useScreensaverField = isPlaybackComplete && Boolean(params.haloConfig.screensaver) && hasDynamicScreensaverMotion(params.haloConfig);
  const effectiveOrbitCount = getEffectiveOrbitCount(
    params.haloConfig,
    effectivePlaybackTimeSec,
    screensaverStartTimeSec
  );
  const effectiveSpokeCount = getEffectiveSpokeCount(
    params.haloConfig,
    effectivePlaybackTimeSec,
    screensaverStartTimeSec
  );
  const configFingerprint = JSON.stringify(params.haloConfig);
  const previousTransitionState = params.previousTransitionState?.configFingerprint === configFingerprint
    ? params.previousTransitionState
    : createEmptyTransitionState(configFingerprint);
  const hasPlaybackRewound = previousTransitionState.previousPlaybackTimeSec !== null
    && effectivePlaybackTimeSec < previousTransitionState.previousPlaybackTimeSec;
  const previousWidthPhaseUBySource = hasPlaybackRewound
    ? new Map<number, number>()
    : toTransitionMap(previousTransitionState.spokeWidthPhaseUBySource);
  const previousClipCenterXBySource = hasPlaybackRewound
    ? new Map<number, number>()
    : toTransitionMap(previousTransitionState.spokeClipCenterXBySource);
  const lastWidthTransitionTimeSec = hasPlaybackRewound
    ? null
    : previousTransitionState.lastWidthTransitionTimeSec;
  const haloU = getFinaleHaloU(
    effectivePlaybackTimeSec,
    runtimeTiming,
    params.haloConfig,
    isPlaybackComplete
  );
  const screensaverFieldState = useScreensaverField
    ? buildPostFinaleHaloFieldState({
        config: params.haloConfig,
        mascotBox,
        playbackTimeSec: effectivePlaybackTimeSec,
        effectiveSpokeCount,
        effectiveOrbitCount,
        previousWidthPhaseUBySource,
        previousClipCenterXBySource,
        lastWidthTransitionTimeSec,
        fullFrameOuterRadiusPx
      })
    : null;
  const nextTransitionState: UbuntuSummitAnimationTransitionState = screensaverFieldState
    ? {
        configFingerprint,
        previousPlaybackTimeSec: effectivePlaybackTimeSec,
        spokeWidthPhaseUBySource: toTransitionEntries(screensaverFieldState.next_spoke_width_phase_u_by_source),
        spokeClipCenterXBySource: toTransitionEntries(screensaverFieldState.next_spoke_clip_center_x_by_source),
        lastWidthTransitionTimeSec: screensaverFieldState.spoke_width_transition_playback_time_sec
      }
    : {
        configFingerprint,
        previousPlaybackTimeSec: effectivePlaybackTimeSec,
        spokeWidthPhaseUBySource: [],
        spokeClipCenterXBySource: [],
        lastWidthTransitionTimeSec: null
      };
  const reveal = getRevealState(
    params.haloConfig,
    mascotBox,
    fullFrameOuterRadiusPx,
    haloU,
    isPlaybackComplete
  );
  const haloOuterRadiusPx = screensaverFieldState
    ? screensaverFieldState.halo_outer_radius_px
    : mascotBox ? mascotBox.draw_size_px * 0.5 : 0;

  return {
    family: "ubuntu-summit-animation",
    playbackTimeSec,
    phase,
    forceDotFinal: Boolean(params.forceDotFinal),
    forceMascotFinal: Boolean(params.forceMascotFinal),
    haloConfig: params.haloConfig,
    mascotBox,
    releaseLabels: UBUNTU_RELEASE_LABELS,
    runtimeTiming,
    loopTimeSec: Math.max(0, playbackTimeSec - runtimeTiming.finale_end_sec),
    frameState: {
      effectivePlaybackTimeSec,
      dotTimeSec: Math.min(effectivePlaybackTimeSec, runtimeTiming.dot_end_sec),
      isDotComplete,
      isPlaybackComplete,
      useScreensaverField,
      effectiveOrbitCount,
      effectiveSpokeCount,
      haloU,
      haloOuterRadiusPx,
      fullFrameOuterRadiusPx,
      reveal,
      screensaverFieldState,
      nextTransitionState
    }
  };
}

export const ubuntuSummitAnimationOperator: OperatorDefinition<UbuntuSummitAnimationParams> = {
  key: UBUNTU_SUMMIT_ANIMATION_OPERATOR_KEY,
  version: "0.1.0",
  inputs: [],
  outputs: [
    {
      key: "sceneDescriptor",
      kind: "scene-family-animation",
      description: "Coarse scene-family descriptor for the full Ubuntu Summit mascot animation parity port."
    }
  ],
  run({ params }) {
    return {
      sceneDescriptor: buildUbuntuSummitAnimationSceneDescriptor(params)
    };
  }
};