import {
  DEFAULT_OUTPUT_PROFILE_KEY,
  getOutputProfile,
  OUTPUT_PROFILE_ORDER,
  OUTPUT_PROFILES,
  OVERLAY_CONTENT_FORMATS,
  OVERLAY_CONTENT_FORMAT_ORDER,
  type OverlayContentFormatSpec,
  type FrameSize,
  type GridSettings,
  type LayerScene,
  type LayoutGridMetrics,
  type LogoPlacement,
  type LogoPlacementSpec,
  type OperatorDefinition,
  type OperatorParameterSchema,
  type SafeAreaInsets,
  type TextFieldPlacementSpec,
  type TextMeasurer,
  type TextStyleSpec
} from "@brand-layout-ops/core-types";
import { getLinkedLogoDimensionsPx, resolveLayerScene } from "@brand-layout-ops/layout-engine";
import {
  createApproximateTextMeasurer,
  getMinimumFirstBaselineInsetBaselines,
  type ApproximateTextMeasureOptions
} from "@brand-layout-ops/layout-text";

export const OVERLAY_LAYOUT_OPERATOR_KEY = "overlay.layout";

export type OverlayContentSource = "inline" | "csv";

export interface OverlayCsvContent {
  draft: string;
  rowIndex: number;
}

export interface OverlayCsvDraftTable {
  headers: string[];
  rows: string[][];
  hasUnterminatedQuote: boolean;
}

export interface OverlayCsvDraftSummary {
  headers: string[];
  rowCount: number;
  selectedRowIndex: number;
  selectedRowExists: boolean;
  selectedRowValues: Record<string, string>;
  missingFieldKeys: string[];
  hasUnterminatedQuote: boolean;
}

export interface OverlayLayoutOperatorParams {
  frame: FrameSize;
  safeArea: SafeAreaInsets;
  grid: GridSettings;
  textFields: TextFieldPlacementSpec[];
  textStyles: TextStyleSpec[];
  logo?: LogoPlacementSpec;
  contentSource?: OverlayContentSource;
  inlineTextByFieldId?: Record<string, string>;
  csvContent?: OverlayCsvContent;
}

export type ProfileFormatBuckets = Record<string, Record<string, OverlayLayoutOperatorParams>>;
export type ProfileContentFormatMap = Record<string, string>;

export interface OverlayProfileBucketState {
  outputProfileKey: string;
  contentFormatKey: string;
  profileFormatBuckets: ProfileFormatBuckets;
  contentFormatKeyByProfile: ProfileContentFormatMap;
}

export interface OverlaySourceDefaultSnapshot<
  TExportSettings extends object,
  THaloConfig extends object,
  TGuideMode extends string = string
> {
  outputProfileKey: string;
  contentFormatKey: string;
  profileFormatBuckets: ProfileFormatBuckets;
  contentFormatKeyByProfile: ProfileContentFormatMap;
  exportSettings: TExportSettings;
  exportSettingsByProfile: Record<string, TExportSettings>;
  haloConfig: THaloConfig;
  haloConfigByProfile: Record<string, THaloConfig>;
  guideMode: TGuideMode;
}

export const OVERLAY_DOCUMENT_FILE_KIND = "brand-layout-ops.document";
export const OVERLAY_DOCUMENT_FILE_VERSION = 1;

export const OVERLAY_SCENE_FAMILY_ORDER = [
  "halo",
  "phyllotaxis",
  "fuzzy-boids"
] as const;

export type OverlaySceneFamilyKey = typeof OVERLAY_SCENE_FAMILY_ORDER[number];

export const DEFAULT_OVERLAY_SCENE_FAMILY_KEY: OverlaySceneFamilyKey = OVERLAY_SCENE_FAMILY_ORDER[0];

export interface OverlayDocumentMetadata {
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface OverlayDocumentTarget {
  id: string;
  label: string;
  outputProfileKey: string;
}

export interface OverlayDocumentProject {
  sceneFamilyKey: OverlaySceneFamilyKey;
  activeTargetId: string;
  targets: OverlayDocumentTarget[];
}

export interface OverlayDocumentFile<
  TExportSettings extends object,
  THaloConfig extends object,
  TGuideMode extends string = string
> {
  kind: typeof OVERLAY_DOCUMENT_FILE_KIND;
  version: typeof OVERLAY_DOCUMENT_FILE_VERSION;
  metadata: OverlayDocumentMetadata;
  project: OverlayDocumentProject;
  state: OverlaySourceDefaultSnapshot<TExportSettings, THaloConfig, TGuideMode>;
}

export interface CreateOverlaySourceDefaultSnapshotOptions<
  TExportSettings extends object,
  THaloConfig extends object,
  TGuideMode extends string = string
> {
  outputProfileKey: string;
  contentFormatKey: string;
  guideMode: TGuideMode;
  createExportSettings: (profileKey: string) => TExportSettings;
  createHaloConfig: (profileKey: string) => THaloConfig;
}

export interface CreateOverlayDocumentFileOptions<
  TExportSettings extends object,
  THaloConfig extends object,
  TGuideMode extends string = string
> {
  name: string;
  project?: OverlayDocumentProject;
  state: OverlaySourceDefaultSnapshot<TExportSettings, THaloConfig, TGuideMode>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SanitizeOverlaySourceDefaultSnapshotOptions<
  TExportSettings extends object,
  THaloConfig extends object,
  TGuideMode extends string = string
> {
  fallbackSnapshot: OverlaySourceDefaultSnapshot<TExportSettings, THaloConfig, TGuideMode>;
  createExportSettings: (profileKey: string) => TExportSettings;
  createHaloConfig: (profileKey: string, rawHaloConfig?: unknown) => THaloConfig;
  normalizeGuideMode: (rawGuideMode: unknown) => TGuideMode;
}

export interface SanitizeOverlayDocumentFileOptions<
  TExportSettings extends object,
  THaloConfig extends object,
  TGuideMode extends string = string
> extends SanitizeOverlaySourceDefaultSnapshotOptions<TExportSettings, THaloConfig, TGuideMode> {
  fallbackName?: string;
  now?: string;
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

export interface OverlayProfileTextStyleOverrides {
  title: { fontSizePx: number; lineHeightPx: number };
  b_head: { fontSizePx: number; lineHeightPx: number };
  paragraph: { fontSizePx: number; lineHeightPx: number };
}

function cloneOverlayJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOverlayDocumentName(rawName: unknown, fallbackName: string): string {
  if (typeof rawName !== "string") {
    return fallbackName;
  }

  const trimmedName = rawName.trim();
  return trimmedName.length > 0 ? trimmedName : fallbackName;
}

function normalizeOverlayDocumentTimestamp(rawTimestamp: unknown, fallbackTimestamp: string): string {
  if (typeof rawTimestamp !== "string") {
    return fallbackTimestamp;
  }

  const trimmedTimestamp = rawTimestamp.trim();
  return trimmedTimestamp.length > 0 ? trimmedTimestamp : fallbackTimestamp;
}

function normalizeOverlayDocumentString(rawValue: unknown, fallbackValue: string): string {
  if (typeof rawValue !== "string") {
    return fallbackValue;
  }

  const trimmedValue = rawValue.trim();
  return trimmedValue.length > 0 ? trimmedValue : fallbackValue;
}

function normalizeOverlaySceneFamilyKey(
  rawSceneFamilyKey: unknown,
  fallbackKey: OverlaySceneFamilyKey = DEFAULT_OVERLAY_SCENE_FAMILY_KEY
): OverlaySceneFamilyKey {
  if (typeof rawSceneFamilyKey !== "string") {
    return fallbackKey;
  }

  return OVERLAY_SCENE_FAMILY_ORDER.includes(rawSceneFamilyKey as OverlaySceneFamilyKey)
    ? rawSceneFamilyKey as OverlaySceneFamilyKey
    : fallbackKey;
}

function getOverlayDocumentTargetLabel(outputProfileKey: string): string {
  return OUTPUT_PROFILES[outputProfileKey]?.label ?? outputProfileKey;
}

function getOverlayDocumentTargetId(outputProfileKey: string): string {
  return outputProfileKey;
}

function getOrderedOverlayDocumentProfileKeys(profileKeys: Iterable<string>): string[] {
  const uniqueProfileKeys = new Set<string>();
  for (const profileKey of profileKeys) {
    const normalizedProfileKey = normalizeOverlayDocumentString(profileKey, "");
    if (normalizedProfileKey.length > 0) {
      uniqueProfileKeys.add(normalizedProfileKey);
    }
  }

  if (uniqueProfileKeys.size === 0) {
    return [DEFAULT_OUTPUT_PROFILE_KEY];
  }

  const knownProfileKeys = OUTPUT_PROFILE_ORDER.filter((profileKey) => uniqueProfileKeys.has(profileKey));
  const extraProfileKeys = [...uniqueProfileKeys]
    .filter((profileKey) => !OUTPUT_PROFILE_ORDER.includes(profileKey))
    .sort((left, right) => left.localeCompare(right));

  return [...knownProfileKeys, ...extraProfileKeys];
}

function getOverlayDocumentProfileKeysFromSnapshot<
  TExportSettings extends object,
  THaloConfig extends object,
  TGuideMode extends string = string
>(
  snapshot: OverlaySourceDefaultSnapshot<TExportSettings, THaloConfig, TGuideMode>
): string[] {
  return getOrderedOverlayDocumentProfileKeys([
    snapshot.outputProfileKey,
    ...Object.keys(snapshot.profileFormatBuckets),
    ...Object.keys(snapshot.contentFormatKeyByProfile),
    ...Object.keys(snapshot.exportSettingsByProfile),
    ...Object.keys(snapshot.haloConfigByProfile)
  ]);
}

function createOverlayDocumentTarget(outputProfileKey: string, rawTarget?: unknown): OverlayDocumentTarget {
  return {
    id: normalizeOverlayDocumentString(
      isRecord(rawTarget) ? rawTarget.id : undefined,
      getOverlayDocumentTargetId(outputProfileKey)
    ),
    label: normalizeOverlayDocumentString(
      isRecord(rawTarget) ? rawTarget.label : undefined,
      getOverlayDocumentTargetLabel(outputProfileKey)
    ),
    outputProfileKey
  };
}

export function cloneOverlayDocumentProject(project: OverlayDocumentProject): OverlayDocumentProject {
  return cloneOverlayJson(project);
}

export function normalizeOverlayDocumentProject<
  TExportSettings extends object,
  THaloConfig extends object,
  TGuideMode extends string = string
>(
  rawProject: unknown,
  snapshot: OverlaySourceDefaultSnapshot<TExportSettings, THaloConfig, TGuideMode>
): OverlayDocumentProject {
  const fallbackTargets = getOverlayDocumentProfileKeysFromSnapshot(snapshot).map((profileKey) => (
    createOverlayDocumentTarget(profileKey)
  ));

  if (!isRecord(rawProject)) {
    const activeTargetId = fallbackTargets.find((target) => target.outputProfileKey === snapshot.outputProfileKey)?.id
      ?? fallbackTargets[0]?.id
      ?? getOverlayDocumentTargetId(snapshot.outputProfileKey);

    return {
      sceneFamilyKey: DEFAULT_OVERLAY_SCENE_FAMILY_KEY,
      activeTargetId,
      targets: fallbackTargets
    };
  }

  const targets: OverlayDocumentTarget[] = [];
  const seenProfileKeys = new Set<string>();
  const seenTargetIds = new Set<string>();

  if (Array.isArray(rawProject.targets)) {
    for (const rawTarget of rawProject.targets) {
      if (!isRecord(rawTarget)) {
        continue;
      }

      const outputProfileKey = normalizeOverlayDocumentString(rawTarget.outputProfileKey, snapshot.outputProfileKey);
      if (seenProfileKeys.has(outputProfileKey)) {
        continue;
      }

      let target = createOverlayDocumentTarget(outputProfileKey, rawTarget);
      if (seenTargetIds.has(target.id)) {
        target = {
          ...target,
          id: `${target.id}-${targets.length + 1}`
        };
      }

      targets.push(target);
      seenProfileKeys.add(outputProfileKey);
      seenTargetIds.add(target.id);
    }
  }

  for (const fallbackTarget of fallbackTargets) {
    if (seenProfileKeys.has(fallbackTarget.outputProfileKey)) {
      continue;
    }

    let nextId = fallbackTarget.id;
    let suffix = 2;
    while (seenTargetIds.has(nextId)) {
      nextId = `${fallbackTarget.id}-${suffix}`;
      suffix += 1;
    }

    targets.push({
      ...fallbackTarget,
      id: nextId
    });
    seenProfileKeys.add(fallbackTarget.outputProfileKey);
    seenTargetIds.add(nextId);
  }

  const snapshotTargetId = targets.find((target) => target.outputProfileKey === snapshot.outputProfileKey)?.id
    ?? targets[0]?.id
    ?? getOverlayDocumentTargetId(snapshot.outputProfileKey);
  const activeTargetId = typeof rawProject.activeTargetId === "string" && targets.some((target) => (
    target.id === rawProject.activeTargetId && target.outputProfileKey === snapshot.outputProfileKey
  ))
    ? rawProject.activeTargetId
    : snapshotTargetId;

  return {
    sceneFamilyKey: normalizeOverlaySceneFamilyKey(rawProject.sceneFamilyKey),
    activeTargetId,
    targets
  };
}

export function createOverlayDocumentProjectFromSnapshot<
  TExportSettings extends object,
  THaloConfig extends object,
  TGuideMode extends string = string
>(
  snapshot: OverlaySourceDefaultSnapshot<TExportSettings, THaloConfig, TGuideMode>,
  projectOverrides?: Partial<OverlayDocumentProject>
): OverlayDocumentProject {
  return normalizeOverlayDocumentProject(projectOverrides, snapshot);
}

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

export const DEFAULT_OVERLAY_TEXT_STYLES: TextStyleSpec[] = [
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

export const OVERLAY_PROFILE_GRID_DEFAULTS: Record<string, GridSettings> = {
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

export const OVERLAY_PROFILE_TEXT_STYLE_OVERRIDES: Record<string, OverlayProfileTextStyleOverrides> = {
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

export const OVERLAY_TEXT_STYLE_DISPLAY_LABELS: Record<string, string> = {
  title: "A Head",
  b_head: "B Head",
  paragraph: "P"
};

export const DEFAULT_OVERLAY_LOGO: LogoPlacementSpec = {
  id: "brand-mark",
  xPx: 41,
  yPx: 0,
  widthPx: 42,
  heightPx: 72,
  assetPath: "/assets/UbuntuTagLogo.svg",
  linkTitleSizeToHeight: true
};

export const DEFAULT_OVERLAY_FORMAT_OVERRIDES: Record<string, ContentFormatOverrides> = {
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

export const DEFAULT_OVERLAY_CSV_DRAFT = [
  "main_heading,text_1,text_2,text_3",
  '"Ubuntu\\nSummit\\n26.04","A showcase\\nfor the innovative\\nand the ambitious","May 27-28, 2026","Online"',
  '"Ubuntu\\nSummit\\n26.04","Kernel rebuild, now with actual reference defaults.","Parity audit","In progress"'
].join("\n");

export const SPEAKER_OVERLAY_CSV_DRAFT = [
  "session_title,speaker_name,speaker_role,speaker_photo",
  '"Developer ready Ubuntu on Qualcomm IoT","Ameya Pandit","Software Engineering Lead, Qualcomm","./assets/speaker_photos/ameya_pandit.jpg"'
].join("\n");

export const OVERLAY_LAYOUT_PARAMETER_SCHEMA: OperatorParameterSchema = {
  sections: [
    {
      key: "frame",
      title: "Frame",
      description: "Document-sized frame controls for overlay parity preview."
    },
    {
      key: "safeArea",
      title: "Safe Area"
    },
    {
      key: "grid",
      title: "Grid"
    },
    {
      key: "content",
      title: "Content",
      description: "Operator-side content source controls. The CSV staging surface remains preview-specific for now."
    }
  ],
  fields: [
    { kind: "number", sectionKey: "frame", path: "frame.widthPx", label: "Width", min: 320, step: 1 },
    { kind: "number", sectionKey: "frame", path: "frame.heightPx", label: "Height", min: 320, step: 1 },
    { kind: "number", sectionKey: "safeArea", path: "safeArea.top", label: "Top", min: 0, step: 1 },
    { kind: "number", sectionKey: "safeArea", path: "safeArea.right", label: "Right", min: 0, step: 1 },
    { kind: "number", sectionKey: "safeArea", path: "safeArea.bottom", label: "Bottom", min: 0, step: 1 },
    { kind: "number", sectionKey: "safeArea", path: "safeArea.left", label: "Left", min: 0, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.baselineStepPx", label: "Baseline step", min: 1, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.rowCount", label: "Rows", min: 1, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.columnCount", label: "Columns", min: 1, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.marginTopBaselines", label: "Top margin", min: 0, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.marginBottomBaselines", label: "Bottom margin", min: 0, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.marginLeftBaselines", label: "Left margin", min: 0, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.marginRightBaselines", label: "Right margin", min: 0, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.rowGutterBaselines", label: "Row gutter", min: 0, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.columnGutterBaselines", label: "Column gutter", min: 0, step: 1 },
    { kind: "boolean", sectionKey: "grid", path: "grid.fitWithinSafeArea", label: "Fit within safe area" },
    {
      kind: "select",
      sectionKey: "content",
      path: "contentSource",
      label: "Source",
      options: [
        { label: "Inline", value: "inline" },
        { label: "CSV draft", value: "csv" }
      ]
    },
    { kind: "number", sectionKey: "content", path: "csvContent.rowIndex", label: "CSV row", min: 1, step: 1, hint: "Used only when CSV content source is active." }
  ]
};

export function getDefaultOverlayGridForProfile(profileKey: string): GridSettings {
  return {
    ...(OVERLAY_PROFILE_GRID_DEFAULTS[profileKey] ?? OVERLAY_PROFILE_GRID_DEFAULTS.landscape_1280x720)
  };
}

export function applyOverlayProfileTextStyleDefaults(
  baseTextStyles: TextStyleSpec[],
  profileKey: string
): TextStyleSpec[] {
  const overrides = OVERLAY_PROFILE_TEXT_STYLE_OVERRIDES[profileKey] ?? OVERLAY_PROFILE_TEXT_STYLE_OVERRIDES.landscape_1280x720;
  return baseTextStyles.map((style) => {
    const override = overrides[style.key as keyof OverlayProfileTextStyleOverrides];
    return override
      ? { ...style, fontSizePx: override.fontSizePx, lineHeightPx: override.lineHeightPx }
      : { ...style };
  });
}

export function getOverlayStyleDisplayLabel(styleKey: string): string {
  return OVERLAY_TEXT_STYLE_DISPLAY_LABELS[styleKey] ?? styleKey;
}

export function resolveOverlayContentFormatKeyForProfile(
  profileKey: string,
  contentFormatKeyByProfile: Record<string, string>,
  profileFormatBuckets: Record<string, Record<string, unknown>>,
  fallbackFormatKey: string = OVERLAY_CONTENT_FORMAT_ORDER[0]
): string {
  const profileBucket = profileFormatBuckets[profileKey] ?? {};
  const profileBucketKeys = Object.keys(profileBucket);
  const candidates = [
    contentFormatKeyByProfile[profileKey],
    fallbackFormatKey,
    ...profileBucketKeys,
    OVERLAY_CONTENT_FORMAT_ORDER[0]
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0 && OVERLAY_CONTENT_FORMATS[candidate]) {
      return candidate;
    }
  }

  return OVERLAY_CONTENT_FORMAT_ORDER[0];
}

export function buildOverlayVariableItemLabel(styleKey: string, ordinal: number, total: number): string {
  const styleLabel = getOverlayStyleDisplayLabel(styleKey);
  return total > 1 ? `${styleLabel} ${ordinal}` : styleLabel;
}

export function getOverlayFieldDisplayLabel(
  params: Pick<OverlayLayoutOperatorParams, "textFields">,
  fieldId: string
): string {
  const field = params.textFields.find((candidate) => candidate.id === fieldId);
  if (!field) {
    return fieldId;
  }

  const sameStyleFields = params.textFields.filter((candidate) => candidate.styleKey === field.styleKey);
  const ordinal = sameStyleFields.findIndex((candidate) => candidate.id === field.id) + 1;
  return buildOverlayVariableItemLabel(field.styleKey, Math.max(1, ordinal), sameStyleFields.length);
}

export function getOverlayMainHeadingField(
  params: Pick<OverlayLayoutOperatorParams, "textFields">
): TextFieldPlacementSpec | undefined {
  return params.textFields.find((field) => field.id === "main_heading");
}

export function replaceOverlayTextField(
  textFields: TextFieldPlacementSpec[],
  nextField: TextFieldPlacementSpec
): TextFieldPlacementSpec[] {
  const index = textFields.findIndex((field) => field.id === nextField.id);
  if (index === -1) {
    return [{ ...nextField }, ...textFields];
  }

  return textFields.map((field, fieldIndex) => (
    fieldIndex === index ? { ...nextField } : field
  ));
}

export function syncOverlayParamsFrameToProfile(
  params: OverlayLayoutOperatorParams,
  profileKey: string
): OverlayLayoutOperatorParams {
  const profile = getOutputProfile(profileKey);
  const cloned = JSON.parse(JSON.stringify(params)) as OverlayLayoutOperatorParams;
  cloned.frame = { widthPx: profile.widthPx, heightPx: profile.heightPx };
  return cloned;
}

export function syncOverlaySharedProfileParams(
  source: OverlayLayoutOperatorParams,
  target: OverlayLayoutOperatorParams,
  profileKey: string
): OverlayLayoutOperatorParams {
  const profile = getOutputProfile(profileKey);
  const synced = JSON.parse(JSON.stringify(target)) as OverlayLayoutOperatorParams;
  const sourceHeading = getOverlayMainHeadingField(source);

  synced.frame = {
    widthPx: profile.widthPx,
    heightPx: profile.heightPx
  };
  synced.safeArea = { ...source.safeArea };
  synced.grid = { ...source.grid };
  synced.textStyles = source.textStyles.map((style) => ({ ...style }));
  if (source.logo) {
    synced.logo = { ...source.logo };
  } else {
    delete synced.logo;
  }

  if (sourceHeading) {
    synced.textFields = replaceOverlayTextField(synced.textFields, sourceHeading);
  }

  const nextInlineTextByFieldId = { ...(synced.inlineTextByFieldId ?? {}) };
  if (sourceHeading) {
    const headingKeys = new Set<string>([sourceHeading.id]);
    if (sourceHeading.contentFieldId) {
      headingKeys.add(sourceHeading.contentFieldId);
    }

    for (const key of headingKeys) {
      const mappedValue = source.inlineTextByFieldId?.[key];
      if (typeof mappedValue === "string") {
        nextInlineTextByFieldId[key] = mappedValue;
      }
    }

    if (sourceHeading.text.trim().length > 0) {
      nextInlineTextByFieldId[sourceHeading.id] = sourceHeading.text;
      if (sourceHeading.contentFieldId) {
        nextInlineTextByFieldId[sourceHeading.contentFieldId] = sourceHeading.text;
      }
    }
  }

  synced.inlineTextByFieldId = nextInlineTextByFieldId;
  return synced;
}

export function cloneProfileFormatBuckets(buckets: ProfileFormatBuckets): ProfileFormatBuckets {
  return cloneOverlayJson(buckets);
}

export function cloneProfileContentFormatMap(contentFormatKeyByProfile: ProfileContentFormatMap): ProfileContentFormatMap {
  return cloneOverlayJson(contentFormatKeyByProfile);
}

export function cloneOverlaySourceDefaultSnapshot<
  TExportSettings extends object,
  THaloConfig extends object,
  TGuideMode extends string = string
>(
  snapshot: OverlaySourceDefaultSnapshot<TExportSettings, THaloConfig, TGuideMode>
): OverlaySourceDefaultSnapshot<TExportSettings, THaloConfig, TGuideMode> {
  return cloneOverlayJson(snapshot);
}

export function cloneOverlayDocumentFile<
  TExportSettings extends object,
  THaloConfig extends object,
  TGuideMode extends string = string
>(
  documentFile: OverlayDocumentFile<TExportSettings, THaloConfig, TGuideMode>
): OverlayDocumentFile<TExportSettings, THaloConfig, TGuideMode> {
  return cloneOverlayJson(documentFile);
}

export function createBuiltInOverlaySourceDefaultSnapshot<
  TExportSettings extends object,
  THaloConfig extends object,
  TGuideMode extends string = string
>(
  options: CreateOverlaySourceDefaultSnapshotOptions<TExportSettings, THaloConfig, TGuideMode>
): OverlaySourceDefaultSnapshot<TExportSettings, THaloConfig, TGuideMode> {
  const exportSettings = options.createExportSettings(options.outputProfileKey);
  const haloConfig = options.createHaloConfig(options.outputProfileKey);

  return {
    outputProfileKey: options.outputProfileKey,
    contentFormatKey: options.contentFormatKey,
    profileFormatBuckets: {
      [options.outputProfileKey]: {
        [options.contentFormatKey]: createDefaultOverlayParams(options.outputProfileKey, options.contentFormatKey)
      }
    },
    contentFormatKeyByProfile: {
      [options.outputProfileKey]: options.contentFormatKey
    },
    exportSettings,
    exportSettingsByProfile: {
      [options.outputProfileKey]: cloneOverlayJson(exportSettings)
    },
    haloConfig,
    haloConfigByProfile: {
      [options.outputProfileKey]: cloneOverlayJson(haloConfig)
    },
    guideMode: options.guideMode
  };
}

export function createOverlayDocumentFile<
  TExportSettings extends object,
  THaloConfig extends object,
  TGuideMode extends string = string
>(
  options: CreateOverlayDocumentFileOptions<TExportSettings, THaloConfig, TGuideMode>
): OverlayDocumentFile<TExportSettings, THaloConfig, TGuideMode> {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const updatedAt = options.updatedAt ?? createdAt;

  return {
    kind: OVERLAY_DOCUMENT_FILE_KIND,
    version: OVERLAY_DOCUMENT_FILE_VERSION,
    metadata: {
      name: options.name,
      createdAt,
      updatedAt
    },
    project: normalizeOverlayDocumentProject(options.project, options.state),
    state: cloneOverlaySourceDefaultSnapshot(options.state)
  };
}

export function sanitizeOverlaySourceDefaultSnapshot<
  TExportSettings extends object,
  THaloConfig extends object,
  TGuideMode extends string = string
>(
  rawSnapshot: unknown,
  options: SanitizeOverlaySourceDefaultSnapshotOptions<TExportSettings, THaloConfig, TGuideMode>
): OverlaySourceDefaultSnapshot<TExportSettings, THaloConfig, TGuideMode> | null {
  if (!isRecord(rawSnapshot)) {
    return null;
  }

  const outputProfileKey = typeof rawSnapshot.outputProfileKey === "string"
    ? rawSnapshot.outputProfileKey
    : options.fallbackSnapshot.outputProfileKey;
  const normalizedProfileState = normalizeOverlayProfileBucketState({
    outputProfileKey,
    contentFormatKey: typeof rawSnapshot.contentFormatKey === "string"
      ? rawSnapshot.contentFormatKey
      : options.fallbackSnapshot.contentFormatKey,
    profileFormatBuckets: isRecord(rawSnapshot.profileFormatBuckets)
      ? cloneProfileFormatBuckets(rawSnapshot.profileFormatBuckets as ProfileFormatBuckets)
      : cloneProfileFormatBuckets(options.fallbackSnapshot.profileFormatBuckets),
    contentFormatKeyByProfile: isRecord(rawSnapshot.contentFormatKeyByProfile)
      ? Object.fromEntries(
        Object.entries(rawSnapshot.contentFormatKeyByProfile)
          .filter(([, rawFormatKey]) => typeof rawFormatKey === "string")
      ) as ProfileContentFormatMap
      : cloneProfileContentFormatMap(options.fallbackSnapshot.contentFormatKeyByProfile)
  });

  const exportSettingsByProfile: Record<string, TExportSettings> = {};
  if (isRecord(rawSnapshot.exportSettingsByProfile)) {
    for (const [profileKey, rawExportSettings] of Object.entries(rawSnapshot.exportSettingsByProfile)) {
      exportSettingsByProfile[profileKey] = isRecord(rawExportSettings)
        ? {
          ...options.createExportSettings(profileKey),
          ...rawExportSettings
        } as TExportSettings
        : options.createExportSettings(profileKey);
    }
  }

  const exportSettings = isRecord(rawSnapshot.exportSettings)
    ? {
      ...options.createExportSettings(normalizedProfileState.outputProfileKey),
      ...rawSnapshot.exportSettings
    } as TExportSettings
    : exportSettingsByProfile[normalizedProfileState.outputProfileKey]
      ?? options.createExportSettings(normalizedProfileState.outputProfileKey);

  exportSettingsByProfile[normalizedProfileState.outputProfileKey] ??= cloneOverlayJson(exportSettings);

  const haloConfigByProfile: Record<string, THaloConfig> = {};
  if (isRecord(rawSnapshot.haloConfigByProfile)) {
    for (const [profileKey, rawHaloConfig] of Object.entries(rawSnapshot.haloConfigByProfile)) {
      haloConfigByProfile[profileKey] = options.createHaloConfig(profileKey, rawHaloConfig);
    }
  }

  const haloConfig = haloConfigByProfile[normalizedProfileState.outputProfileKey]
    ?? options.createHaloConfig(normalizedProfileState.outputProfileKey, rawSnapshot.haloConfig);

  haloConfigByProfile[normalizedProfileState.outputProfileKey] ??= cloneOverlayJson(haloConfig);

  return {
    outputProfileKey: normalizedProfileState.outputProfileKey,
    contentFormatKey: normalizedProfileState.contentFormatKey,
    profileFormatBuckets: normalizedProfileState.profileFormatBuckets,
    contentFormatKeyByProfile: normalizedProfileState.contentFormatKeyByProfile,
    exportSettings,
    exportSettingsByProfile,
    haloConfig,
    haloConfigByProfile,
    guideMode: options.normalizeGuideMode(rawSnapshot.guideMode)
  };
}

export function sanitizeOverlayDocumentFile<
  TExportSettings extends object,
  THaloConfig extends object,
  TGuideMode extends string = string
>(
  rawDocumentFile: unknown,
  options: SanitizeOverlayDocumentFileOptions<TExportSettings, THaloConfig, TGuideMode>
): OverlayDocumentFile<TExportSettings, THaloConfig, TGuideMode> | null {
  if (!isRecord(rawDocumentFile)) {
    return null;
  }

  const now = options.now ?? new Date().toISOString();
  const fallbackName = options.fallbackName ?? "Untitled";

  let rawState: unknown = rawDocumentFile;
  let rawMetadata: unknown = undefined;
  let rawProject: unknown = undefined;

  if ("state" in rawDocumentFile || "kind" in rawDocumentFile || "version" in rawDocumentFile) {
    if (rawDocumentFile.kind !== OVERLAY_DOCUMENT_FILE_KIND) {
      return null;
    }

    if (rawDocumentFile.version !== OVERLAY_DOCUMENT_FILE_VERSION) {
      return null;
    }

    rawState = rawDocumentFile.state;
    rawMetadata = rawDocumentFile.metadata;
    rawProject = rawDocumentFile.project;
  }

  const state = sanitizeOverlaySourceDefaultSnapshot(rawState, options);
  if (!state) {
    return null;
  }

  const metadataRecord = isRecord(rawMetadata) ? rawMetadata : {};
  const createdAt = normalizeOverlayDocumentTimestamp(metadataRecord.createdAt, now);
  const updatedAt = normalizeOverlayDocumentTimestamp(metadataRecord.updatedAt, createdAt);

  return {
    kind: OVERLAY_DOCUMENT_FILE_KIND,
    version: OVERLAY_DOCUMENT_FILE_VERSION,
    metadata: {
      name: normalizeOverlayDocumentName(metadataRecord.name, fallbackName),
      createdAt,
      updatedAt
    },
    project: normalizeOverlayDocumentProject(rawProject, state),
    state
  };
}

function createLandscapeOverlayTextFields(): TextFieldPlacementSpec[] {
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

export function buildTextFieldsForFormat(
  formatKey: string,
  overrides: Record<string, ContentFormatOverrides> = DEFAULT_OVERLAY_FORMAT_OVERRIDES,
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

export function findCsvHeaderForField(
  headers: string[],
  fieldId: string,
  formatKey: string
): string | undefined {
  const formatSpec = OVERLAY_CONTENT_FORMATS[formatKey] ?? OVERLAY_CONTENT_FORMATS[OVERLAY_CONTENT_FORMAT_ORDER[0]];
  const fieldSpec = formatSpec.fields.find((field) => field.id === fieldId);
  const aliases = fieldSpec ? [fieldSpec.id, ...(fieldSpec.aliases ?? [])] : [fieldId];

  for (const alias of aliases) {
    const found = headers.find((header) => header === alias);
    if (found) {
      return found;
    }
  }

  const legacySlot = fieldSpec?.legacySlot;
  if (legacySlot) {
    const found = headers.find((header) => header === legacySlot);
    if (found) {
      return found;
    }
  }

  return undefined;
}

export function createDefaultOverlayParams(
  profileKey: string = DEFAULT_OUTPUT_PROFILE_KEY,
  formatKey: string = "generic_social"
): OverlayLayoutOperatorParams {
  const profile = getOutputProfile(profileKey);
  const textFields = buildTextFieldsForFormat(formatKey);
  const landscapeTextByContentField = new Map(
    createLandscapeOverlayTextFields().map((field) => [field.contentFieldId ?? field.id, field.text])
  );
  const formatSpec = OVERLAY_CONTENT_FORMATS[formatKey] ?? OVERLAY_CONTENT_FORMATS[OVERLAY_CONTENT_FORMAT_ORDER[0]];
  const inlineTextByFieldId: Record<string, string> = {};

  inlineTextByFieldId.main_heading = landscapeTextByContentField.get("main_heading") ?? "";
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
    textStyles: applyOverlayProfileTextStyleDefaults(DEFAULT_OVERLAY_TEXT_STYLES, profileKey),
    textFields: textFields.map((field) => ({ ...field })),
    logo: { ...DEFAULT_OVERLAY_LOGO },
    contentSource: "inline",
    inlineTextByFieldId,
    csvContent: {
      draft: formatKey === "speaker_highlight" ? SPEAKER_OVERLAY_CSV_DRAFT : DEFAULT_OVERLAY_CSV_DRAFT,
      rowIndex: 1
    }
  };
}

export function normalizeOverlayProfileBucketState(
  state: OverlayProfileBucketState
): OverlayProfileBucketState {
  const profileFormatBuckets = cloneProfileFormatBuckets(state.profileFormatBuckets);
  const contentFormatKeyByProfile = cloneProfileContentFormatMap(state.contentFormatKeyByProfile);

  for (const profileKey of Object.keys(profileFormatBuckets)) {
    contentFormatKeyByProfile[profileKey] = resolveOverlayContentFormatKeyForProfile(
      profileKey,
      contentFormatKeyByProfile,
      profileFormatBuckets,
      state.contentFormatKey
    );
  }

  const activeContentFormatKey = resolveOverlayContentFormatKeyForProfile(
    state.outputProfileKey,
    contentFormatKeyByProfile,
    profileFormatBuckets,
    state.contentFormatKey
  );
  contentFormatKeyByProfile[state.outputProfileKey] = activeContentFormatKey;

  const activeProfileBucket = profileFormatBuckets[state.outputProfileKey] ??= {};
  activeProfileBucket[activeContentFormatKey] ??= createDefaultOverlayParams(
    state.outputProfileKey,
    activeContentFormatKey
  );

  return {
    outputProfileKey: state.outputProfileKey,
    contentFormatKey: activeContentFormatKey,
    profileFormatBuckets,
    contentFormatKeyByProfile
  };
}

function normalizeContentSource(contentSource?: OverlayContentSource): OverlayContentSource {
  return contentSource === "csv" ? "csv" : "inline";
}

export function getOverlayFieldContentKey(field: TextFieldPlacementSpec): string {
  const contentFieldId = field.contentFieldId?.trim();
  return contentFieldId && contentFieldId.length > 0 ? contentFieldId : field.id;
}

export function parseCsvDraft(draft: string): OverlayCsvDraftTable {
  const safeDraft = String(draft || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!safeDraft.trim()) {
    return { headers: [], rows: [], hasUnterminatedQuote: false };
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < safeDraft.length; index += 1) {
    const character = safeDraft[index];
    const nextCharacter = safeDraft[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (character === "\n" && !inQuotes) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  row.push(cell);
  rows.push(row);

  while (rows.length > 0 && rows[rows.length - 1].every((value) => value === "")) {
    rows.pop();
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], hasUnterminatedQuote: inQuotes };
  }

  const [headers, ...dataRows] = rows;
  return {
    headers: headers.map((header) => String(header || "").trim()),
    rows: dataRows,
    hasUnterminatedQuote: inQuotes
  };
}

function serializeCsvCell(value: string): string {
  const safeValue = String(value || "");
  if (!/[",\n]/.test(safeValue)) {
    return safeValue;
  }

  return `"${safeValue.replace(/"/g, '""')}"`;
}

function serializeCsvDraft(table: OverlayCsvDraftTable): string {
  const rows = [table.headers, ...table.rows];
  return rows
    .map((row) => row.map((value) => serializeCsvCell(value)).join(","))
    .join("\n");
}

function ensureCsvColumn(table: OverlayCsvDraftTable, header: string): number {
  let headerIndex = table.headers.indexOf(header);
  if (headerIndex !== -1) {
    return headerIndex;
  }

  table.headers.push(header);
  for (const row of table.rows) {
    row.push("");
  }

  headerIndex = table.headers.length - 1;
  return headerIndex;
}

function ensureCsvRow(table: OverlayCsvDraftTable, rowIndex: number): string[] {
  while (table.rows.length <= rowIndex) {
    table.rows.push(Array.from({ length: table.headers.length }, () => ""));
  }

  const row = table.rows[rowIndex];
  while (row.length < table.headers.length) {
    row.push("");
  }
  return row;
}

function getInlineTextValue(params: OverlayLayoutOperatorParams, field: TextFieldPlacementSpec): string {
  const contentKey = getOverlayFieldContentKey(field);
  const directValue = params.inlineTextByFieldId?.[field.id];
  if (typeof directValue === "string") {
    return directValue;
  }

  const mappedValue = params.inlineTextByFieldId?.[contentKey];
  if (typeof mappedValue === "string") {
    return mappedValue;
  }

  return field.text;
}

function normalizeCsvLookupValue(value: string): string {
  return String(value || "").trim().toLowerCase();
}

function getOverlayFieldHeaderAliases(field: TextFieldPlacementSpec): string[] {
  const contentKey = getOverlayFieldContentKey(field);
  const aliases = new Set<string>([contentKey]);

  for (const formatSpec of Object.values(OVERLAY_CONTENT_FORMATS)) {
    const fieldSpec = formatSpec.fields.find((candidate) => {
      if (candidate.id === contentKey || candidate.legacySlot === contentKey) {
        return true;
      }

      return candidate.aliases.some((alias) => alias === contentKey);
    });

    if (!fieldSpec) {
      continue;
    }

    aliases.add(fieldSpec.id);
    if (fieldSpec.legacySlot) {
      aliases.add(fieldSpec.legacySlot);
    }
    for (const alias of fieldSpec.aliases) {
      aliases.add(alias);
    }
  }

  return Array.from(aliases).filter(Boolean);
}

function findCsvHeaderIndex(headers: string[], field: TextFieldPlacementSpec): number {
  const normalizedHeaderIndex = new Map<string, number>();

  headers.forEach((header, index) => {
    const normalizedHeader = normalizeCsvLookupValue(header);
    if (!normalizedHeaderIndex.has(normalizedHeader)) {
      normalizedHeaderIndex.set(normalizedHeader, index);
    }
  });

  for (const alias of getOverlayFieldHeaderAliases(field)) {
    const headerIndex = normalizedHeaderIndex.get(normalizeCsvLookupValue(alias));
    if (headerIndex !== undefined) {
      return headerIndex;
    }
  }

  return -1;
}

function getCsvTextValue(params: OverlayLayoutOperatorParams, field: TextFieldPlacementSpec): string {
  const table = parseCsvDraft(params.csvContent?.draft ?? "");
  const rowIndex = Math.max(1, Math.round(params.csvContent?.rowIndex ?? 1)) - 1;
  const headerIndex = findCsvHeaderIndex(table.headers, field);

  if (headerIndex === -1 || rowIndex < 0 || rowIndex >= table.rows.length) {
    return getInlineTextValue(params, field);
  }

  const row = table.rows[rowIndex];
  return row?.[headerIndex] ?? "";
}

export function resolveOverlayTextValue(params: OverlayLayoutOperatorParams, field: TextFieldPlacementSpec): string {
  return normalizeContentSource(params.contentSource) === "csv"
    ? getCsvTextValue(params, field)
    : getInlineTextValue(params, field);
}

export function resolveOverlayTextFields(params: OverlayLayoutOperatorParams): TextFieldPlacementSpec[] {
  return params.textFields.map((field) => ({
    ...field,
    text: resolveOverlayTextValue(params, field)
  }));
}

export function inspectOverlayCsvDraft(params: OverlayLayoutOperatorParams): OverlayCsvDraftSummary {
  const table = parseCsvDraft(params.csvContent?.draft ?? "");
  const selectedRowIndex = Math.max(1, Math.round(params.csvContent?.rowIndex ?? 1));
  const selectedRow = table.rows[selectedRowIndex - 1];
  const selectedRowValues: Record<string, string> = {};

  table.headers.forEach((header, index) => {
    if (!header) {
      return;
    }

    selectedRowValues[header] = selectedRow?.[index] ?? "";
  });

  const fieldKeys = Array.from(new Set(params.textFields.map((field) => getOverlayFieldContentKey(field))));

  return {
    headers: [...table.headers],
    rowCount: table.rows.length,
    selectedRowIndex,
    selectedRowExists: selectedRowIndex >= 1 && selectedRowIndex <= table.rows.length,
    selectedRowValues,
    missingFieldKeys: params.textFields
      .filter((field, index, fields) => fields.findIndex((candidate) => getOverlayFieldContentKey(candidate) === getOverlayFieldContentKey(field)) === index)
      .map((field) => getOverlayFieldContentKey(field))
      .filter((fieldKey) => {
        const matchingField = params.textFields.find((field) => getOverlayFieldContentKey(field) === fieldKey);
        return matchingField ? findCsvHeaderIndex(table.headers, matchingField) === -1 : !fieldKeys.includes(fieldKey);
      }),
    hasUnterminatedQuote: table.hasUnterminatedQuote
  };
}

export function setOverlayTextValue(
  params: OverlayLayoutOperatorParams,
  textFieldId: string,
  value: string
): OverlayLayoutOperatorParams {
  const field = params.textFields.find((candidate) => candidate.id === textFieldId);
  if (!field) {
    return params;
  }

  if (normalizeContentSource(params.contentSource) === "csv") {
    const table = parseCsvDraft(params.csvContent?.draft ?? "");
    const rowIndex = Math.max(1, Math.round(params.csvContent?.rowIndex ?? 1)) - 1;
    const matchedHeaderIndex = findCsvHeaderIndex(table.headers, field);
    const headerIndex = matchedHeaderIndex !== -1
      ? matchedHeaderIndex
      : ensureCsvColumn(table, getOverlayFieldContentKey(field));
    const row = ensureCsvRow(table, rowIndex);
    row[headerIndex] = value;

    return {
      ...params,
      csvContent: {
        draft: serializeCsvDraft(table),
        rowIndex: rowIndex + 1
      }
    };
  }

  const contentKey = getOverlayFieldContentKey(field);
  return {
    ...params,
    inlineTextByFieldId: {
      ...params.inlineTextByFieldId,
      [field.id]: value,
      [contentKey]: value
    }
  };
}

export function normalizeOverlayLinkedTitleLogoParams(
  params: OverlayLayoutOperatorParams
): OverlayLayoutOperatorParams {
  const titleStyle = params.textStyles.find((style) => style.key === "title");
  const logo = params.logo;
  if (!titleStyle || !logo || logo.linkTitleSizeToHeight === false || logo.widthPx <= 0 || logo.heightPx <= 0) {
    return params;
  }

  const aspectRatio = logo.widthPx / Math.max(1, logo.heightPx);
  const linkedDimensions = getLinkedLogoDimensionsPx(titleStyle.fontSizePx, aspectRatio);

  if (linkedDimensions.widthPx === logo.widthPx && linkedDimensions.heightPx === logo.heightPx) {
    return params;
  }

  return {
    ...params,
    logo: {
      ...logo,
      widthPx: linkedDimensions.widthPx,
      heightPx: linkedDimensions.heightPx
    }
  };
}

export function normalizeOverlayTextFieldOffsetBaselines(
  params: OverlayLayoutOperatorParams,
  field: TextFieldPlacementSpec,
  measurer: TextMeasurer
): TextFieldPlacementSpec {
  const style = params.textStyles.find((candidate) => candidate.key === field.styleKey);
  if (!style) {
    return field;
  }

  const minimumOffsetBaselines = getMinimumFirstBaselineInsetBaselines(
    params.grid.baselineStepPx,
    style,
    measurer
  );
  const nextOffsetBaselines = Math.max(Math.round(field.offsetBaselines), minimumOffsetBaselines);
  return nextOffsetBaselines === field.offsetBaselines
    ? field
    : { ...field, offsetBaselines: nextOffsetBaselines };
}

export function normalizeOverlayParamsForEditing(
  params: OverlayLayoutOperatorParams,
  measurer: TextMeasurer
): OverlayLayoutOperatorParams {
  const linkedParams = normalizeOverlayLinkedTitleLogoParams(params);
  let didChange = false;
  const textFields = linkedParams.textFields.map((field) => {
    const normalizedField = normalizeOverlayTextFieldOffsetBaselines(linkedParams, field, measurer);
    if (normalizedField !== field) {
      didChange = true;
    }
    return normalizedField;
  });

  if (didChange) {
    return { ...linkedParams, textFields };
  }

  return linkedParams;
}

export function resolveOverlayLayoutScene(
  params: OverlayLayoutOperatorParams,
  textMeasureOptions?: ApproximateTextMeasureOptions
): LayerScene {
  return resolveLayerScene({
    frame: params.frame,
    safeArea: params.safeArea,
    grid: params.grid,
    textFields: resolveOverlayTextFields(params),
    textStyles: params.textStyles,
    ...(params.logo ? { logo: params.logo } : {})
  }, createApproximateTextMeasurer(textMeasureOptions));
}

export function createOverlayLayoutOperator(
  options: CreateOverlayLayoutOperatorOptions = {}
): OperatorDefinition<OverlayLayoutOperatorParams> {
  return {
    key: options.operatorKey ?? OVERLAY_LAYOUT_OPERATOR_KEY,
    version: "0.1.0",
    inputs: [],
    parameterSchema: OVERLAY_LAYOUT_PARAMETER_SCHEMA,
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