import type { LogoPlacementSpec, TextFieldPlacementSpec, TextStyleSpec } from "@brand-layout-ops/core-types";
import type { OverlayLayoutOperatorParams } from "@brand-layout-ops/operator-overlay-layout";

const DEFAULT_TEXT_STYLES: TextStyleSpec[] = [
  {
    key: "eyebrow",
    fontSizePx: 28,
    lineHeightPx: 32,
    fontWeight: 600
  },
  {
    key: "headline",
    fontSizePx: 58,
    lineHeightPx: 64,
    fontWeight: 700
  },
  {
    key: "body",
    fontSizePx: 24,
    lineHeightPx: 32,
    fontWeight: 400
  }
];

const DEFAULT_TEXT_FIELDS: TextFieldPlacementSpec[] = [
  {
    id: "eyebrow",
    contentFieldId: "eyebrow",
    styleKey: "eyebrow",
    text: "Ubuntu Summit 2026",
    keylineIndex: 1,
    rowIndex: 2,
    offsetBaselines: 1,
    columnSpan: 2
  },
  {
    id: "headline",
    contentFieldId: "headline",
    styleKey: "headline",
    text: "Deterministic branded layout, resolved from an operator graph.",
    keylineIndex: 1,
    rowIndex: 4,
    offsetBaselines: 0,
    columnSpan: 4
  },
  {
    id: "body",
    contentFieldId: "body",
    styleKey: "body",
    text: "This preview shell is the first in-repo browser surface for parity work. It evaluates the overlay-layout operator, draws guides, and snaps drag edits back onto the baseline grid and column keylines.",
    keylineIndex: 1,
    rowIndex: 8,
    offsetBaselines: 0,
    columnSpan: 3
  }
];

const DEFAULT_LOGO: LogoPlacementSpec = {
  id: "brand-mark",
  xPx: 0,
  yPx: 0,
  widthPx: 148,
  heightPx: 44
};

const DEFAULT_INLINE_TEXT_BY_FIELD_ID: Record<string, string> = Object.fromEntries(
  DEFAULT_TEXT_FIELDS.map((field) => [field.contentFieldId ?? field.id, field.text])
);

const DEFAULT_CSV_DRAFT = [
  "eyebrow,headline,body",
  'Ubuntu Summit 2026,"Deterministic branded layout, resolved from an operator graph.","This preview shell is the first in-repo browser surface for parity work. It evaluates the overlay-layout operator, draws guides, and snaps drag edits back onto the baseline grid and column keylines."',
  'Operator Graph Week,"CSV-backed content can now drive the same placement specs.","This row exists to validate the content-source split before deeper parity work lands in the preview shell."'
].join("\n");

export function createDefaultOverlayParams(): OverlayLayoutOperatorParams {
  return {
    frame: {
      widthPx: 1080,
      heightPx: 1350
    },
    safeArea: {
      top: 48,
      right: 48,
      bottom: 48,
      left: 48
    },
    grid: {
      baselineStepPx: 8,
      rowCount: 12,
      columnCount: 6,
      marginTopBaselines: 6,
      marginBottomBaselines: 6,
      marginLeftBaselines: 5,
      marginRightBaselines: 5,
      rowGutterBaselines: 2,
      columnGutterBaselines: 2,
      fitWithinSafeArea: true
    },
    textStyles: DEFAULT_TEXT_STYLES.map((style) => ({ ...style })),
    textFields: DEFAULT_TEXT_FIELDS.map((field) => ({ ...field })),
    logo: { ...DEFAULT_LOGO },
    contentSource: "inline",
    inlineTextByFieldId: { ...DEFAULT_INLINE_TEXT_BY_FIELD_ID },
    csvContent: {
      draft: DEFAULT_CSV_DRAFT,
      rowIndex: 1
    }
  };
}