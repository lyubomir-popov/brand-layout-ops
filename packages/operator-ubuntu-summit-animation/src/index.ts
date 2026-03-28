import type { OperatorDefinition } from "@brand-layout-ops/core-types";
import {
  COMPOSITION_SIZE_PX,
  UBUNTU_RELEASE_LABELS,
  buildRuntimeTiming,
  type RuntimeTiming,
  type HaloFieldConfig,
  type MascotBox
} from "@brand-layout-ops/operator-halo-field";

export const UBUNTU_SUMMIT_ANIMATION_OPERATOR_KEY = "operator.ubuntu-summit-animation";

export type UbuntuSummitAnimationPhase = "dot-intro" | "finale" | "screensaver";

export interface UbuntuSummitAnimationParams {
  haloConfig: HaloFieldConfig;
  playbackTimeSec: number;
  forceDotFinal?: boolean;
  forceMascotFinal?: boolean;
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
}

function toNumber(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
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
  const runtimeTiming = buildRuntimeTiming(params.haloConfig);
  const phase = getUbuntuSummitAnimationPhase(
    playbackTimeSec,
    runtimeTiming,
    Boolean(params.forceDotFinal)
  );

  return {
    family: "ubuntu-summit-animation",
    playbackTimeSec,
    phase,
    forceDotFinal: Boolean(params.forceDotFinal),
    forceMascotFinal: Boolean(params.forceMascotFinal),
    haloConfig: params.haloConfig,
    mascotBox: getUbuntuSummitMascotBox(params.haloConfig),
    releaseLabels: UBUNTU_RELEASE_LABELS,
    runtimeTiming,
    loopTimeSec: Math.max(0, playbackTimeSec - runtimeTiming.finale_end_sec)
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