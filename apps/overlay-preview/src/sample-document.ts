import type { LogoPlacementSpec, TextFieldPlacementSpec, TextStyleSpec } from "@brand-layout-ops/core-types";
import {
  DEFAULT_OUTPUT_PROFILE_KEY,
  getOutputProfile,
  LINKED_TITLE_BASE_FONT_SIZE_PX,
  OVERLAY_CONTENT_FORMAT_ORDER,
  OVERLAY_CONTENT_FORMATS,
  type OverlayContentFormatSpec
} from "@brand-layout-ops/core-types";
import type { OverlayLayoutOperatorParams } from "@brand-layout-ops/operator-overlay-layout";

// ---------------------------------------------------------------------------
// Text styles — title (A Head), b_head (B Head), paragraph (P)
// ---------------------------------------------------------------------------

export const DEFAULT_TEXT_STYLES: TextStyleSpec[] = [
  {
    key: "title",
    fontSizePx: 42,
    lineHeightPx: 48,
    fontWeight: 200
  },
  {
    key: "b_head",
    fontSizePx: 24,
    lineHeightPx: 32,
    fontWeight: 400
  },
  {
    key: "paragraph",
    fontSizePx: 24,
    lineHeightPx: 32,
    fontWeight: 400
  }
];

export const TEXT_STYLE_DISPLAY_LABELS: Record<string, string> = {
  title: "A Head",
  b_head: "B Head",
  paragraph: "P"
};

// ---------------------------------------------------------------------------
// Per-profile default overlay params (landscape_1280x720)
// ---------------------------------------------------------------------------

function createLandscapeTextFields(): TextFieldPlacementSpec[] {
  return [
    {
      id: "main_heading",
      contentFieldId: "main_heading",
      styleKey: "title",
      text: "Ubuntu\nSummit\n26.04",
      keylineIndex: 2,
      rowIndex: 1,
      offsetBaselines: 0,
      columnSpan: 1
    },
    {
      id: "body_intro",
      contentFieldId: "text_1",
      styleKey: "b_head",
      text: "A showcase\nfor the innovative\nand the ambitious",
      keylineIndex: 3,
      rowIndex: 1,
      offsetBaselines: 0,
      columnSpan: 2
    },
    {
      id: "detail_primary",
      contentFieldId: "text_2",
      styleKey: "paragraph",
      text: "May 27-28, 2026",
      keylineIndex: 3,
      rowIndex: 1,
      offsetBaselines: 15,
      columnSpan: 1
    },
    {
      id: "detail_secondary",
      contentFieldId: "text_3",
      styleKey: "paragraph",
      text: "Online",
      keylineIndex: 3,
      rowIndex: 1,
      offsetBaselines: 15,
      columnSpan: 1
    }
  ];
}

export const LINKED_LOGO_BASE_WIDTH_PX = 63;
export const LINKED_LOGO_BASE_HEIGHT_PX = 108;

const DEFAULT_LOGO: LogoPlacementSpec = {
  id: "brand-mark",
  xPx: 41,
  yPx: 0,
  widthPx: 42,
  heightPx: 72,
  assetPath: "/assets/UbuntuTagLogo.svg"
};

// ---------------------------------------------------------------------------
// Content format field layout overrides per format (landscape profile)
// ---------------------------------------------------------------------------

export interface ContentFormatFieldOverride {
  style: string;
  keylineIndex: number;
  columnSpan: number;
  rowIndex: number;
  offsetBaselines: number;
  label: string;
}

export interface ContentFormatOverrides {
  csvPath: string;
  fields: Record<string, ContentFormatFieldOverride>;
}

export const DEFAULT_FORMAT_OVERRIDES: Record<string, ContentFormatOverrides> = {
  generic_social: {
    csvPath: "./assets/content.csv",
    fields: {
      body_intro: {
        style: "b_head",
        keylineIndex: 3,
        columnSpan: 2,
        rowIndex: 1,
        offsetBaselines: 0,
        label: "B Head"
      },
      detail_primary: {
        style: "paragraph",
        keylineIndex: 2,
        columnSpan: 1,
        rowIndex: 4,
        offsetBaselines: 15,
        label: "Paragraph 1"
      },
      detail_secondary: {
        style: "paragraph",
        keylineIndex: 3,
        columnSpan: 1,
        rowIndex: 4,
        offsetBaselines: 15,
        label: "Paragraph 2"
      }
    }
  },
  speaker_highlight: {
    csvPath: "./assets/content-speaker-highlight.csv",
    fields: {
      session_title: {
        style: "b_head",
        keylineIndex: 3,
        columnSpan: 2,
        rowIndex: 6,
        offsetBaselines: 9,
        label: "Session Title"
      },
      speaker_name: {
        style: "paragraph",
        keylineIndex: 3,
        columnSpan: 2,
        rowIndex: 7,
        offsetBaselines: 4,
        label: "Speaker Name"
      },
      speaker_role: {
        style: "paragraph",
        keylineIndex: 3,
        columnSpan: 2,
        rowIndex: 7,
        offsetBaselines: 14,
        label: "Speaker Role"
      }
    }
  }
};

// ---------------------------------------------------------------------------
// CSV sample data
// ---------------------------------------------------------------------------

const DEFAULT_CSV_DRAFT = [
  "main_heading,text_1,text_2,text_3",
  '"Ubuntu\\nSummit\\n26.04","A showcase\\nfor the innovative\\nand the ambitious","May 27-28, 2026","Online"',
  '"Ubuntu\\nSummit\\n26.04","Kernel rebuild, now with actual reference defaults.","Parity audit","In progress"'
].join("\n");

const SPEAKER_CSV_DRAFT = [
  "session_title,speaker_name,speaker_role,speaker_photo",
  '"Developer ready Ubuntu on Qualcomm IoT","Ameya Pandit","Software Engineering Lead, Qualcomm","./assets/speaker_photos/ameya_pandit.jpg"'
].join("\n");

// ---------------------------------------------------------------------------
// Linked title-to-logo scaling
// ---------------------------------------------------------------------------

export function getLinkedTitleFontSizePx(
  logoHeightPx: number,
  baseFontSizePx: number = LINKED_TITLE_BASE_FONT_SIZE_PX,
  baseLogoHeightPx: number = LINKED_LOGO_BASE_HEIGHT_PX
): number {
  if (logoHeightPx <= 0 || baseFontSizePx <= 0 || baseLogoHeightPx <= 0) {
    return Math.round(baseFontSizePx);
  }

  return Math.round(baseFontSizePx * (logoHeightPx / baseLogoHeightPx));
}

export function getLinkedLogoHeightPx(
  titleFontSizePx: number,
  baseFontSizePx: number = LINKED_TITLE_BASE_FONT_SIZE_PX,
  baseLogoHeightPx: number = LINKED_LOGO_BASE_HEIGHT_PX
): number {
  if (titleFontSizePx <= 0 || baseFontSizePx <= 0 || baseLogoHeightPx <= 0) {
    return Math.round(baseLogoHeightPx);
  }

  return Math.round(baseLogoHeightPx * (titleFontSizePx / baseFontSizePx));
}

export function getLinkedLogoDimensionsPx(
  titleFontSizePx: number,
  aspectRatio: number = LINKED_LOGO_BASE_WIDTH_PX / LINKED_LOGO_BASE_HEIGHT_PX,
  baseFontSizePx: number = LINKED_TITLE_BASE_FONT_SIZE_PX,
  baseLogoHeightPx: number = LINKED_LOGO_BASE_HEIGHT_PX
): { widthPx: number; heightPx: number } {
  const safeAspectRatio = aspectRatio > 0 ? aspectRatio : LINKED_LOGO_BASE_WIDTH_PX / LINKED_LOGO_BASE_HEIGHT_PX;
  const heightPx = getLinkedLogoHeightPx(titleFontSizePx, baseFontSizePx, baseLogoHeightPx);
  return {
    widthPx: Math.max(1, Math.round(heightPx * safeAspectRatio)),
    heightPx: Math.max(1, heightPx)
  };
}

// ---------------------------------------------------------------------------
// Preset infrastructure
// ---------------------------------------------------------------------------

export interface Preset {
  id: string;
  name: string;
  config: OverlayLayoutOperatorParams;
  outputProfileKey?: string;
  contentFormatKey?: string;
}

const PRESET_STORAGE_KEY = "brand-layout-ops-presets-v1";
const ACTIVE_PRESET_STORAGE_KEY = "brand-layout-ops-active-preset-v1";

export function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePresets(presets: Preset[]): void {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

export function loadActivePresetId(): string | null {
  return localStorage.getItem(ACTIVE_PRESET_STORAGE_KEY);
}

export function saveActivePresetId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(ACTIVE_PRESET_STORAGE_KEY);
  } else {
    localStorage.setItem(ACTIVE_PRESET_STORAGE_KEY, id);
  }
}

export function createPresetId(): string {
  return `preset-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function getNextPresetName(existingPresets: Preset[]): string {
  let index = existingPresets.length + 1;
  const existingNames = new Set(existingPresets.map((p) => p.name));
  while (existingNames.has(`Preset ${index}`)) {
    index += 1;
  }
  return `Preset ${index}`;
}

// ---------------------------------------------------------------------------
// Build text fields from a content format spec
// ---------------------------------------------------------------------------

export function buildTextFieldsForFormat(
  formatKey: string,
  overrides: Record<string, ContentFormatOverrides> = DEFAULT_FORMAT_OVERRIDES,
  mainHeadingField?: TextFieldPlacementSpec
): TextFieldPlacementSpec[] {
  const formatSpec: OverlayContentFormatSpec =
    OVERLAY_CONTENT_FORMATS[formatKey] ?? OVERLAY_CONTENT_FORMATS[OVERLAY_CONTENT_FORMAT_ORDER[0]];
  const formatOverride = overrides[formatSpec.key];

  const fields: TextFieldPlacementSpec[] = [];

  if (mainHeadingField) {
    fields.push({ ...mainHeadingField });
  } else {
    fields.push({
      id: "main_heading",
      contentFieldId: "main_heading",
      styleKey: "title",
      text: "Ubuntu\nSummit\n26.04",
      keylineIndex: 2,
      rowIndex: 1,
      offsetBaselines: 0,
      columnSpan: 1
    });
  }

  for (const fieldSpec of formatSpec.fields) {
    const override = formatOverride?.fields[fieldSpec.id];
    fields.push({
      id: fieldSpec.id,
      contentFieldId: fieldSpec.id,
      styleKey: override?.style ?? fieldSpec.style,
      text: "",
      keylineIndex: override?.keylineIndex ?? 3,
      rowIndex: override?.rowIndex ?? 1,
      offsetBaselines: override?.offsetBaselines ?? 0,
      columnSpan: override?.columnSpan ?? 1
    });
  }

  return fields;
}

// ---------------------------------------------------------------------------
// Resolve CSV header from field aliases
// ---------------------------------------------------------------------------

export function findCsvHeaderForField(
  headers: string[],
  fieldId: string,
  formatKey: string
): string | undefined {
  const formatSpec = OVERLAY_CONTENT_FORMATS[formatKey] ?? OVERLAY_CONTENT_FORMATS[OVERLAY_CONTENT_FORMAT_ORDER[0]];
  const fieldSpec = formatSpec.fields.find((f) => f.id === fieldId);
  const aliases = fieldSpec ? [fieldSpec.id, ...(fieldSpec.aliases ?? [])] : [fieldId];

  for (const alias of aliases) {
    const found = headers.find((h) => h === alias);
    if (found) return found;
  }

  const legacySlot = fieldSpec?.legacySlot;
  if (legacySlot) {
    const found = headers.find((h) => h === legacySlot);
    if (found) return found;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Export settings
// ---------------------------------------------------------------------------

export interface ExportSettings {
  exportName: string;
  frameRate: number;
  transparentBackground: boolean;
}

export function createDefaultExportSettings(profileKey: string = DEFAULT_OUTPUT_PROFILE_KEY): ExportSettings {
  const profile = getOutputProfile(profileKey);
  return {
    exportName: "UbuntuSummit2026",
    frameRate: profile.defaultFrameRate,
    transparentBackground: false
  };
}

// ---------------------------------------------------------------------------
// Default overlay params factory
// ---------------------------------------------------------------------------

export function createDefaultOverlayParams(
  profileKey: string = DEFAULT_OUTPUT_PROFILE_KEY,
  formatKey: string = "generic_social"
): OverlayLayoutOperatorParams {
  const profile = getOutputProfile(profileKey);
  const textFields = buildTextFieldsForFormat(formatKey);

  // Build a lookup from the landscape defaults keyed by legacy contentFieldId
  const landscapeTextByContentField = new Map(
    createLandscapeTextFields().map((f) => [f.contentFieldId ?? f.id, f.text])
  );

  // Map each format field to its default text using the legacySlot → landscape text
  const formatSpec = OVERLAY_CONTENT_FORMATS[formatKey] ?? OVERLAY_CONTENT_FORMATS[OVERLAY_CONTENT_FORMAT_ORDER[0]];
  const inlineTextByFieldId: Record<string, string> = {};
  inlineTextByFieldId["main_heading"] = landscapeTextByContentField.get("main_heading") ?? "";
  for (const fieldSpec of formatSpec.fields) {
    const legacyText = fieldSpec.legacySlot ? landscapeTextByContentField.get(fieldSpec.legacySlot) : undefined;
    inlineTextByFieldId[fieldSpec.id] = legacyText ?? "";
  }

  return {
    frame: {
      widthPx: profile.widthPx,
      heightPx: profile.heightPx
    },
    safeArea: { ...profile.safeArea },
    grid: {
      baselineStepPx: 8,
      rowCount: 4,
      columnCount: 4,
      marginTopBaselines: 4,
      marginBottomBaselines: 4,
      marginLeftBaselines: 5,
      marginRightBaselines: 5,
      rowGutterBaselines: 4,
      columnGutterBaselines: 0,
      fitWithinSafeArea: true
    },
    textStyles: DEFAULT_TEXT_STYLES.map((s) => ({ ...s })),
    textFields: textFields.map((f) => ({ ...f })),
    logo: { ...DEFAULT_LOGO },
    contentSource: "inline",
    inlineTextByFieldId,
    csvContent: {
      draft: formatKey === "speaker_highlight" ? SPEAKER_CSV_DRAFT : DEFAULT_CSV_DRAFT,
      rowIndex: 1
    }
  };
}