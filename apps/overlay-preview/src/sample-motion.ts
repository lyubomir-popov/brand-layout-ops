import type { ColorRgba, FrameSize, Vector3 } from "@brand-layout-ops/core-types";
import type { OrbitsParams } from "@brand-layout-ops/operator-orbits";
import type { SpokesParams } from "@brand-layout-ops/operator-spokes";

export type MotionLayerMode = "none" | "orbits" | "spokes" | "both";

export interface PreviewMotionState {
  mode: MotionLayerMode;
  animate: boolean;
  speed: number;
  timeSeconds: number;
  opacity: number;
}

function createColor(r: number, g: number, b: number, a = 1): ColorRgba {
  return { r, g, b, a };
}

function getStageUnit(frame: FrameSize): number {
  return Math.max(320, Math.min(frame.widthPx, frame.heightPx));
}

export function getPreviewMotionCenter(frame: FrameSize): Vector3 {
  return {
    x: frame.widthPx * 0.68,
    y: frame.heightPx * 0.44,
    z: 0
  };
}

export function createDefaultMotionState(): PreviewMotionState {
  return {
    mode: "both",
    animate: true,
    speed: 1,
    timeSeconds: 0,
    opacity: 0.8
  };
}

export function buildPreviewOrbitParams(frame: FrameSize, timeSeconds: number): OrbitsParams {
  const unit = getStageUnit(frame);
  const center = getPreviewMotionCenter(frame);

  return {
    timeSeconds,
    center,
    defaultPscale: 1,
    rings: [
      {
        pointCount: 10,
        radiusPx: unit * 0.11,
        angularVelocityDegPerSecond: 22,
        pscale: 0.52,
        color: createColor(1, 0.83, 0.56, 0.85)
      },
      {
        pointCount: 16,
        radiusPx: unit * 0.19,
        angularVelocityDegPerSecond: -12,
        angleOffsetDeg: 10,
        pscale: 0.74,
        color: createColor(0.84, 0.92, 1, 0.8)
      },
      {
        pointCount: 24,
        radiusPx: unit * 0.28,
        angularVelocityDegPerSecond: 7,
        angleOffsetDeg: -14,
        pscale: 0.96,
        color: createColor(1, 0.97, 0.92, 0.72)
      }
    ]
  };
}

export function buildPreviewSpokesParams(frame: FrameSize, timeSeconds: number): SpokesParams {
  const unit = getStageUnit(frame);
  const center = getPreviewMotionCenter(frame);

  return {
    timeSeconds,
    center,
    defaultPscale: 0.8,
    bands: [
      {
        spokeCount: 12,
        pointsPerSpoke: 5,
        innerRadiusPx: unit * 0.04,
        outerRadiusPx: unit * 0.21,
        angularVelocityDegPerSecond: 8,
        pscaleStart: 0.34,
        pscaleEnd: 0.76,
        color: createColor(1, 0.86, 0.66, 0.52)
      },
      {
        spokeCount: 22,
        pointsPerSpoke: 4,
        innerRadiusPx: unit * 0.13,
        outerRadiusPx: unit * 0.34,
        angleOffsetDeg: 8,
        angularVelocityDegPerSecond: -4,
        pscaleStart: 0.44,
        pscaleEnd: 0.92,
        color: createColor(0.79, 0.91, 1, 0.44)
      }
    ]
  };
}