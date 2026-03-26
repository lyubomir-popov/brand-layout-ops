import type { FrameSize, GridSettings, LayerScene, LogoPlacement, LogoPlacementSpec, SafeAreaInsets, TextFieldPlacementSpec, TextMeasurer, TextStyleSpec } from "@brand-layout-ops/core-types";
import { computeLayoutGridMetrics } from "@brand-layout-ops/layout-grid";
import { resolveTextPlacement } from "@brand-layout-ops/layout-text";

export interface LayoutEngineInput {
  frame: FrameSize;
  safeArea: SafeAreaInsets;
  grid: GridSettings;
  textFields: TextFieldPlacementSpec[];
  textStyles: TextStyleSpec[];
  logo?: LogoPlacementSpec;
}

function resolveLogoPlacement(frame: FrameSize, safeArea: SafeAreaInsets, fitWithinSafeArea: boolean, logo?: LayoutEngineInput["logo"]): LogoPlacement | undefined {
  if (!logo) {
    return undefined;
  }

  const originLeftPx = fitWithinSafeArea ? safeArea.left : 0;
  const originTopPx = fitWithinSafeArea ? safeArea.top : 0;
  const left = originLeftPx + logo.xPx;
  const top = originTopPx + logo.yPx;

  return {
    id: logo.id || "logo",
    xPx: logo.xPx,
    yPx: logo.yPx,
    widthPx: logo.widthPx,
    heightPx: logo.heightPx,
    bounds: {
      left,
      top,
      right: left + logo.widthPx,
      bottom: top + logo.heightPx,
      width: logo.widthPx,
      height: logo.heightPx
    }
  };
}

export function resolveLayerScene(input: LayoutEngineInput, measurer: TextMeasurer): LayerScene {
  const grid = computeLayoutGridMetrics(input.frame, input.safeArea, input.grid);
  const styleByKey = new Map(input.textStyles.map((style) => [style.key, style]));
  const texts = input.textFields
    .map((field) => {
      const style = styleByKey.get(field.styleKey);
      if (!style) {
        throw new Error(`Unknown text style: ${field.styleKey}`);
      }
      return resolveTextPlacement(grid, field, style, measurer);
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
  const logo = resolveLogoPlacement(input.frame, input.safeArea, input.grid.fitWithinSafeArea, input.logo);

  return {
    grid,
    texts,
    ...(logo ? { logo } : {})
  };
}