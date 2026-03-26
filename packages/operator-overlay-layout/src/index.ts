import type { LayerScene, LayoutGridMetrics, LogoPlacement, LogoPlacementSpec, OperatorDefinition, SafeAreaInsets, TextFieldPlacementSpec, TextStyleSpec, FrameSize, GridSettings } from "@brand-layout-ops/core-types";
import { resolveLayerScene } from "@brand-layout-ops/layout-engine";
import { createApproximateTextMeasurer, type ApproximateTextMeasureOptions } from "@brand-layout-ops/layout-text";

export const OVERLAY_LAYOUT_OPERATOR_KEY = "overlay.layout";

export interface OverlayLayoutOperatorParams {
  frame: FrameSize;
  safeArea: SafeAreaInsets;
  grid: GridSettings;
  textFields: TextFieldPlacementSpec[];
  textStyles: TextStyleSpec[];
  logo?: LogoPlacementSpec;
}

export interface OverlayLayoutOperatorOutputs {
  scene: LayerScene;
  grid: LayoutGridMetrics;
  texts: LayerScene["texts"];
  logo?: LogoPlacement;
}

export interface CreateOverlayLayoutOperatorOptions {
  operatorKey?: string;
  textMeasureOptions?: ApproximateTextMeasureOptions;
}

export function resolveOverlayLayoutScene(
  params: OverlayLayoutOperatorParams,
  textMeasureOptions?: ApproximateTextMeasureOptions
): LayerScene {
  return resolveLayerScene(params, createApproximateTextMeasurer(textMeasureOptions));
}

export function createOverlayLayoutOperator(
  options: CreateOverlayLayoutOperatorOptions = {}
): OperatorDefinition<OverlayLayoutOperatorParams> {
  return {
    key: options.operatorKey ?? OVERLAY_LAYOUT_OPERATOR_KEY,
    version: "0.1.0",
    inputs: [],
    outputs: [
      {
        key: "scene",
        kind: "layer-scene",
        description: "Resolved overlay scene with guides, text placements, and optional logo placement."
      },
      {
        key: "grid",
        kind: "layout-grid-metrics",
        description: "Resolved baseline and column grid metrics for overlay composition."
      },
      {
        key: "texts",
        kind: "resolved-text-placement-list",
        description: "Resolved text placements derived from grid and style settings."
      },
      {
        key: "logo",
        kind: "logo-placement",
        description: "Optional resolved logo placement anchored to the layout origin."
      }
    ],
    run(context) {
      const scene = resolveOverlayLayoutScene(context.params, options.textMeasureOptions);

      return {
        scene,
        grid: scene.grid,
        texts: scene.texts,
        ...(scene.logo ? { logo: scene.logo } : {})
      } satisfies Record<string, unknown>;
    }
  };
}