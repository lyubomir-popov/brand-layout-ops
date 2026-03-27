import type { GridSettings, LogoPlacementSpec, TextFieldPlacementSpec, TextStyleSpec } from "@brand-layout-ops/core-types";
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
// Per-profile grid defaults (reference: default-config-source.js)
// ---------------------------------------------------------------------------

const PROFILE_GRID_DEFAULTS: Record<string, GridSettings> = {
  landscape_1280x720: {
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
  instagram_1080x1350: {
    baselineStepPx: 8,
    rowCount: 8,
    columnCount: 4,
    marginTopBaselines: 5,
    marginBottomBaselines: 6,
    marginLeftBaselines: 6,
    marginRightBaselines: 6,
    rowGutterBaselines: 0,
    columnGutterBaselines: 0,
    fitWithinSafeArea: true
  },
  story_1080x1920: {
    baselineStepPx: 8,
    rowCount: 4,
    columnCount: 4,
    marginTopBaselines: 6,
    marginBottomBaselines: 9,
    marginLeftBaselines: 0,
    marginRightBaselines: 0,
    rowGutterBaselines: 0,
    columnGutterBaselines: 0,
    fitWithinSafeArea: true
  },
  screen_3840x2160: {
    baselineStepPx: 24,
    rowCount: 4,
    columnCount: 8,
    marginTopBaselines: 4,
    marginBottomBaselines: 4,
    marginLeftBaselines: 4,
    marginRightBaselines: 4,
    rowGutterBaselines: 0,
    columnGutterBaselines: 0,
    fitWithinSafeArea: false
  },
  tablet_2560x1600: {
    baselineStepPx: 8,
    rowCount: 4,
    columnCount: 4,
    marginTopBaselines: 0,
    marginBottomBaselines: 9,
    marginLeftBaselines: 0,
    marginRightBaselines: 0,
    rowGutterBaselines: 4,
    columnGutterBaselines: 4,
    fitWithinSafeArea: true
  }
};

function getDefaultGridForProfile(profileKey: string): GridSettings {
  return { ...(PROFILE_GRID_DEFAULTS[profileKey] ?? PROFILE_GRID_DEFAULTS.landscape_1280x720) };
}

// ---------------------------------------------------------------------------
// Per-profile text style overrides (reference: default-config-source.js)
// ---------------------------------------------------------------------------

interface TextStyleOverrides {
  title: { fontSizePx: number; lineHeightPx: number };
  b_head: { fontSizePx: number; lineHeightPx: number };
  paragraph: { fontSizePx: number; lineHeightPx: number };
}

const PROFILE_TEXT_STYLE_OVERRIDES: Record<string, TextStyleOverrides> = {
  landscape_1280x720: {
    title: { fontSizePx: 42, lineHeightPx: 48 },
    b_head: { fontSizePx: 24, lineHeightPx: 32 },
    paragraph: { fontSizePx: 24, lineHeightPx: 32 }
  },
  instagram_1080x1350: {
    title: { fontSizePx: 63, lineHeightPx: 64 },
    b_head: { fontSizePx: 32, lineHeightPx: 36 },
    paragraph: { fontSizePx: 32, lineHeightPx: 36 }
  },
  story_1080x1920: {
    title: { fontSizePx: 63, lineHeightPx: 64 },
    b_head: { fontSizePx: 32, lineHeightPx: 36 },
    paragraph: { fontSizePx: 32, lineHeightPx: 36 }
  },
  screen_3840x2160: {
    title: { fontSizePx: 110, lineHeightPx: 112 },
    b_head: { fontSizePx: 55, lineHeightPx: 72 },
    paragraph: { fontSizePx: 32, lineHeightPx: 36 }
  },
  tablet_2560x1600: {
    title: { fontSizePx: 63, lineHeightPx: 64 },
    b_head: { fontSizePx: 32, lineHeightPx: 36 },
    paragraph: { fontSizePx: 32, lineHeightPx: 36 }
  }
};

function getTextStylesForProfile(profileKey: string): TextStyleSpec[] {
  const overrides = PROFILE_TEXT_STYLE_OVERRIDES[profileKey] ?? PROFILE_TEXT_STYLE_OVERRIDES.landscape_1280x720;
  return DEFAULT_TEXT_STYLES.map((s) => {
    const ov = overrides[s.key as keyof TextStyleOverrides];
    return ov ? { ...s, fontSizePx: ov.fontSizePx, lineHeightPx: ov.lineHeightPx } : { ...s };
  });
}

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
  profileFormatBuckets?: ProfileFormatBuckets;
}

export type ProfileFormatBuckets = Record<string, Record<string, OverlayLayoutOperatorParams>>;

export interface PersistedPreset {
  id: string;
  name: string;
  config: unknown;
  outputProfileKey?: string;
  contentFormatKey?: string;
  profileFormatBuckets?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function deepEqualJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function stripEqualValues(value: unknown, defaults: unknown): unknown {
  if (deepEqualJson(value, defaults)) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return cloneJson(value);
  }

  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    const defaultRecord = isRecord(defaults) ? defaults : {};

    for (const [key, childValue] of Object.entries(value)) {
      const strippedChild = stripEqualValues(childValue, defaultRecord[key]);
      if (typeof strippedChild !== "undefined") {
        result[key] = strippedChild;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  return cloneJson(value);
}

function mergeWithDefaults<T>(defaults: T, partial: unknown): T {
  if (typeof partial === "undefined") {
    return cloneJson(defaults);
  }

  if (Array.isArray(partial)) {
    return cloneJson(partial) as T;
  }

  if (isRecord(partial)) {
    const base = isRecord(defaults) ? cloneJson(defaults) as Record<string, unknown> : {};
    for (const [key, childValue] of Object.entries(partial)) {
      const childDefault = isRecord(defaults) ? (defaults as Record<string, unknown>)[key] : undefined;
      base[key] = mergeWithDefaults(childDefault, childValue);
    }
    return base as T;
  }

  return cloneJson(partial) as T;
}

export function cloneOverlayParams(params: OverlayLayoutOperatorParams): OverlayLayoutOperatorParams {
  return cloneJson(params);
}

export function cloneProfileFormatBuckets(buckets: ProfileFormatBuckets): ProfileFormatBuckets {
  return cloneJson(buckets);
}

function normalizeOverlayParams(
  params: OverlayLayoutOperatorParams,
  profileKey: string,
  formatKey: string
): unknown {
  const defaults = createDefaultOverlayParams(profileKey, formatKey);
  return stripEqualValues(params, defaults) ?? {};
}

function denormalizeOverlayParams(
  partialParams: unknown,
  profileKey: string,
  formatKey: string
): OverlayLayoutOperatorParams {
  const defaults = createDefaultOverlayParams(profileKey, formatKey);
  return mergeWithDefaults(defaults, partialParams);
}

export function normalizePresetForPersistence(preset: Preset): PersistedPreset {
  const outputProfileKey = preset.outputProfileKey ?? DEFAULT_OUTPUT_PROFILE_KEY;
  const contentFormatKey = preset.contentFormatKey ?? OVERLAY_CONTENT_FORMAT_ORDER[0];
  const persistedBuckets: Record<string, Record<string, unknown>> = {};

  for (const [profileKey, formatBuckets] of Object.entries(preset.profileFormatBuckets ?? {})) {
    const nextFormatBuckets: Record<string, unknown> = {};
    for (const [formatKey, params] of Object.entries(formatBuckets)) {
      nextFormatBuckets[formatKey] = normalizeOverlayParams(params, profileKey, formatKey);
    }
    persistedBuckets[profileKey] = nextFormatBuckets;
  }

  return {
    id: preset.id,
    name: preset.name,
    config: normalizeOverlayParams(preset.config, outputProfileKey, contentFormatKey),
    outputProfileKey,
    contentFormatKey,
    profileFormatBuckets: persistedBuckets
  };
}

export function denormalizePresetFromPersistence(rawPreset: unknown): Preset | null {
  if (!isRecord(rawPreset)) {
    return null;
  }

  const id = typeof rawPreset.id === "string" ? rawPreset.id : "";
  const name = typeof rawPreset.name === "string" ? rawPreset.name : "";
  if (!id || !name) {
    return null;
  }

  const outputProfileKey = typeof rawPreset.outputProfileKey === "string"
    ? rawPreset.outputProfileKey
    : DEFAULT_OUTPUT_PROFILE_KEY;
  const contentFormatKey = typeof rawPreset.contentFormatKey === "string"
    ? rawPreset.contentFormatKey
    : OVERLAY_CONTENT_FORMAT_ORDER[0];
  const config = denormalizeOverlayParams(rawPreset.config, outputProfileKey, contentFormatKey);

  const buckets: ProfileFormatBuckets = {};
  if (isRecord(rawPreset.profileFormatBuckets)) {
    for (const [profileKey, rawFormatBuckets] of Object.entries(rawPreset.profileFormatBuckets)) {
      if (!isRecord(rawFormatBuckets)) {
        continue;
      }

      const nextFormatBuckets: Record<string, OverlayLayoutOperatorParams> = {};
      for (const [formatKey, rawParams] of Object.entries(rawFormatBuckets)) {
        nextFormatBuckets[formatKey] = denormalizeOverlayParams(rawParams, profileKey, formatKey);
      }

      buckets[profileKey] = nextFormatBuckets;
    }
  }

  if (!buckets[outputProfileKey]) {
    buckets[outputProfileKey] = {};
  }
  if (!buckets[outputProfileKey][contentFormatKey]) {
    buckets[outputProfileKey][contentFormatKey] = cloneOverlayParams(config);
  }

  return {
    id,
    name,
    config,
    outputProfileKey,
    contentFormatKey,
    profileFormatBuckets: buckets
  };
}

const PRESET_STORAGE_KEY = "brand-layout-ops-presets-v1";
const ACTIVE_PRESET_STORAGE_KEY = "brand-layout-ops-active-preset-v1";
const OUTPUT_FORMAT_STORAGE_KEY = "brand-layout-ops-output-format-v1";

export function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => denormalizePresetFromPersistence(entry))
      .filter((entry): entry is Preset => entry !== null);
  } catch {
    return [];
  }
}

export function savePresets(presets: Preset[]): void {
  localStorage.setItem(
    PRESET_STORAGE_KEY,
    JSON.stringify(presets.map((preset) => normalizePresetForPersistence(preset)))
  );
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

export function loadOutputFormatKey(): string | null {
  return localStorage.getItem(OUTPUT_FORMAT_STORAGE_KEY);
}

export function saveOutputFormatKey(profileKey: string, formatKey: string): void {
  localStorage.setItem(OUTPUT_FORMAT_STORAGE_KEY, JSON.stringify({ profileKey, formatKey }));
}

export function loadOutputFormatKeys(): { profileKey: string; formatKey: string } | null {
  try {
    const raw = localStorage.getItem(OUTPUT_FORMAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.profileKey === "string" && typeof parsed?.formatKey === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
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
    grid: getDefaultGridForProfile(profileKey),
    textStyles: getTextStylesForProfile(profileKey),
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