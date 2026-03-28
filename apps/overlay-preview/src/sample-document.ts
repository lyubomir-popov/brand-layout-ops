import type { LogoPlacementSpec, TextFieldPlacementSpec, TextStyleSpec } from "@brand-layout-ops/core-types";
import {
  DEFAULT_OUTPUT_PROFILE_KEY,
  getOutputProfile,
  LINKED_LOGO_BASE_HEIGHT_PX,
  LINKED_LOGO_BASE_WIDTH_PX,
  LINKED_TITLE_BASE_FONT_SIZE_PX,
  OVERLAY_CONTENT_FORMAT_ORDER,
  OVERLAY_CONTENT_FORMATS,
  type OverlayContentFormatSpec
} from "@brand-layout-ops/core-types";
import {
  applyOverlayProfileTextStyleDefaults,
  getDefaultOverlayGridForProfile,
  type OverlayLayoutOperatorParams
} from "@brand-layout-ops/operator-overlay-layout";

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
// Preset infrastructure
// ---------------------------------------------------------------------------

export interface Preset {
  id: string;
  name: string;
  config: OverlayLayoutOperatorParams;
  outputProfileKey?: string;
  contentFormatKey?: string;
  profileFormatBuckets?: ProfileFormatBuckets;
  contentFormatKeyByProfile?: ProfileContentFormatMap;
  exportSettingsByProfile?: Record<string, ExportSettings>;
  haloConfigByProfile?: Record<string, unknown>;
}

export type ProfileFormatBuckets = Record<string, Record<string, OverlayLayoutOperatorParams>>;
export type ProfileContentFormatMap = Record<string, string>;

export interface PersistedPreset {
  id: string;
  name: string;
  config: unknown;
  outputProfileKey?: string;
  contentFormatKey?: string;
  profileFormatBuckets?: unknown;
  contentFormatKeyByProfile?: unknown;
  exportSettingsByProfile?: unknown;
  haloConfigByProfile?: unknown;
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

export function cloneProfileContentFormatMap(contentFormatKeyByProfile: ProfileContentFormatMap): ProfileContentFormatMap {
  return cloneJson(contentFormatKeyByProfile);
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
    profileFormatBuckets: persistedBuckets,
    contentFormatKeyByProfile: cloneJson(preset.contentFormatKeyByProfile ?? {}),
    exportSettingsByProfile: cloneJson(preset.exportSettingsByProfile ?? {}),
    haloConfigByProfile: cloneJson(preset.haloConfigByProfile ?? {})
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

  const contentFormatKeyByProfile: ProfileContentFormatMap = {};
  if (isRecord(rawPreset.contentFormatKeyByProfile)) {
    for (const [profileKey, rawFormatKey] of Object.entries(rawPreset.contentFormatKeyByProfile)) {
      if (typeof rawFormatKey === "string") {
        contentFormatKeyByProfile[profileKey] = rawFormatKey;
      }
    }
  }
  contentFormatKeyByProfile[outputProfileKey] ??= contentFormatKey;

  const exportSettingsByProfile: Record<string, ExportSettings> = {};
  if (isRecord(rawPreset.exportSettingsByProfile)) {
    for (const [profileKey, rawExportSettings] of Object.entries(rawPreset.exportSettingsByProfile)) {
      exportSettingsByProfile[profileKey] = isRecord(rawExportSettings)
        ? {
          ...createDefaultExportSettings(profileKey),
          ...rawExportSettings
        }
        : createDefaultExportSettings(profileKey);
    }
  }

  return {
    id,
    name,
    config,
    outputProfileKey,
    contentFormatKey,
    profileFormatBuckets: buckets,
    contentFormatKeyByProfile,
    exportSettingsByProfile,
    haloConfigByProfile: isRecord(rawPreset.haloConfigByProfile)
      ? cloneJson(rawPreset.haloConfigByProfile)
      : {}
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
    grid: getDefaultOverlayGridForProfile(profileKey),
    textStyles: applyOverlayProfileTextStyleDefaults(DEFAULT_TEXT_STYLES, profileKey),
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