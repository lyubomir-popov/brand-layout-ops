/**
 * main.ts — Overlay-preview application entry point.
 *
 * Architecture:
 * 1. Three.js WebGL canvas renders the halo field animation (bottom layer)
 * 2. 2D canvas renders release labels (middle layer)
 * 3. SVG overlay renders text, logo, and composition guides (top layer)
 * 4. DOM authoring layer provides inline text editing
 * 5. Portable Vertical Rhythm themed aside panel provides all controls
 */
import "portable-vertical-rhythm/styles.css";
import "./styles.scss";

import { initRangeControls } from "portable-vertical-rhythm";

import type {
  LayerScene,
  LayoutGridMetrics,
  LogoPlacementSpec,
  OperatorGraph,
  ResolvedTextPlacement,
  TextFieldPlacementSpec,
  TextStyleSpec
} from "@brand-layout-ops/core-types";
import {
  DEFAULT_OUTPUT_PROFILE_KEY,
  getOutputProfile,
  getOutputProfileMetrics,
  OUTPUT_PROFILE_ORDER,
  OUTPUT_PROFILES,
  OVERLAY_CONTENT_FORMAT_ORDER,
  OVERLAY_CONTENT_FORMATS
} from "@brand-layout-ops/core-types";
import { OperatorRegistry, evaluateGraph } from "@brand-layout-ops/graph-runtime";
import { getColumnSpanWidthPx, getKeylineXPx, snapBaselineToGrid } from "@brand-layout-ops/layout-grid";
import { getLinkedLogoDimensionsPx, getLinkedTitleFontSizePx } from "@brand-layout-ops/layout-engine";
import { createApproximateTextMeasurer } from "@brand-layout-ops/layout-text";
import type { DragAxisLock } from "@brand-layout-ops/overlay-interaction";
import { moveLogo, moveTextField } from "@brand-layout-ops/overlay-interaction";
import {
  buildUbuntuSummitAnimationSceneDescriptor,
  type UbuntuSummitAnimationTransitionState
} from "@brand-layout-ops/operator-ubuntu-summit-animation";
import {
  buildOverlayVariableItemLabel,
  cloneProfileContentFormatMap,
  cloneProfileFormatBuckets,
  createDefaultOverlayParams,
  createOverlayLayoutOperator,
  getOverlayFieldDisplayLabel,
  getOverlayMainHeadingField,
  getOverlayStyleDisplayLabel,
  inspectOverlayCsvDraft,
  normalizeOverlayProfileBucketState,
  normalizeOverlayParamsForEditing,
  normalizeOverlayTextFieldOffsetBaselines,
  OVERLAY_LAYOUT_OPERATOR_KEY,
  resolveOverlayContentFormatKeyForProfile,
  resolveOverlayTextValue,
  setOverlayTextValue,
  syncOverlayParamsFrameToProfile,
  syncOverlaySharedProfileParams,
  type OverlayContentSource,
  type OverlayLayoutOperatorParams,
  type ProfileContentFormatMap,
  type ProfileFormatBuckets
} from "@brand-layout-ops/operator-overlay-layout";
import {
  createDefaultHaloFieldConfig,
  createHaloFieldConfigForProfile,
  type HaloFieldConfig
} from "@brand-layout-ops/operator-halo-field";
import {
  createParameterSectionRegistry,
  type ParameterSectionDefinition
} from "@brand-layout-ops/parameter-ui";

import { createHaloRenderer, type HaloRenderer } from "./halo-renderer.js";
import {
  cloneOverlayParams,
  createDefaultExportSettings,
  createPresetId,
  denormalizePresetFromPersistence,
  getNextPresetName,
  loadActivePresetId,
  loadPresets,
  loadOutputFormatKeys,
  normalizePresetForPersistence,
  saveActivePresetId,
  savePresets,
  saveOutputFormatKey,
  type ExportSettings,
  type PersistedPreset,
  type Preset
} from "./sample-document.js";

// ─── Types ────────────────────────────────────────────────────────────

type Selection =
  | { kind: "text"; id: string }
  | { kind: "logo"; id: string };

type GuideMode = "off" | "composition" | "baseline";
const GUIDE_MODES: readonly GuideMode[] = ["off", "composition", "baseline"];

type DragMode = "move" | "resize";
type ResizeEdge = "e" | "w" | "nw" | "ne" | "sw" | "se";

interface DragState {
  selection: Selection;
  metrics: LayoutGridMetrics;
  startClientX: number;
  startClientY: number;
  hasMoved: boolean;
  mode: DragMode;
  resizeEdge?: ResizeEdge | undefined;
  initialField?: TextFieldPlacementSpec | undefined;
  initialLogo?: LogoPlacementSpec | undefined;
}

type ConfigSectionFactory = () => HTMLElement;

type ConfigSectionDefinition = ParameterSectionDefinition;

// ─── Operator registry ────────────────────────────────────────────────

const PREVIEW_NODE_ID = "overlay-preview";
const registry = new OperatorRegistry();
registry.register(createOverlayLayoutOperator());

// ─── State ────────────────────────────────────────────────────────────

interface PreviewState {
  params: OverlayLayoutOperatorParams;
  selected: Selection | null;
  guideMode: GuideMode;
  overlayVisible: boolean;
  pendingCsvDraftsByBucket: Record<string, string>;
  outputProfileKey: string;
  contentFormatKey: string;
  profileFormatBuckets: ProfileFormatBuckets;
  contentFormatKeyByProfile: ProfileContentFormatMap;
  presets: Preset[];
  activePresetId: string | null;
  exportSettings: ExportSettings;
  exportSettingsByProfile: Record<string, ExportSettings>;
  haloConfig: HaloFieldConfig;
  haloConfigByProfile: Record<string, HaloFieldConfig>;
  sourceDefaults: SourceDefaultSnapshot;
  isPlaying: boolean;
  playbackTimeSec: number;
}

interface SourceDefaultSnapshot {
  outputProfileKey: string;
  contentFormatKey: string;
  profileFormatBuckets: ProfileFormatBuckets;
  contentFormatKeyByProfile: ProfileContentFormatMap;
  exportSettings: ExportSettings;
  exportSettingsByProfile: Record<string, ExportSettings>;
  haloConfig: HaloFieldConfig;
  haloConfigByProfile: Record<string, HaloFieldConfig>;
  guideMode: GuideMode;
}

const INITIAL_PROFILE_KEY = "instagram_1080x1350";
const INITIAL_FORMAT_KEY = "generic_social";
const _persistedFormat = loadOutputFormatKeys();
const _startProfileKey = _persistedFormat?.profileKey ?? INITIAL_PROFILE_KEY;
const _startFormatKey = _persistedFormat?.formatKey ?? INITIAL_FORMAT_KEY;
const INITIAL_PARAMS = createDefaultOverlayParams(_startProfileKey, _startFormatKey);
const SOURCE_DEFAULT_AUTHORING_ENDPOINT = "/__authoring/source-default-config";
const SOURCE_DEFAULT_ASSET_PATH = "/assets/source-default-config.json";
const previewTextMeasurer = createApproximateTextMeasurer();

function cloneSourceDefaultSnapshot(snapshot: SourceDefaultSnapshot): SourceDefaultSnapshot {
  return JSON.parse(JSON.stringify(snapshot));
}

function cloneExportSettingsByProfile(
  exportSettingsByProfile: Record<string, ExportSettings>
): Record<string, ExportSettings> {
  return JSON.parse(JSON.stringify(exportSettingsByProfile));
}

function cloneHaloConfigByProfile(
  haloConfigByProfile: Record<string, HaloFieldConfig>
): Record<string, HaloFieldConfig> {
  return JSON.parse(JSON.stringify(haloConfigByProfile));
}

function createDebugHaloFieldConfig(baseConfig: HaloFieldConfig = createDefaultHaloFieldConfig()): HaloFieldConfig {
  return { ...baseConfig };
}

function mergeHaloConfigWithBaseConfig(baseConfig: HaloFieldConfig, rawHaloConfig: unknown): HaloFieldConfig {
  const defaults = createDebugHaloFieldConfig(baseConfig);
  if (!isRecord(rawHaloConfig)) {
    return defaults;
  }

  const composition = isRecord(rawHaloConfig.composition) ? rawHaloConfig.composition : {};
  const generatorWrangle = isRecord(rawHaloConfig.generator_wrangle) ? rawHaloConfig.generator_wrangle : {};
  const transitionWrangle = isRecord(rawHaloConfig.transition_wrangle) ? rawHaloConfig.transition_wrangle : {};
  const pointStyle = isRecord(rawHaloConfig.point_style) ? rawHaloConfig.point_style : {};
  const spokeLines = isRecord(rawHaloConfig.spoke_lines) ? rawHaloConfig.spoke_lines : {};
  const spokeText = isRecord(rawHaloConfig.spoke_text) ? rawHaloConfig.spoke_text : {};
  const screensaver = isRecord(rawHaloConfig.screensaver) ? rawHaloConfig.screensaver : {};
  const vignette = isRecord(rawHaloConfig.vignette) ? rawHaloConfig.vignette : {};

  return {
    ...defaults,
    ...rawHaloConfig,
    composition: {
      ...defaults.composition,
      ...composition
    },
    generator_wrangle: {
      ...defaults.generator_wrangle,
      ...generatorWrangle
    },
    transition_wrangle: {
      ...defaults.transition_wrangle,
      ...transitionWrangle
    },
    point_style: {
      ...defaults.point_style,
      ...pointStyle
    },
    spoke_lines: {
      ...defaults.spoke_lines,
      ...spokeLines
    },
    spoke_text: {
      ...defaults.spoke_text!,
      ...spokeText
    },
    screensaver: {
      ...defaults.screensaver!,
      ...screensaver
    },
    vignette: {
      ...defaults.vignette!,
      ...vignette
    }
  } as HaloFieldConfig;
}

function mergeHaloConfigWithDefaults(rawHaloConfig: unknown): HaloFieldConfig {
  return mergeHaloConfigWithBaseConfig(createDefaultHaloFieldConfig(), rawHaloConfig);
}

function getHaloConfigForProfile(profileKey: string, rawHaloConfig?: unknown): HaloFieldConfig {
  const config = mergeHaloConfigWithBaseConfig(createHaloFieldConfigForProfile(profileKey), rawHaloConfig);
  const metrics = getOutputProfileMetrics(profileKey);
  config.composition.center_x_px = metrics.centerXPx;
  config.composition.center_y_px = metrics.centerYPx + (config.composition.center_offset_y_px ?? 0);
  return config;
}

function createBuiltInSourceDefaultSnapshot(): SourceDefaultSnapshot {
  const exportSettings = createDefaultExportSettings(INITIAL_PROFILE_KEY);
  const haloConfig = getHaloConfigForProfile(INITIAL_PROFILE_KEY);
  return {
    outputProfileKey: INITIAL_PROFILE_KEY,
    contentFormatKey: INITIAL_FORMAT_KEY,
    profileFormatBuckets: {
      [INITIAL_PROFILE_KEY]: {
        [INITIAL_FORMAT_KEY]: cloneOverlayParams(INITIAL_PARAMS)
      }
    },
    contentFormatKeyByProfile: {
      [INITIAL_PROFILE_KEY]: INITIAL_FORMAT_KEY
    },
    exportSettings,
    exportSettingsByProfile: {
      [INITIAL_PROFILE_KEY]: exportSettings
    },
    haloConfig,
    haloConfigByProfile: {
      [INITIAL_PROFILE_KEY]: haloConfig
    },
    guideMode: "composition"
  };
}

const INITIAL_SOURCE_DEFAULTS = createBuiltInSourceDefaultSnapshot();

const state: PreviewState = {
  params: cloneOverlayParams(INITIAL_PARAMS),
  selected: null,
  guideMode: "composition",
  overlayVisible: false,
  pendingCsvDraftsByBucket: {},
  outputProfileKey: _startProfileKey,
  contentFormatKey: _startFormatKey,
  profileFormatBuckets: {
    [_startProfileKey]: {
      [_startFormatKey]: cloneOverlayParams(INITIAL_PARAMS)
    }
  },
  contentFormatKeyByProfile: {
    [_startProfileKey]: _startFormatKey
  },
  presets: loadPresets(),
  activePresetId: loadActivePresetId(),
  exportSettings: createDefaultExportSettings(_startProfileKey),
  exportSettingsByProfile: {
    [_startProfileKey]: createDefaultExportSettings(_startProfileKey)
  },
  haloConfig: getHaloConfigForProfile(_startProfileKey),
  haloConfigByProfile: {
    [_startProfileKey]: getHaloConfigForProfile(_startProfileKey)
  },
  sourceDefaults: cloneSourceDefaultSnapshot(INITIAL_SOURCE_DEFAULTS),
  isPlaying: true,
  playbackTimeSec: 0
};

let currentScene: LayerScene | null = null;
let currentDrag: DragState | null = null;
let hoverId: string | null = null;
let hoverHandle: ResizeEdge | null = null;
let editSession: { id: string; element: HTMLTextAreaElement } | null = null;
let renderToken = 0;
let haloRendererInstance: HaloRenderer | null = null;
let playbackFrameHandle: number | null = null;
let lastPlaybackFrameMs: number | null = null;
let ubuntuSummitTransitionState: UbuntuSummitAnimationTransitionState | null = null;
let logoIntrinsicWidth = 0;
let logoIntrinsicHeight = 0;

// Sync halo config to the initial profile
syncHaloConfigToProfile(state.outputProfileKey);

// ─── Logo intrinsic dimension loading ─────────────────────────────────

function loadLogoIntrinsicDimensions(assetPath: string): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!assetPath) {
      logoIntrinsicWidth = 0;
      logoIntrinsicHeight = 0;
      resolve();
      return;
    }
    const img = new Image();
    img.decoding = "async";
    img.addEventListener("load", () => {
      logoIntrinsicWidth = img.naturalWidth;
      logoIntrinsicHeight = img.naturalHeight;
      resolve();
    });
    img.addEventListener("error", () => {
      logoIntrinsicWidth = 0;
      logoIntrinsicHeight = 0;
      resolve();
    });
    img.src = assetPath;
  });
}

// Persistent authoring DOM elements (created once)
let authoringHoverBox: HTMLElement | null = null;
let authoringHoverLabel: HTMLElement | null = null;
let authoringSelectedBox: HTMLElement | null = null;
let authoringSelectedLabel: HTMLElement | null = null;
let authoringBaselineGuide: HTMLElement | null = null;
let authoringHandles: Map<ResizeEdge, HTMLElement> = new Map();

// ─── DOM references ───────────────────────────────────────────────────

const $ = <T extends Element>(sel: string): T | null => document.querySelector<T>(sel);

function getStageEl(): HTMLElement | null { return $("[data-stage]"); }
function getCanvasEl(): HTMLCanvasElement | null { return $("[data-stage-canvas]"); }
function getTextOverlayCanvas(): HTMLCanvasElement | null { return $("[data-text-overlay]"); }
function getSvgOverlay(): SVGSVGElement | null { return $("[data-svg-overlay]"); }
function getAuthoringLayerEl(): HTMLElement | null { return $("[data-authoring-layer]"); }
function getConfigEditor(): HTMLElement | null { return $("[data-config-editor]"); }
function getOutputProfileOptions(): HTMLElement | null { return $("[data-output-profile-options]"); }
function getPresetTabs(): HTMLElement | null { return $("[data-preset-tabs]"); }
function getOverlayVisibilityInput(): HTMLInputElement | null { return $("[data-overlay-visibility]"); }

// ─── Helper utilities ─────────────────────────────────────────────────

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCsvDraftBucketKey(
  profileKey: string = state.outputProfileKey,
  formatKey: string = state.contentFormatKey
): string {
  return `${profileKey}::${formatKey}`;
}

function getStagedCsvDraft(
  profileKey: string = state.outputProfileKey,
  formatKey: string = state.contentFormatKey
): string | null {
  const bucketKey = getCsvDraftBucketKey(profileKey, formatKey);
  return Object.prototype.hasOwnProperty.call(state.pendingCsvDraftsByBucket, bucketKey)
    ? state.pendingCsvDraftsByBucket[bucketKey]
    : null;
}

function setStagedCsvDraft(
  draft: string | null,
  profileKey: string = state.outputProfileKey,
  formatKey: string = state.contentFormatKey
): void {
  const bucketKey = getCsvDraftBucketKey(profileKey, formatKey);
  if (draft === null) {
    delete state.pendingCsvDraftsByBucket[bucketKey];
    return;
  }

  state.pendingCsvDraftsByBucket[bucketKey] = draft;
}

// ─── Operator graph evaluation ────────────────────────────────────────

function buildGraph(params: OverlayLayoutOperatorParams): OperatorGraph {
  return {
    nodes: [{ id: PREVIEW_NODE_ID, operatorKey: OVERLAY_LAYOUT_OPERATOR_KEY, params }],
    edges: []
  };
}

function getEffectiveParams(): OverlayLayoutOperatorParams {
  const stagedCsvDraft = getStagedCsvDraft();
  if (getContentSource() !== "csv" || stagedCsvDraft === null) {
    return normalizeParamsTextFieldOffsets(state.params);
  }

  return normalizeParamsTextFieldOffsets({
    ...state.params,
    csvContent: {
      draft: stagedCsvDraft,
      rowIndex: state.params.csvContent?.rowIndex ?? 1
    }
  });
}

// ─── Content source accessors ─────────────────────────────────────────

function getContentSource(): OverlayContentSource {
  return state.params.contentSource === "csv" ? "csv" : "inline";
}

function getResolvedTextFieldText(field: TextFieldPlacementSpec): string {
  return resolveOverlayTextValue(getEffectiveParams(), field);
}

function hasStagedCsvDraft(): boolean {
  const stagedCsvDraft = getStagedCsvDraft();
  return stagedCsvDraft !== null &&
    stagedCsvDraft !== (state.params.csvContent?.draft ?? "");
}

function getProfileFormatBucket(profileKey: string): Record<string, OverlayLayoutOperatorParams> {
  if (!state.profileFormatBuckets[profileKey]) {
    state.profileFormatBuckets[profileKey] = {};
  }

  return state.profileFormatBuckets[profileKey];
}

function getOrCreateExportSettingsForProfile(profileKey: string): ExportSettings {
  if (!state.exportSettingsByProfile[profileKey]) {
    state.exportSettingsByProfile[profileKey] = createDefaultExportSettings(profileKey);
  }

  return JSON.parse(JSON.stringify(state.exportSettingsByProfile[profileKey])) as ExportSettings;
}

function getOrCreateHaloConfigForProfile(profileKey: string): HaloFieldConfig {
  if (!state.haloConfigByProfile[profileKey]) {
    state.haloConfigByProfile[profileKey] = getHaloConfigForProfile(profileKey);
  }

  return JSON.parse(JSON.stringify(state.haloConfigByProfile[profileKey])) as HaloFieldConfig;
}

function persistActiveExportSettings(): void {
  state.exportSettingsByProfile[state.outputProfileKey] = JSON.parse(JSON.stringify(state.exportSettings)) as ExportSettings;
}

function persistActiveHaloConfig(): void {
  state.haloConfigByProfile[state.outputProfileKey] = JSON.parse(JSON.stringify(state.haloConfig)) as HaloFieldConfig;
}

function updateExportSettings(updater: (settings: ExportSettings) => ExportSettings): void {
  state.exportSettings = updater(state.exportSettings);
  persistActiveExportSettings();
}

function persistActiveProfileBuckets(): void {
  const activeParams = cloneOverlayParams(state.params);
  const profileBucket = getProfileFormatBucket(state.outputProfileKey);
  const formatKeys = new Set<string>([
    ...OVERLAY_CONTENT_FORMAT_ORDER,
    ...Object.keys(profileBucket),
    state.contentFormatKey
  ]);

  for (const formatKey of formatKeys) {
    const existing = profileBucket[formatKey] ?? createDefaultOverlayParams(state.outputProfileKey, formatKey);
    profileBucket[formatKey] = formatKey === state.contentFormatKey
      ? cloneOverlayParams(activeParams)
      : syncOverlaySharedProfileParams(activeParams, existing, state.outputProfileKey);
  }
}

function getOrCreateProfileFormatParams(
  profileKey: string,
  formatKey: string
): OverlayLayoutOperatorParams {
  const profileBucket = getProfileFormatBucket(profileKey);
  const existing = profileBucket[formatKey];
  if (existing) {
    return syncOverlayParamsFrameToProfile(existing, profileKey);
  }

  const created = createDefaultOverlayParams(profileKey, formatKey);
  profileBucket[formatKey] = cloneOverlayParams(created);
  return created;
}

function syncHaloConfigToProfile(profileKey: string) {
  state.haloConfig = getOrCreateHaloConfigForProfile(profileKey);
}

function normalizeSelection() {
  if (!state.selected) {
    return;
  }

  if (state.selected.kind === "logo") {
    if (!state.params.logo) {
      state.selected = null;
    }
    return;
  }

  if (state.params.textFields.some((field) => field.id === state.selected?.id)) {
    return;
  }

  state.selected = null;
}

function updateSelectedTextValue(id: string, value: string) {
  state.params = setOverlayTextValue(state.params, id, value);
}

function normalizeParamsTextFieldOffsets(params: OverlayLayoutOperatorParams): OverlayLayoutOperatorParams {
  return normalizeOverlayParamsForEditing(params, previewTextMeasurer);
}

function getDisplayedTextFieldOffsetBaselines(field: TextFieldPlacementSpec): number {
  return normalizeOverlayTextFieldOffsetBaselines(state.params, field, previewTextMeasurer).offsetBaselines;
}

function createTextFieldId(): string {
  let index = state.params.textFields.length + 1;
  let candidate = `text_field_${index}`;

  while (state.params.textFields.some((field) => field.id === candidate)) {
    index += 1;
    candidate = `text_field_${index}`;
  }

  return candidate;
}

function addTextField() {
  const selectedField = state.selected?.kind === "text"
    ? state.params.textFields.find((field) => field.id === state.selected?.id)
    : undefined;
  const anchorField = selectedField ?? getOverlayMainHeadingField(state.params) ?? state.params.textFields[0];
  const nextId = createTextFieldId();
  const nextContentFieldId = nextId;
  const nextField: TextFieldPlacementSpec = {
    id: nextId,
    contentFieldId: nextContentFieldId,
    styleKey: "paragraph",
    text: "New text",
    keylineIndex: anchorField?.keylineIndex ?? 3,
    rowIndex: Math.max(1, Math.min(24, (anchorField?.rowIndex ?? 1) + 1)),
    offsetBaselines: anchorField?.offsetBaselines ?? 0,
    columnSpan: anchorField?.columnSpan ?? 1
  };

  state.params = normalizeParamsTextFieldOffsets({
    ...state.params,
    textFields: [...state.params.textFields, nextField],
    inlineTextByFieldId: {
      ...state.params.inlineTextByFieldId,
      [nextField.id]: nextField.text,
      [nextContentFieldId]: nextField.text
    }
  });

  state.selected = { kind: "text", id: nextField.id };
}

function canDeleteSelectedText(): boolean {
  return state.selected?.kind === "text" && state.selected.id !== "main_heading";
}

function deleteSelectedTextField() {
  if (!canDeleteSelectedText()) {
    return;
  }

  const selectedId = state.selected?.id;
  if (!selectedId) {
    return;
  }

  const deletedField = state.params.textFields.find((field) => field.id === selectedId);
  const remainingFields = state.params.textFields.filter((field) => field.id !== selectedId);
  const nextInlineText = { ...(state.params.inlineTextByFieldId ?? {}) };
  delete nextInlineText[selectedId];
  if (deletedField?.contentFieldId) {
    delete nextInlineText[deletedField.contentFieldId];
  }

  state.params = {
    ...state.params,
    textFields: remainingFields,
    inlineTextByFieldId: nextInlineText
  };
  state.selected = null;
}

function createOverlayItemActionRow(): HTMLElement {
  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:0.5rem;flex-wrap:wrap;";

  const addButton = document.createElement("button");
  addButton.className = "p-button is-dense";
  addButton.type = "button";
  addButton.textContent = "Add Text";
  addButton.addEventListener("click", () => {
    addTextField();
    buildConfigEditor();
    void renderStage();
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "p-button--base is-dense";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete Text";
  deleteButton.disabled = !canDeleteSelectedText();
  deleteButton.addEventListener("click", () => {
    deleteSelectedTextField();
    buildConfigEditor();
    void renderStage();
  });

  actions.append(addButton, deleteButton);
  return actions;
}

// ─── State mutators ───────────────────────────────────────────────────

function updateTextField(
  id: string,
  updater: (f: TextFieldPlacementSpec) => TextFieldPlacementSpec
) {
  state.params = normalizeParamsTextFieldOffsets({
    ...state.params,
    textFields: state.params.textFields.map(f => (f.id === id ? updater(f) : f))
  });
}

function updateTextStyle(key: string, updater: (s: TextStyleSpec) => TextStyleSpec) {
  state.params = normalizeParamsTextFieldOffsets({
    ...state.params,
    textStyles: state.params.textStyles.map(s => (s.key === key ? updater(s) : s))
  });
}

function updateLogo(updater: (l: LogoPlacementSpec) => LogoPlacementSpec) {
  if (!state.params.logo) return;
  state.params = { ...state.params, logo: updater(state.params.logo) };
}

function getCurrentLogoAspectRatio(): number {
  // Prefer intrinsic dimensions from the loaded image
  if (logoIntrinsicWidth > 0 && logoIntrinsicHeight > 0) {
    return logoIntrinsicWidth / logoIntrinsicHeight;
  }

  const logo = state.params.logo;
  if (!logo || logo.heightPx <= 0 || logo.widthPx <= 0) {
    return 63 / 108;
  }

  return logo.widthPx / logo.heightPx;
}

function syncLogoToTitleFontSize(titleFontSizePx: number) {
  const aspectRatio = getCurrentLogoAspectRatio();
  const linkedDimensions = getLinkedLogoDimensionsPx(titleFontSizePx, aspectRatio);
  updateLogo(logo => ({
    ...logo,
    widthPx: linkedDimensions.widthPx,
    heightPx: linkedDimensions.heightPx
  }));
}

function syncTitleToLogoHeight(logoHeightPx: number) {
  const linkedFontSize = getLinkedTitleFontSizePx(logoHeightPx);
  updateTextStyle("title", style => ({ ...style, fontSizePx: linkedFontSize }));
  syncLogoToTitleFontSize(linkedFontSize);
}

function updateLogoSizeWithAspectRatio(nextHeightPx: number) {
  const aspectRatio = getCurrentLogoAspectRatio();
  updateLogo((logo) => ({
    ...logo,
    widthPx: Math.max(1, Math.round(nextHeightPx * Math.max(0.0001, aspectRatio))),
    heightPx: Math.max(1, Math.round(nextHeightPx))
  }));
}

function select(sel: Selection | null) {
  state.selected = sel;
  closeInlineEditor();
  buildConfigEditor();
  renderAuthoringUI();
}

function applyStagedCsvDraft() {
  const stagedCsvDraft = getStagedCsvDraft();
  if (stagedCsvDraft === null) return;
  state.params = {
    ...state.params,
    csvContent: {
      draft: stagedCsvDraft,
      rowIndex: state.params.csvContent?.rowIndex ?? 1
    }
  };
  setStagedCsvDraft(null);
}

function discardStagedCsvDraft() {
  setStagedCsvDraft(null);
}

// ─── Profile / format / preset ────────────────────────────────────────

function switchOutputProfile(profileKey: string) {
  if (profileKey === state.outputProfileKey) return;

  persistActiveProfileBuckets();
  persistActiveExportSettings();
  persistActiveHaloConfig();
  state.contentFormatKeyByProfile[state.outputProfileKey] = state.contentFormatKey;
  const normalizedProfileState = normalizeOverlayProfileBucketState({
    outputProfileKey: profileKey,
    contentFormatKey: state.contentFormatKey,
    profileFormatBuckets: state.profileFormatBuckets,
    contentFormatKeyByProfile: state.contentFormatKeyByProfile
  });
  state.outputProfileKey = normalizedProfileState.outputProfileKey;
  state.contentFormatKey = normalizedProfileState.contentFormatKey;
  state.profileFormatBuckets = normalizedProfileState.profileFormatBuckets;
  state.contentFormatKeyByProfile = normalizedProfileState.contentFormatKeyByProfile;
  state.params = normalizeParamsTextFieldOffsets(
    cloneOverlayParams(getOrCreateProfileFormatParams(state.outputProfileKey, state.contentFormatKey))
  );
  state.exportSettings = getOrCreateExportSettingsForProfile(state.outputProfileKey);
  normalizeSelection();
  syncHaloConfigToProfile(state.outputProfileKey);
  resizeRenderer();
  saveOutputFormatKey(state.outputProfileKey, state.contentFormatKey);
}

function switchContentFormat(formatKey: string) {
  if (formatKey === state.contentFormatKey) return;

  persistActiveProfileBuckets();
  const nextParams = syncOverlaySharedProfileParams(
    getEffectiveParams(),
    getOrCreateProfileFormatParams(state.outputProfileKey, formatKey),
    state.outputProfileKey
  );

  getProfileFormatBucket(state.outputProfileKey)[formatKey] = cloneOverlayParams(nextParams);
  state.contentFormatKey = formatKey;
  state.contentFormatKeyByProfile[state.outputProfileKey] = formatKey;
  state.params = normalizeParamsTextFieldOffsets(cloneOverlayParams(nextParams));
  normalizeSelection();
  saveOutputFormatKey(state.outputProfileKey, state.contentFormatKey);
}

function buildCurrentPresetPayload(overrides?: Partial<Pick<Preset, "id" | "name">>): Preset {
  persistActiveProfileBuckets();
  persistActiveExportSettings();
  persistActiveHaloConfig();
  return {
    id: overrides?.id ?? createPresetId(),
    name: overrides?.name ?? getNextPresetName(state.presets),
    config: cloneOverlayParams(getEffectiveParams()),
    outputProfileKey: state.outputProfileKey,
    contentFormatKey: state.contentFormatKey,
    profileFormatBuckets: cloneProfileFormatBuckets(state.profileFormatBuckets),
    contentFormatKeyByProfile: cloneProfileContentFormatMap(state.contentFormatKeyByProfile),
    exportSettingsByProfile: cloneExportSettingsByProfile(state.exportSettingsByProfile),
    haloConfigByProfile: cloneHaloConfigByProfile(state.haloConfigByProfile)
  };
}

function getActivePreset(): Preset | undefined {
  return state.presets.find((preset) => preset.id === state.activePresetId);
}

function arePersistedPresetsEqual(left: PersistedPreset, right: PersistedPreset): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isActivePresetDirty(): boolean {
  const activePreset = getActivePreset();
  if (!activePreset) {
    return false;
  }

  const currentSnapshot = buildCurrentPresetPayload({ id: activePreset.id, name: activePreset.name });
  return !arePersistedPresetsEqual(
    normalizePresetForPersistence(activePreset),
    normalizePresetForPersistence(currentSnapshot)
  );
}

function saveCurrentAsPreset(name?: string) {
  const preset = buildCurrentPresetPayload(name ? { name } : undefined);
  state.presets = [...state.presets, preset];
  state.activePresetId = preset.id;
  savePresets(state.presets);
  saveActivePresetId(preset.id);
}

function updateActivePreset() {
  if (!state.activePresetId) return;

  const index = state.presets.findIndex((preset) => preset.id === state.activePresetId);
  if (index === -1) return;

  const existing = state.presets[index];
  const updatedPreset = buildCurrentPresetPayload({ id: existing.id, name: existing.name });
  state.presets = state.presets.map((preset, presetIndex) => (
    presetIndex === index ? updatedPreset : preset
  ));
  savePresets(state.presets);
  saveActivePresetId(updatedPreset.id);
}

function sanitizePresetFileName(name: string): string {
  const cleaned = name.trim().replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned.length > 0 ? cleaned : "preset";
}

function exportPreset(preset: Preset) {
  const persistedPreset = normalizePresetForPersistence(preset);
  const blob = new Blob([JSON.stringify(persistedPreset, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sanitizePresetFileName(preset.name)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeImportedPreset(
  rawPreset: unknown,
  usedIds: Set<string>,
  usedNames: Set<string>
): Preset | null {
  const preset = denormalizePresetFromPersistence(rawPreset);
  if (!preset) {
    return null;
  }

  let id = preset.id;
  while (usedIds.has(id)) {
    id = createPresetId();
  }
  usedIds.add(id);

  const baseName = preset.name || getNextPresetName(state.presets);
  let name = baseName;
  let duplicateIndex = 2;
  while (usedNames.has(name)) {
    name = `${baseName} (${duplicateIndex})`;
    duplicateIndex += 1;
  }
  usedNames.add(name);

  const importedPreset: Preset = {
    id,
    name,
    config: cloneOverlayParams(preset.config),
    profileFormatBuckets: cloneProfileFormatBuckets(preset.profileFormatBuckets ?? {}),
    contentFormatKeyByProfile: cloneProfileContentFormatMap(preset.contentFormatKeyByProfile ?? {}),
    exportSettingsByProfile: cloneExportSettingsByProfile(preset.exportSettingsByProfile ?? {}),
    haloConfigByProfile: cloneHaloConfigByProfile(
      isRecord(preset.haloConfigByProfile) ? (preset.haloConfigByProfile as Record<string, HaloFieldConfig>) : {}
    )
  };

  if (preset.outputProfileKey) {
    importedPreset.outputProfileKey = preset.outputProfileKey;
  }
  if (preset.contentFormatKey) {
    importedPreset.contentFormatKey = preset.contentFormatKey;
  }

  return importedPreset;
}

async function importPresetsFromFiles(files: FileList | null): Promise<void> {
  if (!files || files.length === 0) return;

  const usedIds = new Set(state.presets.map((preset) => preset.id));
  const usedNames = new Set(state.presets.map((preset) => preset.name));
  const importedPresets: Preset[] = [];

  for (const file of Array.from(files)) {
    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText) as unknown;
      const rawPresets = Array.isArray(parsed) ? parsed : [parsed];

      for (const rawPreset of rawPresets) {
        const normalizedPreset = normalizeImportedPreset(rawPreset, usedIds, usedNames);
        if (normalizedPreset) {
          importedPresets.push(normalizedPreset);
        }
      }
    } catch {
      // Ignore malformed preset files and continue importing the rest.
    }
  }

  if (importedPresets.length === 0) return;

  state.presets = [...state.presets, ...importedPresets];
  const lastImportedPreset = importedPresets[importedPresets.length - 1];
  loadPreset(lastImportedPreset);
  savePresets(state.presets);
}

function loadPreset(preset: Preset) {
  const normalizedProfileState = normalizeOverlayProfileBucketState({
    outputProfileKey: preset.outputProfileKey ?? DEFAULT_OUTPUT_PROFILE_KEY,
    contentFormatKey: preset.contentFormatKey ?? INITIAL_FORMAT_KEY,
    profileFormatBuckets: preset.profileFormatBuckets ?? {
      [preset.outputProfileKey ?? DEFAULT_OUTPUT_PROFILE_KEY]: {
        [preset.contentFormatKey ?? INITIAL_FORMAT_KEY]: cloneOverlayParams(preset.config)
      }
    },
    contentFormatKeyByProfile: preset.contentFormatKeyByProfile ?? {
      [preset.outputProfileKey ?? DEFAULT_OUTPUT_PROFILE_KEY]: preset.contentFormatKey ?? INITIAL_FORMAT_KEY
    }
  });
  state.outputProfileKey = normalizedProfileState.outputProfileKey;
  state.profileFormatBuckets = normalizedProfileState.profileFormatBuckets;
  state.contentFormatKeyByProfile = normalizedProfileState.contentFormatKeyByProfile;
  state.contentFormatKey = normalizedProfileState.contentFormatKey;
  state.params = normalizeParamsTextFieldOffsets(cloneOverlayParams(
    getOrCreateProfileFormatParams(state.outputProfileKey, state.contentFormatKey)
  ));
  state.activePresetId = preset.id;
  state.pendingCsvDraftsByBucket = {};
  state.exportSettingsByProfile = cloneExportSettingsByProfile(preset.exportSettingsByProfile ?? {
    [state.outputProfileKey]: createDefaultExportSettings(state.outputProfileKey)
  });
  state.exportSettings = getOrCreateExportSettingsForProfile(state.outputProfileKey);
  state.haloConfigByProfile = isRecord(preset.haloConfigByProfile)
    ? Object.fromEntries(
      Object.entries(preset.haloConfigByProfile).map(([profileKey, rawHaloConfig]) => [profileKey, getHaloConfigForProfile(profileKey, rawHaloConfig)])
    )
    : {
      [state.outputProfileKey]: getHaloConfigForProfile(state.outputProfileKey)
    };
  normalizeSelection();
  syncHaloConfigToProfile(state.outputProfileKey);
  saveActivePresetId(preset.id);
}

function deletePreset(presetId: string) {
  state.presets = state.presets.filter(p => p.id !== presetId);
  if (state.activePresetId === presetId) state.activePresetId = null;
  savePresets(state.presets);
  saveActivePresetId(state.activePresetId);
}

function getSourceDefaultStatusEl(): HTMLElement | null {
  return $("[data-source-default-status]");
}

function setSourceDefaultStatus(message: string, tone: "neutral" | "success" | "error" = "neutral") {
  const statusEl = getSourceDefaultStatusEl();
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.style.color = tone === "success"
    ? "#0e8420"
    : tone === "error"
    ? "#c7162b"
    : "";
}

function sanitizeSourceDefaultSnapshot(rawSnapshot: unknown): SourceDefaultSnapshot | null {
  if (!isRecord(rawSnapshot)) {
    return null;
  }

  const outputProfileKey = typeof rawSnapshot.outputProfileKey === "string"
    ? rawSnapshot.outputProfileKey
    : INITIAL_PROFILE_KEY;
  const normalizedProfileState = normalizeOverlayProfileBucketState({
    outputProfileKey,
    contentFormatKey: typeof rawSnapshot.contentFormatKey === "string"
      ? rawSnapshot.contentFormatKey
      : INITIAL_FORMAT_KEY,
    profileFormatBuckets: isRecord(rawSnapshot.profileFormatBuckets)
    ? cloneProfileFormatBuckets(rawSnapshot.profileFormatBuckets as ProfileFormatBuckets)
      : cloneProfileFormatBuckets(INITIAL_SOURCE_DEFAULTS.profileFormatBuckets),
    contentFormatKeyByProfile: isRecord(rawSnapshot.contentFormatKeyByProfile)
      ? Object.fromEntries(
        Object.entries(rawSnapshot.contentFormatKeyByProfile)
          .filter(([, rawFormatKey]) => typeof rawFormatKey === "string")
      ) as ProfileContentFormatMap
      : cloneProfileContentFormatMap(INITIAL_SOURCE_DEFAULTS.contentFormatKeyByProfile)
  });

  const exportSettingsByProfile: Record<string, ExportSettings> = {};
  if (isRecord(rawSnapshot.exportSettingsByProfile)) {
    for (const [profileKey, rawExportSettings] of Object.entries(rawSnapshot.exportSettingsByProfile)) {
      exportSettingsByProfile[profileKey] = isRecord(rawExportSettings)
        ? {
          ...createDefaultExportSettings(profileKey),
          ...rawExportSettings
        }
        : createDefaultExportSettings(profileKey);
    }
  }

  const exportSettings = isRecord(rawSnapshot.exportSettings)
    ? {
      ...createDefaultExportSettings(normalizedProfileState.outputProfileKey),
      ...rawSnapshot.exportSettings
    }
    : exportSettingsByProfile[normalizedProfileState.outputProfileKey]
      ?? createDefaultExportSettings(normalizedProfileState.outputProfileKey);

  exportSettingsByProfile[normalizedProfileState.outputProfileKey] ??= JSON.parse(JSON.stringify(exportSettings)) as ExportSettings;
  const haloConfigByProfile: Record<string, HaloFieldConfig> = {};
  if (isRecord(rawSnapshot.haloConfigByProfile)) {
    for (const [profileKey, rawHaloConfig] of Object.entries(rawSnapshot.haloConfigByProfile)) {
      haloConfigByProfile[profileKey] = getHaloConfigForProfile(profileKey, rawHaloConfig);
    }
  }

  const haloConfig = haloConfigByProfile[normalizedProfileState.outputProfileKey]
    ?? getHaloConfigForProfile(normalizedProfileState.outputProfileKey, rawSnapshot.haloConfig);
  haloConfigByProfile[normalizedProfileState.outputProfileKey] ??= JSON.parse(JSON.stringify(haloConfig)) as HaloFieldConfig;
  const guideMode = rawSnapshot.guideMode === "off" || rawSnapshot.guideMode === "baseline"
    ? rawSnapshot.guideMode
    : "composition";

  return {
    outputProfileKey: normalizedProfileState.outputProfileKey,
    contentFormatKey: normalizedProfileState.contentFormatKey,
    profileFormatBuckets: normalizedProfileState.profileFormatBuckets,
    contentFormatKeyByProfile: normalizedProfileState.contentFormatKeyByProfile,
    exportSettings,
    exportSettingsByProfile,
    haloConfig,
    haloConfigByProfile,
    guideMode
  };
}

function createCurrentSourceDefaultSnapshot(): SourceDefaultSnapshot {
  persistActiveProfileBuckets();
  persistActiveExportSettings();
  persistActiveHaloConfig();
  const normalizedProfileState = normalizeOverlayProfileBucketState({
    outputProfileKey: state.outputProfileKey,
    contentFormatKey: state.contentFormatKey,
    profileFormatBuckets: state.profileFormatBuckets,
    contentFormatKeyByProfile: state.contentFormatKeyByProfile
  });
  return {
    outputProfileKey: normalizedProfileState.outputProfileKey,
    contentFormatKey: normalizedProfileState.contentFormatKey,
    profileFormatBuckets: normalizedProfileState.profileFormatBuckets,
    contentFormatKeyByProfile: normalizedProfileState.contentFormatKeyByProfile,
    exportSettings: JSON.parse(JSON.stringify(state.exportSettings)) as ExportSettings,
    exportSettingsByProfile: cloneExportSettingsByProfile(state.exportSettingsByProfile),
    haloConfig: JSON.parse(JSON.stringify(state.haloConfig)) as HaloFieldConfig,
    haloConfigByProfile: cloneHaloConfigByProfile(state.haloConfigByProfile),
    guideMode: state.guideMode
  };
}

function applySourceDefaultSnapshot(snapshot: SourceDefaultSnapshot) {
  const normalizedProfileState = normalizeOverlayProfileBucketState({
    outputProfileKey: snapshot.outputProfileKey,
    contentFormatKey: snapshot.contentFormatKey,
    profileFormatBuckets: snapshot.profileFormatBuckets,
    contentFormatKeyByProfile: snapshot.contentFormatKeyByProfile
  });
  state.sourceDefaults = cloneSourceDefaultSnapshot(snapshot);
  state.outputProfileKey = normalizedProfileState.outputProfileKey;
  state.profileFormatBuckets = normalizedProfileState.profileFormatBuckets;
  state.contentFormatKeyByProfile = normalizedProfileState.contentFormatKeyByProfile;
  state.contentFormatKey = normalizedProfileState.contentFormatKey;
  state.params = normalizeParamsTextFieldOffsets(cloneOverlayParams(
    getOrCreateProfileFormatParams(state.outputProfileKey, state.contentFormatKey)
  ));
  state.exportSettingsByProfile = cloneExportSettingsByProfile(snapshot.exportSettingsByProfile);
  state.exportSettings = JSON.parse(JSON.stringify(
    state.exportSettingsByProfile[state.outputProfileKey] ?? snapshot.exportSettings
  )) as ExportSettings;
  state.haloConfigByProfile = cloneHaloConfigByProfile(snapshot.haloConfigByProfile);
  state.haloConfig = JSON.parse(JSON.stringify(
    state.haloConfigByProfile[state.outputProfileKey] ?? snapshot.haloConfig
  )) as HaloFieldConfig;
  state.guideMode = snapshot.guideMode;
  state.overlayVisible = false;
  state.selected = null;
  state.pendingCsvDraftsByBucket = {};
  normalizeSelection();
  syncHaloConfigToProfile(state.outputProfileKey);
}

function setOverlayVisible(nextVisible: boolean) {
  if (state.overlayVisible === nextVisible) {
    syncOverlayVisibilityUi();
    return;
  }

  state.overlayVisible = nextVisible;

  if (!nextVisible) {
    hoverId = null;
    hoverHandle = null;
    currentDrag = null;
    setDocumentSelectionSuppressed(false);
    closeInlineEditor();
  }

  syncOverlayVisibilityUi();
}

function syncOverlayVisibilityUi() {
  const svg = getSvgOverlay();
  const authoringLayer = getAuthoringLayerEl();
  const overlayVisibilityInput = getOverlayVisibilityInput();

  if (overlayVisibilityInput) {
    overlayVisibilityInput.checked = state.overlayVisible;
  }

  if (svg) {
    svg.style.display = state.overlayVisible ? "block" : "none";
  }

  if (authoringLayer) {
    authoringLayer.style.display = state.overlayVisible ? "block" : "none";
    authoringLayer.style.pointerEvents = state.overlayVisible ? "auto" : "none";
  }
}

async function readSourceDefaultSnapshot(): Promise<SourceDefaultSnapshot> {
  try {
    const response = await fetch(`${SOURCE_DEFAULT_ASSET_PATH}?t=${Date.now()}`, {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const snapshot = sanitizeSourceDefaultSnapshot(await response.json());
    if (snapshot) {
      return snapshot;
    }
  } catch {
    // Fall back to the built-in snapshot when the authored file is absent or invalid.
  }

  return cloneSourceDefaultSnapshot(INITIAL_SOURCE_DEFAULTS);
}

async function writeCurrentAsSourceDefault(): Promise<void> {
  const snapshot = createCurrentSourceDefaultSnapshot();
  const response = await fetch(SOURCE_DEFAULT_AUTHORING_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(snapshot, null, 2)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  state.sourceDefaults = cloneSourceDefaultSnapshot(snapshot);
}

function getUbuntuSummitSceneDescriptor() {
  const sceneDescriptor = buildUbuntuSummitAnimationSceneDescriptor(
    ubuntuSummitTransitionState
      ? {
          haloConfig: state.haloConfig,
          playbackTimeSec: state.playbackTimeSec,
          frameWidthPx: state.params.frame.widthPx,
          frameHeightPx: state.params.frame.heightPx,
          previousTransitionState: ubuntuSummitTransitionState
        }
      : {
          haloConfig: state.haloConfig,
          playbackTimeSec: state.playbackTimeSec,
          frameWidthPx: state.params.frame.widthPx,
          frameHeightPx: state.params.frame.heightPx
        }
  );
  ubuntuSummitTransitionState = sceneDescriptor.frameState.nextTransitionState;
  return sceneDescriptor;
}

// ─── Halo field rendering (Three.js) ──────────────────────────────────

function initHaloRenderer() {
  const canvas = getCanvasEl();
  const textCanvas = getTextOverlayCanvas();
  if (!canvas || !textCanvas) return;

  const { widthPx, heightPx } = state.params.frame;
  haloRendererInstance = createHaloRenderer({
    canvas,
    textOverlayCanvas: textCanvas,
    widthPx,
    heightPx
  });
}

function resizeRenderer() {
  if (!haloRendererInstance) return;
  const { widthPx, heightPx } = state.params.frame;
  haloRendererInstance.resize(widthPx, heightPx);
  updateStageAspectRatio();
}

function updateStageAspectRatio() {
  const stage = getStageEl();
  if (!stage) return;
  const { widthPx, heightPx } = state.params.frame;
  stage.style.aspectRatio = `${widthPx} / ${heightPx}`;
  stage.style.setProperty("--stage-aspect-ratio", String(widthPx / heightPx));
}

function renderHaloFrame() {
  if (!haloRendererInstance) return;
  const sceneDescriptor = getUbuntuSummitSceneDescriptor();
  haloRendererInstance.renderFrame(sceneDescriptor);
}

function getPlaybackToggleButton(): HTMLButtonElement | null {
  return $<HTMLButtonElement>("[data-playback-toggle]");
}

function updatePlaybackToggleUi() {
  const button = getPlaybackToggleButton();
  if (!button) return;

  button.textContent = state.isPlaying ? "Pause Motion" : "Play Motion";
  button.setAttribute("aria-pressed", state.isPlaying ? "true" : "false");
}

function stopPlaybackLoop() {
  if (playbackFrameHandle !== null) {
    cancelAnimationFrame(playbackFrameHandle);
    playbackFrameHandle = null;
  }
  lastPlaybackFrameMs = null;
}

function stepPlayback(nowMs: number) {
  if (!state.isPlaying) {
    stopPlaybackLoop();
    return;
  }

  if (lastPlaybackFrameMs === null) {
    lastPlaybackFrameMs = nowMs;
  }

  const deltaSec = Math.max(0, Math.min(0.1, (nowMs - lastPlaybackFrameMs) / 1000));
  lastPlaybackFrameMs = nowMs;
  state.playbackTimeSec += deltaSec;
  renderHaloFrame();
  playbackFrameHandle = requestAnimationFrame(stepPlayback);
}

function ensurePlaybackLoop() {
  if (!state.isPlaying || playbackFrameHandle !== null) {
    return;
  }

  playbackFrameHandle = requestAnimationFrame(stepPlayback);
}

function setPlaybackPlaying(nextIsPlaying: boolean) {
  if (state.isPlaying === nextIsPlaying) {
    if (nextIsPlaying) {
      ensurePlaybackLoop();
    }
    updatePlaybackToggleUi();
    return;
  }

  state.isPlaying = nextIsPlaying;
  updatePlaybackToggleUi();

  if (nextIsPlaying) {
    lastPlaybackFrameMs = null;
    ensurePlaybackLoop();
    return;
  }

  stopPlaybackLoop();
}

function togglePlayback() {
  setPlaybackPlaying(!state.isPlaying);
}

// ─── SVG overlay rendering (text, logo, guides) ──────────────────────

function renderSvgOverlay(scene: LayerScene) {
  const svg = getSvgOverlay();
  if (!svg) return;

  if (!state.overlayVisible) {
    svg.innerHTML = "";
    svg.style.display = "none";
    return;
  }

  svg.style.display = "block";

  const { widthPx, heightPx } = state.params.frame;
  svg.setAttribute("viewBox", `0 0 ${widthPx} ${heightPx}`);

  const styleByKey = new Map(state.params.textStyles.map(s => [s.key, s]));
  const parts: string[] = [];

  if (state.guideMode !== "off") {
    parts.push(createGuideMarkup(scene.grid));
  }

  parts.push(createSafeAreaMarkup());

  for (const text of scene.texts) {
    const style = styleByKey.get(text.styleKey);
    if (style) parts.push(createTextMarkup(text, style));
  }

  parts.push(createLogoMarkup());

  svg.innerHTML = parts.join("");
}

function createSafeAreaMarkup(): string {
  const { widthPx, heightPx } = state.params.frame;
  const sa = state.params.safeArea;
  if (!sa) return "";

  const top = sa.top ?? 0;
  const right = sa.right ?? 0;
  const bottom = sa.bottom ?? 0;
  const left = sa.left ?? 0;

  if (top <= 0 && right <= 0 && bottom <= 0 && left <= 0) return "";

  const bgColor = state.haloConfig.composition.background_color || "#202020";
  const bars: string[] = [];

  if (top > 0) bars.push(`<rect x="0" y="0" width="${widthPx}" height="${top}" fill="${bgColor}" opacity="0.85"/>`);
  if (bottom > 0) bars.push(`<rect x="0" y="${heightPx - bottom}" width="${widthPx}" height="${bottom}" fill="${bgColor}" opacity="0.85"/>`);
  if (left > 0) bars.push(`<rect x="0" y="${top}" width="${left}" height="${heightPx - top - bottom}" fill="${bgColor}" opacity="0.85"/>`);
  if (right > 0) bars.push(`<rect x="${widthPx - right}" y="${top}" width="${right}" height="${heightPx - top - bottom}" fill="${bgColor}" opacity="0.85"/>`);

  return `<g class="safe-area-fill">${bars.join("")}</g>`;
}

function createGuideMarkup(grid: LayoutGridMetrics): string {
  if (state.guideMode === "off") return "";

  const { widthPx, heightPx } = state.params.frame;
  const lines: string[] = [];
  const guideColor = "rgba(255,255,255,0.12)";
  const accentColor = "rgba(255,255,255,0.22)";
  const labelColor = "rgba(255,255,255,0.35)";
  const marginColor = "rgba(235,180,65,0.06)";
  const columnFillColor = "rgba(100,160,255,0.04)";
  const boundaryColor = "rgba(255,255,255,0.18)";

  // Content area boundary
  const cW = grid.contentRightPx - grid.contentLeftPx;
  const cH = grid.contentBottomPx - grid.contentTopPx;
  if (cW > 0 && cH > 0) {
    lines.push(`<rect x="${grid.contentLeftPx}" y="${grid.contentTopPx}" width="${cW}" height="${cH}" fill="none" stroke="${boundaryColor}" stroke-width="0.5" stroke-dasharray="6 4"/>`);
  }

  // Margin zones (tinted overlays)
  if (grid.topMarginPx > 0) {
    lines.push(`<rect x="${grid.layoutLeftPx}" y="${grid.layoutTopPx}" width="${grid.layoutRightPx - grid.layoutLeftPx}" height="${grid.topMarginPx}" fill="${marginColor}"/>`);
    lines.push(`<text x="${grid.contentLeftPx + 4}" y="${grid.layoutTopPx + grid.topMarginPx - 4}" fill="${labelColor}" font-size="9" font-family="monospace" opacity="0.6">margin-top</text>`);
  }
  if (grid.bottomMarginPx > 0) {
    lines.push(`<rect x="${grid.layoutLeftPx}" y="${grid.contentBottomPx}" width="${grid.layoutRightPx - grid.layoutLeftPx}" height="${grid.bottomMarginPx}" fill="${marginColor}"/>`);
  }
  if (grid.leftMarginPx > 0) {
    lines.push(`<rect x="${grid.layoutLeftPx}" y="${grid.contentTopPx}" width="${grid.leftMarginPx}" height="${cH}" fill="${marginColor}"/>`);
  }
  if (grid.rightMarginPx > 0) {
    lines.push(`<rect x="${grid.contentRightPx}" y="${grid.contentTopPx}" width="${grid.rightMarginPx}" height="${cH}" fill="${marginColor}"/>`);
  }

  // Column fills and keylines
  for (let ki = 1; ki <= grid.columnCount; ki++) {
    const x = getKeylineXPx(grid, ki);
    const spanW = getColumnSpanWidthPx(grid, ki, 1);

    // Column fill
    if (spanW > 0) {
      lines.push(`<rect x="${x}" y="${grid.contentTopPx}" width="${spanW}" height="${cH}" fill="${columnFillColor}"/>`);
    }

    // Keyline (left edge of column)
    lines.push(`<line x1="${x}" y1="${grid.contentTopPx}" x2="${x}" y2="${grid.contentBottomPx}" stroke="${accentColor}" stroke-width="1"/>`);
    lines.push(`<text x="${x + 4}" y="${grid.contentTopPx + 12}" fill="${labelColor}" font-size="10" font-family="monospace">K${ki}</text>`);

    // Right edge of column (dashed)
    const endX = x + spanW;
    if (Math.abs(endX - x) > 2) {
      lines.push(`<line x1="${endX}" y1="${grid.contentTopPx}" x2="${endX}" y2="${grid.contentBottomPx}" stroke="${guideColor}" stroke-width="0.5" stroke-dasharray="4 4"/>`);
    }
  }

  // Row bands
  if (grid.rowCount > 0) {
    const rowStepPx = grid.rowHeightPx + grid.rowGutterPx;
    for (let ri = 0; ri < grid.rowCount; ri++) {
      const y = grid.contentTopPx + ri * rowStepPx;
      lines.push(`<rect x="${grid.contentLeftPx}" y="${y}" width="${cW}" height="${grid.rowHeightPx}" fill="rgba(255,255,255,0.03)" stroke="${guideColor}" stroke-width="0.5"/>`);
      // Row gutter
      if (ri < grid.rowCount - 1 && grid.rowGutterPx > 0) {
        const gutterY = y + grid.rowHeightPx;
        lines.push(`<rect x="${grid.contentLeftPx}" y="${gutterY}" width="${cW}" height="${grid.rowGutterPx}" fill="rgba(255,100,100,0.03)"/>`);
      }
    }
  }

  // Baseline grid
  if (state.guideMode === "baseline" && grid.baselineStepPx > 0) {
    for (let y = grid.contentTopPx; y < grid.contentBottomPx; y += grid.baselineStepPx) {
      lines.push(`<line x1="${grid.contentLeftPx}" y1="${y}" x2="${grid.contentRightPx}" y2="${y}" stroke="rgba(255,79,79,0.15)" stroke-width="0.5"/>`);
    }
  }

  return `<g class="guides">${lines.join("")}</g>`;
}

function createTextMarkup(text: ResolvedTextPlacement, style: TextStyleSpec): string {
  const displayLines = text.wrappedLines;
  const fontWeight = style.fontWeight ?? 400;

  const tspans = displayLines.map((line, i) =>
    `<tspan x="${text.anchorXPx}" dy="${i === 0 ? 0 : style.lineHeightPx}">${escapeXml(line)}</tspan>`
  ).join("");

  return `<g data-field-id="${escapeXml(text.id)}">
    <text x="${text.anchorXPx}" y="${text.anchorBaselineYPx}" fill="#ffffff" font-size="${style.fontSizePx}" font-weight="${fontWeight}" font-family="'Ubuntu Sans', 'Ubuntu', sans-serif">
      ${tspans}
    </text>
  </g>`;
}

function createLogoMarkup(): string {
  const logo = state.params.logo;
  if (!logo) return "";

  const assetHref = logo.assetPath ?? "";
  return `<g data-logo-id="${escapeXml(logo.id ?? "logo")}">
    <image href="${escapeXml(assetHref)}" x="${logo.xPx}" y="${logo.yPx}" width="${logo.widthPx}" height="${logo.heightPx}"/>
  </g>`;
}

// ─── Full render pipeline ─────────────────────────────────────────────

async function renderStage() {
  const myToken = ++renderToken;
  const graph = buildGraph(getEffectiveParams());
  const resultMap = await evaluateGraph(graph, registry);
  if (renderToken !== myToken) return;

  const nodeResult = resultMap.get(PREVIEW_NODE_ID) as { scene?: LayerScene } | undefined;
  const scene = nodeResult?.scene;
  if (!scene) return;
  currentScene = scene;

  renderHaloFrame();
  renderSvgOverlay(scene);
  renderAuthoringUI();
}

// ─── Aside panel: output profiles ─────────────────────────────────────

function buildOutputProfileOptions() {
  const container = getOutputProfileOptions();
  if (!container) return;
  container.innerHTML = "";

  const list = document.createElement("div");
  list.className = "preset-radio-list";

  for (const key of OUTPUT_PROFILE_ORDER) {
    const profile = OUTPUT_PROFILES[key];
    const row = document.createElement("label");
    row.className = "preset-radio-row";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "output-profile";
    radio.value = key;
    radio.checked = key === state.outputProfileKey;
    radio.addEventListener("change", () => {
      switchOutputProfile(key);
      buildOutputProfileOptions();
      buildPresetTabs();
      buildConfigEditor();
      void renderStage();
    });

    const nameSpan = document.createElement("span");
    nameSpan.className = "preset-radio-name";
    nameSpan.textContent = profile.label;

    const metaSpan = document.createElement("span");
    metaSpan.className = "preset-radio-status";
    metaSpan.textContent = `${profile.widthPx}\u00D7${profile.heightPx}`;

    row.append(radio, nameSpan, metaSpan);
    list.append(row);
  }

  container.append(list);
}

// ─── Aside panel: preset tabs ─────────────────────────────────────────

function buildPresetTabs() {
  const container = getPresetTabs();
  if (!container) return;
  container.innerHTML = "";

  if (state.presets.length === 0) {
    const empty = document.createElement("p");
    empty.className = "p-form-help-text preset-empty";
    empty.textContent = "No presets saved yet.";
    container.append(empty);
    updatePresetToolbarState();
    return;
  }

  const list = document.createElement("div");
  list.className = "preset-radio-list";

  for (const preset of state.presets) {
    const row = document.createElement("label");
    row.className = "preset-radio-row";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "preset";
    radio.value = preset.id;
    radio.checked = preset.id === state.activePresetId;
    radio.addEventListener("change", () => {
      loadPreset(preset);
      buildOutputProfileOptions();
      buildPresetTabs();
      buildConfigEditor();
      resizeRenderer();
      void renderStage();
    });

    const nameSpan = document.createElement("span");
    nameSpan.className = "preset-radio-name";
    nameSpan.textContent = preset.name;

    const statusSpan = document.createElement("span");
    statusSpan.className = "preset-radio-status";
    if (preset.id === state.activePresetId) {
      statusSpan.textContent = isActivePresetDirty() ? "Active • Dirty" : "Active";
    } else {
      statusSpan.textContent = "";
    }

    row.append(radio, nameSpan, statusSpan);
    list.append(row);
  }

  container.append(list);
  updatePresetToolbarState();
}

function updatePresetToolbarState() {
  const hasActivePreset = Boolean(getActivePreset());
  const activePresetDirty = isActivePresetDirty();
  const updateButton = $<HTMLButtonElement>("[data-preset-update]");
  const exportButton = $<HTMLButtonElement>("[data-preset-export]");
  const deleteButton = $<HTMLButtonElement>("[data-preset-delete]");

  if (updateButton) updateButton.disabled = !hasActivePreset || !activePresetDirty;
  if (exportButton) exportButton.disabled = !hasActivePreset;
  if (deleteButton) deleteButton.disabled = !hasActivePreset;
}

// ─── Aside panel: config editor ───────────────────────────────────────

function buildPlaybackExportSection(): HTMLElement {
  const { root, body } = buildSectionEl("Playback & Export");

  const row = document.createElement("div");
  row.className = "row";

  const playBtn = document.createElement("button");
  playBtn.className = "p-button is-dense";
  playBtn.type = "button";
  playBtn.setAttribute("data-playback-toggle", "");
  playBtn.textContent = state.isPlaying ? "Pause Motion" : "Play Motion";
  playBtn.addEventListener("click", () => { togglePlayback(); });
  row.append(wrapCol(2, playBtn));

  const exportBtn = document.createElement("button");
  exportBtn.className = "p-button--base is-dense";
  exportBtn.type = "button";
  exportBtn.textContent = "Export Frame";
  exportBtn.addEventListener("click", () => { void exportComposedFramePng(); });
  row.append(wrapCol(2, exportBtn));

  const seqBtn = document.createElement("button");
  seqBtn.className = "p-button--base is-dense";
  seqBtn.type = "button";
  seqBtn.textContent = "Export Sequence";
  seqBtn.addEventListener("click", () => { void exportPngSequence(); });
  row.append(wrapCol(2, seqBtn));

  const resetBtn = document.createElement("button");
  resetBtn.className = "p-button--base is-dense";
  resetBtn.type = "button";
  resetBtn.textContent = "Reset Defaults";
  resetBtn.addEventListener("click", () => {
    applySourceDefaultSnapshot(state.sourceDefaults);
    state.playbackTimeSec = 0;
    resizeRenderer();
    buildOutputProfileOptions();
    buildPresetTabs();
    buildConfigEditor();
    setSourceDefaultStatus("Reset to source default.");
    void renderStage();
  });
  row.append(wrapCol(2, resetBtn));

  const writeBtn = document.createElement("button");
  writeBtn.className = "p-button--base is-dense";
  writeBtn.type = "button";
  writeBtn.setAttribute("data-write-source-default", "");
  writeBtn.textContent = "Write Source Default";
  writeBtn.addEventListener("click", () => {
    void (async () => {
      writeBtn.disabled = true;
      setSourceDefaultStatus("Saving source default...");
      try {
        await writeCurrentAsSourceDefault();
        setSourceDefaultStatus("Source default saved.", "success");
      } catch {
        setSourceDefaultStatus("Source default save failed.", "error");
      } finally {
        writeBtn.disabled = false;
      }
    })();
  });
  row.append(wrapCol(2, writeBtn));

  body.append(row);

  const status = document.createElement("p");
  status.className = "p-form-help-text u-no-margin--bottom";
  status.setAttribute("data-source-default-status", "");
  status.textContent = "Source defaults are using the built-in preview snapshot.";
  body.append(status);

  const transparentGroup = document.createElement("div");
  transparentGroup.className = "p-form__group";
  const transparentLabel = document.createElement("label");
  transparentLabel.className = "p-form__label u-no-margin--bottom";
  transparentLabel.textContent = "Transparent PNG background";
  const transparentCtrl = document.createElement("div");
  transparentCtrl.className = "p-form__control";
  const transparentInput = document.createElement("input");
  transparentInput.type = "checkbox";
  transparentInput.setAttribute("data-export-transparent-background", "");
  transparentInput.checked = state.exportSettings.transparentBackground;
  transparentInput.addEventListener("change", () => {
    updateExportSettings((settings) => ({ ...settings, transparentBackground: transparentInput.checked }));
  });
  transparentCtrl.append(transparentInput);
  transparentGroup.append(transparentLabel, transparentCtrl);
  body.append(transparentGroup);

  return root;
}

function buildOutputFormatSection(): HTMLElement {
  const { root, body } = buildSectionEl("Output Format");

  const helpText = document.createElement("p");
  helpText.className = "p-form-help-text u-no-margin--bottom";
  helpText.textContent = "Switching format rebuilds the stage at that size and swaps in the layout settings stored for that screen size.";
  body.append(helpText);

  const optionsContainer = document.createElement("div");
  optionsContainer.setAttribute("data-output-profile-options", "");
  body.append(optionsContainer);

  return root;
}

function buildPresetsSection(): HTMLElement {
  const { root, body } = buildSectionEl("Presets");

  const helpText = document.createElement("p");
  helpText.className = "p-form-help-text u-no-margin--bottom";
  helpText.textContent = "Presets are stored in this browser.";
  body.append(helpText);

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "p-form-validation__input is-dense";
  nameInput.placeholder = "Preset name";
  nameInput.setAttribute("data-preset-name-input", "");
  body.append(createFormGroup("Name", nameInput));

  const toolbar = document.createElement("div");
  toolbar.className = "preset-toolbar";

  const btnSpec: Array<{ label: string; attr: string; className: string }> = [
    { label: "Save", attr: "data-preset-save", className: "p-button is-dense" },
    { label: "Update", attr: "data-preset-update", className: "p-button--base is-dense" },
    { label: "Import", attr: "data-preset-import", className: "p-button--base is-dense" },
    { label: "Export", attr: "data-preset-export", className: "p-button--base is-dense" },
    { label: "Delete", attr: "data-preset-delete", className: "p-button--base is-dense" }
  ];
  for (const spec of btnSpec) {
    const btn = document.createElement("button");
    btn.className = spec.className;
    btn.type = "button";
    btn.setAttribute(spec.attr, "");
    btn.textContent = spec.label;
    toolbar.append(btn);
  }
  body.append(toolbar);

  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.setAttribute("data-preset-import-input", "");
  importInput.accept = "application/json,.json";
  importInput.hidden = true;
  body.append(importInput);

  const tabsContainer = document.createElement("div");
  tabsContainer.setAttribute("data-preset-tabs", "");
  body.append(tabsContainer);

  // Inline event listeners for preset buttons
  toolbar.querySelector("[data-preset-save]")?.addEventListener("click", () => {
    const name = nameInput.value.trim() || undefined;
    saveCurrentAsPreset(name);
    nameInput.value = "";
    buildPresetTabs();
  });
  toolbar.querySelector("[data-preset-update]")?.addEventListener("click", () => {
    updateActivePreset();
    buildPresetTabs();
  });
  toolbar.querySelector("[data-preset-export]")?.addEventListener("click", () => {
    const activePreset = getActivePreset();
    if (activePreset) exportPreset(activePreset);
  });
  toolbar.querySelector("[data-preset-import]")?.addEventListener("click", () => {
    importInput.click();
  });
  importInput.addEventListener("change", async () => {
    await importPresetsFromFiles(importInput.files);
    importInput.value = "";
    buildOutputProfileOptions();
    buildPresetTabs();
    buildConfigEditor();
    resizeRenderer();
    void renderStage();
  });
  toolbar.querySelector("[data-preset-delete]")?.addEventListener("click", () => {
    if (state.activePresetId) {
      deletePreset(state.activePresetId);
      buildPresetTabs();
    }
  });

  return root;
}

const CORE_CONFIG_SECTION_DEFINITIONS: ConfigSectionDefinition[] = [
  { key: "playback-export", order: 100, factory: buildPlaybackExportSection, afterRender: updatePlaybackToggleUi },
  { key: "output-format", order: 200, factory: buildOutputFormatSection, afterRender: buildOutputProfileOptions },
  { key: "presets", order: 300, factory: buildPresetsSection, afterRender: buildPresetTabs },
  { key: "content-format", order: 400, factory: buildContentFormatSection },
  { key: "selected-overlay", order: 500, factory: buildOverlaySection },
  { key: "paragraph-styles", order: 600, factory: buildParagraphStylesSection },
  { key: "layout-grid", order: 700, factory: buildGridSection, afterRender: syncOverlayVisibilityUi },
  { key: "halo-config", order: 800, factory: buildHaloConfigSection }
];

const configSectionRegistry = createParameterSectionRegistry(CORE_CONFIG_SECTION_DEFINITIONS);

function registerConfigSection(section: ConfigSectionDefinition) {
  configSectionRegistry.register(section);
}

function registerConfigSections(sections: ConfigSectionDefinition[]) {
  configSectionRegistry.registerMany(sections);
}

function getConfigSections(): ConfigSectionDefinition[] {
  return configSectionRegistry.getSections();
}

function buildConfigEditor() {
  const container = getConfigEditor();
  if (!container) return;
  container.innerHTML = "";

  const accordion = document.createElement("aside");
  accordion.className = "p-accordion";

  const list = document.createElement("ul");
  list.className = "p-accordion__list";

  const sections = getConfigSections();
  for (const section of sections) {
    list.append(section.factory());
  }

  accordion.append(list);
  container.append(accordion);
  setupAccordion(accordion);
  initRangeControls({ root: container });

  for (const section of sections) {
    section.afterRender?.();
  }
}

/* shared form helpers */

function createFormGroup(label: string, control: HTMLElement): HTMLElement {
  const group = document.createElement("div");
  group.className = "p-form__group";

  const lbl = document.createElement("label");
  lbl.className = "p-form__label u-no-margin--bottom";
  lbl.textContent = label;

  const ctrl = document.createElement("div");
  ctrl.className = "p-form__control";
  ctrl.append(control);

  group.append(lbl, ctrl);
  return group;
}

function createNumberInput(
  value: number,
  opts: { min?: number; max?: number; step?: number },
  onChange: (v: number) => void
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "number";
  input.className = "p-form-validation__input vr-input--number is-dense";
  input.value = String(value);
  if (opts.min !== undefined) input.min = String(opts.min);
  if (opts.max !== undefined) input.max = String(opts.max);
  if (opts.step !== undefined) input.step = String(opts.step);
  input.addEventListener("change", () => {
    const v = parseFloat(input.value);
    if (Number.isFinite(v)) onChange(v);
  });
  return input;
}

function createSliderInput(
  value: number,
  opts: { min: number; max: number; step: number },
  onChange: (v: number) => void
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "slider-pair p-slider__wrapper";

  const range = document.createElement("input");
  range.type = "range";
  range.min = String(opts.min);
  range.max = String(opts.max);
  range.step = String(opts.step);
  range.value = String(value);

  const num = document.createElement("input");
  num.type = "number";
  num.className = "p-form-validation__input p-slider__input is-dense";
  num.min = String(opts.min);
  num.max = String(opts.max);
  num.step = String(opts.step);
  num.value = String(value);

  range.addEventListener("input", () => {
    const v = parseFloat(range.value);
    if (Number.isFinite(v)) { num.value = String(v); onChange(v); }
  });
  num.addEventListener("change", () => {
    const v = parseFloat(num.value);
    if (Number.isFinite(v)) { range.value = String(v); onChange(v); }
  });

  wrap.append(range, num);
  return wrap;
}

function createSelectInput(
  value: string,
  options: Array<{ label: string; value: string }>,
  onChange: (v: string) => void
): HTMLSelectElement {
  const sel = document.createElement("select");
  sel.className = "p-form-validation__input is-dense";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    o.selected = opt.value === value;
    sel.append(o);
  }
  sel.addEventListener("change", () => onChange(sel.value));
  return sel;
}

function createCheckboxInput(checked: boolean, onChange: (v: boolean) => void): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  return input;
}

let accordionIdCounter = 0;

function buildSectionEl(title: string): { root: HTMLElement; body: HTMLElement } {
  const id = `accordion-tab-${++accordionIdCounter}`;
  const sectionId = `${id}-section`;

  const root = document.createElement("li");
  root.className = "p-accordion__group";

  const heading = document.createElement("div");
  heading.setAttribute("role", "heading");
  heading.setAttribute("aria-level", "3");
  heading.className = "p-accordion__heading";

  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "p-accordion__tab";
  tab.id = id;
  tab.setAttribute("aria-controls", sectionId);
  tab.setAttribute("aria-expanded", "false");
  tab.textContent = title;
  heading.append(tab);

  const body = document.createElement("section");
  body.className = "p-accordion__panel config-group";
  body.id = sectionId;
  body.setAttribute("aria-hidden", "true");
  body.setAttribute("aria-labelledby", id);

  root.append(heading, body);
  return { root, body };
}

function setupAccordion(accordionContainer: HTMLElement) {
  accordionContainer.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>(".p-accordion__tab");
    if (!target) return;

    const panelId = target.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel) return;

    const isOpen = target.getAttribute("aria-expanded") === "true";

    // Mutual exclusion: close all other sections when opening one
    if (!isOpen) {
      accordionContainer.querySelectorAll<HTMLElement>(".p-accordion__tab").forEach((tab) => {
        if (tab !== target) {
          const otherPanelId = tab.getAttribute("aria-controls");
          const otherPanel = otherPanelId ? document.getElementById(otherPanelId) : null;
          tab.setAttribute("aria-expanded", "false");
          otherPanel?.setAttribute("aria-hidden", "true");
        }
      });
    }

    target.setAttribute("aria-expanded", String(!isOpen));
    panel.setAttribute("aria-hidden", String(isOpen));
  });
}

function wrapCol(span: number, el: HTMLElement): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = `col-${span}`;
  wrapper.append(el);
  return wrapper;
}

function createReadonlySpan(value: string): HTMLElement {
  const span = document.createElement("span");
  span.className = "p-form-help-text";
  span.textContent = value;
  return span;
}

function getSelectedOverlaySectionTitle(): string {
  if (!state.selected) {
    return "Selected Element";
  }

  return state.selected.kind === "logo"
    ? "Selected Logo"
    : `Selected ${getOverlayFieldDisplayLabel(state.params, state.selected.id)}`;
}

function getSelectedTextField(): TextFieldPlacementSpec | null {
  if (state.selected?.kind !== "text") {
    return null;
  }

  return state.params.textFields.find((field) => field.id === state.selected?.id) ?? null;
}

function applySelectedTextStyle(styleKey: string) {
  const selectedField = getSelectedTextField();
  if (!selectedField || selectedField.styleKey === styleKey) {
    return;
  }

  updateTextField(selectedField.id, (field) => ({ ...field, styleKey }));
  buildConfigEditor();
  void renderStage();
}

// ── Content format section

function buildContentFormatSection(): HTMLElement {
  const { root, body } = buildSectionEl("Content Format");

  body.append(createFormGroup("Format",
    createSelectInput(
      state.contentFormatKey,
      OVERLAY_CONTENT_FORMAT_ORDER.map(k => ({
        label: OVERLAY_CONTENT_FORMATS[k].label,
        value: k
      })),
      (v) => {
        switchContentFormat(v);
        buildConfigEditor();
        void renderStage();
      }
    )
  ));

  body.append(createFormGroup("Content Source",
    createSelectInput(
      getContentSource(),
      [{ label: "Inline text", value: "inline" }, { label: "CSV", value: "csv" }],
      (v) => {
        state.params = { ...state.params, contentSource: v as OverlayContentSource };
        buildConfigEditor();
        void renderStage();
      }
    )
  ));

  if (getContentSource() === "csv") {
    const effectiveParams = getEffectiveParams();
    const csvSummary = inspectOverlayCsvDraft(effectiveParams);
    const appliedCsvSummary = inspectOverlayCsvDraft(state.params);
    const formatSpec = OVERLAY_CONTENT_FORMATS[state.contentFormatKey];

    const textarea = document.createElement("textarea");
    textarea.className = "p-form-validation__input is-dense control-inline-text";
    textarea.rows = 5;
    textarea.value = getStagedCsvDraft() ?? state.params.csvContent?.draft ?? "";
    textarea.addEventListener("input", () => { setStagedCsvDraft(textarea.value); });
    body.append(createFormGroup("CSV Data", textarea));

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:0.5rem;margin-top:0.25rem;";

    const applyBtn = document.createElement("button");
    applyBtn.className = "p-button is-dense";
    applyBtn.textContent = "Apply CSV";
    applyBtn.disabled = !hasStagedCsvDraft();
    applyBtn.addEventListener("click", () => { applyStagedCsvDraft(); buildConfigEditor(); void renderStage(); });

    const discardBtn = document.createElement("button");
    discardBtn.className = "p-button--base is-dense";
    discardBtn.textContent = "Discard";
    discardBtn.disabled = !hasStagedCsvDraft();
    discardBtn.addEventListener("click", () => { discardStagedCsvDraft(); buildConfigEditor(); void renderStage(); });

    actions.append(applyBtn, discardBtn);
    body.append(actions);

    body.append(createFormGroup("CSV Row",
      createNumberInput(
        state.params.csvContent?.rowIndex ?? 1,
        { min: 1, step: 1 },
        (v) => {
          state.params = {
            ...state.params,
            csvContent: { draft: state.params.csvContent?.draft ?? "", rowIndex: Math.max(1, Math.round(v)) }
          };
          void renderStage();
        }
      )
    ));

    const csvStatus = document.createElement("p");
    csvStatus.className = "p-form-help-text control-help";
    csvStatus.textContent = csvSummary.selectedRowExists
      ? `${csvSummary.rowCount} row(s) loaded. Editing row ${csvSummary.selectedRowIndex}.`
      : `No CSV row ${csvSummary.selectedRowIndex} exists yet. ${csvSummary.rowCount} row(s) loaded.`;
    body.append(csvStatus);

    if (csvSummary.hasUnterminatedQuote) {
      const warning = document.createElement("p");
      warning.className = "p-form-help-text control-help";
      warning.textContent = "CSV draft has an unterminated quoted field.";
      body.append(warning);
    }

    if (hasStagedCsvDraft()) {
      const pending = document.createElement("p");
      pending.className = "p-form-help-text control-help";
      pending.textContent = "Staged CSV changes are pending for this profile and format until you apply them.";
      body.append(pending);
    }

    const fieldStatusList = document.createElement("div");
    fieldStatusList.className = "style-palette";

    for (const fieldSpec of formatSpec.fields) {
      const field = state.params.textFields.find((candidate) => {
        const contentFieldId = candidate.contentFieldId?.trim();
        return candidate.id === fieldSpec.id || contentFieldId === fieldSpec.id;
      });

      const statusCard = document.createElement("div");
      statusCard.className = "style-palette__button";

      const label = document.createElement("span");
      label.className = "style-palette__label";
      label.textContent = fieldSpec.label;

      const isMapped = !csvSummary.missingFieldKeys.includes(fieldSpec.id);
      const appliedValue = field ? resolveOverlayTextValue(state.params, field) : "";
      const effectiveValue = field ? resolveOverlayTextValue(effectiveParams, field) : "";
      const isPending = hasStagedCsvDraft() && effectiveValue !== appliedValue;

      const meta = document.createElement("span");
      meta.className = "style-palette__meta";
      meta.textContent = isMapped
        ? (isPending ? "Mapped via CSV alias, staged changes pending" : "Mapped via CSV alias")
        : "No matching CSV header found";

      const value = document.createElement("span");
      value.className = "style-palette__meta";
      value.textContent = isPending
        ? `Pending: ${effectiveValue || "(empty)"} | Applied: ${appliedValue || "(empty)"}`
        : `Value: ${effectiveValue || "(empty)"}`;

      statusCard.append(label, meta, value);
      fieldStatusList.append(statusCard);
    }

    body.append(fieldStatusList);
  }

  return root;
}

// ── Selected overlay item

function buildOverlaySection(): HTMLElement {
  const { root, body } = buildSectionEl(getSelectedOverlaySectionTitle());

  body.append(createOverlayItemActionRow());

  if (!state.selected) {
    const p = document.createElement("p");
    p.className = "p-form-help-text";
    p.textContent = "Click a text block or logo in the stage to select it.";
    body.append(p);
    return root;
  }

  if (state.selected.kind === "text") {
    const field = getSelectedTextField();
    if (!field) return root;
    const selectedStyle = state.params.textStyles.find((style) => style.key === field.styleKey);

    body.append(createFormGroup("Label", createReadonlySpan(getOverlayFieldDisplayLabel(state.params, field.id))));
    body.append(createFormGroup("ID", createReadonlySpan(field.id)));

    body.append(createFormGroup("Style",
      createSelectInput(
        field.styleKey,
        state.params.textStyles.map((style) => ({
          label: getOverlayStyleDisplayLabel(style.key),
          value: style.key
        })),
        (value) => {
          applySelectedTextStyle(value);
        }
      )
    ));

    if (selectedStyle) {
      const styleGrid = document.createElement("div");
      styleGrid.className = "grid-row";

      styleGrid.append(wrapCol(1, createFormGroup("Font Size",
        createNumberInput(selectedStyle.fontSizePx, { min: 1, max: 512, step: 1 }, (value) => {
          updateTextStyle(selectedStyle.key, (style) => ({ ...style, fontSizePx: value }));
          if (selectedStyle.key === "title" && state.params.logo?.linkTitleSizeToHeight !== false) {
            syncLogoToTitleFontSize(value);
          }
          buildConfigEditor();
          void renderStage();
        })
      )));

      styleGrid.append(wrapCol(1, createFormGroup("Line Height",
        createNumberInput(selectedStyle.lineHeightPx, { min: 1, max: 512, step: 1 }, (value) => {
          updateTextStyle(selectedStyle.key, (style) => ({ ...style, lineHeightPx: value }));
          buildConfigEditor();
          void renderStage();
        })
      )));

      styleGrid.append(wrapCol(1, createFormGroup("Weight",
        createNumberInput(selectedStyle.fontWeight ?? 400, { min: 100, max: 900, step: 100 }, (value) => {
          updateTextStyle(selectedStyle.key, (style) => ({ ...style, fontWeight: value }));
          buildConfigEditor();
          void renderStage();
        })
      )));

      body.append(styleGrid);
    }

    if (getContentSource() === "inline") {
      const textarea = document.createElement("textarea");
      textarea.className = "p-form-validation__input is-dense control-inline-text";
      textarea.rows = 3;
      textarea.value = getResolvedTextFieldText(field);
      textarea.addEventListener("input", () => {
        updateSelectedTextValue(field.id, textarea.value);
        void renderStage();
      });
      body.append(createFormGroup(`${getOverlayFieldDisplayLabel(state.params, field.id)} Text`, textarea));
    }

    const grid = document.createElement("div");
    grid.className = "grid-row";

    grid.append(wrapCol(1, createFormGroup("Keyline",
      createNumberInput(field.keylineIndex, { min: 1, max: 24, step: 1 }, v => {
        updateTextField(field.id, f => ({ ...f, keylineIndex: v })); void renderStage();
      })
    )));

    grid.append(wrapCol(1, createFormGroup("Row",
      createNumberInput(field.rowIndex, { min: 1, max: 24, step: 1 }, v => {
        updateTextField(field.id, f => ({ ...f, rowIndex: v })); void renderStage();
      })
    )));

    grid.append(wrapCol(1, createFormGroup("Y Offset",
      createNumberInput(getDisplayedTextFieldOffsetBaselines(field), { min: -200, max: 500, step: 1 }, v => {
        updateTextField(field.id, f => ({ ...f, offsetBaselines: v })); void renderStage();
      })
    )));

    grid.append(wrapCol(1, createFormGroup("Span",
      createNumberInput(field.columnSpan, { min: 1, max: 24, step: 1 }, v => {
        updateTextField(field.id, f => ({ ...f, columnSpan: v })); void renderStage();
      })
    )));

    body.append(grid);
  }

  if (state.selected.kind === "logo") {
    const logo = state.params.logo;
    if (!logo) return root;

    const assetInput = document.createElement("input");
    assetInput.className = "p-form-validation__input is-dense";
    assetInput.type = "text";
    assetInput.value = logo.assetPath ?? "";
    assetInput.placeholder = "/assets/UbuntuTagLogo.svg";
    assetInput.addEventListener("change", () => {
      const nextAssetPath = assetInput.value.trim();
      updateLogo((currentLogo) => {
        const nextLogo = { ...currentLogo };
        if (nextAssetPath) {
          nextLogo.assetPath = nextAssetPath;
        } else {
          delete nextLogo.assetPath;
        }
        return nextLogo;
      });
      void loadLogoIntrinsicDimensions(nextAssetPath);
      buildConfigEditor();
      void renderStage();
    });
    body.append(createFormGroup("Asset Path", assetInput));

    body.append(createFormGroup("Lock A Head to Logo",
      createCheckboxInput(logo.linkTitleSizeToHeight !== false, (checked) => {
        updateLogo((currentLogo) => ({
          ...currentLogo,
          linkTitleSizeToHeight: checked
        }));
        if (checked) {
          const titleStyle = state.params.textStyles.find((style) => style.key === "title");
          if (titleStyle) {
            syncLogoToTitleFontSize(titleStyle.fontSizePx);
          }
        }
        buildConfigEditor();
        void renderStage();
      })
    ));

    const grid = document.createElement("div");
    grid.className = "grid-row";

    grid.append(wrapCol(1, createFormGroup("X",
      createNumberInput(logo.xPx, { step: 1 }, v => { updateLogo(l => ({ ...l, xPx: v })); void renderStage(); })
    )));

    grid.append(wrapCol(1, createFormGroup("Y",
      createNumberInput(logo.yPx, { step: 1 }, v => { updateLogo(l => ({ ...l, yPx: v })); void renderStage(); })
    )));

    const widthInput = createNumberInput(logo.widthPx, { min: 1, step: 1 }, v => {
      const aspectRatio = logo.widthPx > 0 && logo.heightPx > 0 ? logo.widthPx / logo.heightPx : getCurrentLogoAspectRatio();
      const nextHeightPx = Math.max(1, Math.round(v / Math.max(0.0001, aspectRatio)));
      if (logo.linkTitleSizeToHeight === false) {
        updateLogoSizeWithAspectRatio(nextHeightPx);
      } else {
        syncTitleToLogoHeight(nextHeightPx);
      }
      void renderStage();
    });
    widthInput.title = logo.linkTitleSizeToHeight === false
      ? "Width preserves the logo aspect ratio."
      : "Derived from the locked A Head to logo scale.";

    grid.append(wrapCol(1, createFormGroup("Width",
      widthInput
    )));

    grid.append(wrapCol(1, createFormGroup("Height",
      createNumberInput(logo.heightPx, { min: 1, step: 1 }, v => {
        if (logo.linkTitleSizeToHeight === false) {
          updateLogoSizeWithAspectRatio(v);
        } else {
          syncTitleToLogoHeight(v);
        }
        void renderStage();
      })
    )));

    body.append(grid);
  }

  return root;
}

// ── Paragraph style palette

function buildParagraphStylesSection(): HTMLElement {
  const { root, body } = buildSectionEl("Paragraph Styles");
  const selectedField = getSelectedTextField();

  if (!selectedField) {
    const help = document.createElement("p");
    help.className = "p-form-help-text";
    help.textContent = state.selected?.kind === "logo"
      ? "Select a text block to assign a paragraph style."
      : "Select a text block on the stage to apply a paragraph style.";
    body.append(help);
    return root;
  }

  const helper = document.createElement("p");
  helper.className = "p-form-help-text control-help";
  helper.textContent = `Apply a paragraph style to ${getOverlayFieldDisplayLabel(state.params, selectedField.id)}.`;
  body.append(helper);

  const palette = document.createElement("div");
  palette.className = "style-palette";

  for (const style of state.params.textStyles) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "style-palette__button";
    button.disabled = selectedField.styleKey === style.key;
    if (selectedField.styleKey === style.key) {
      button.classList.add("is-active");
    }
    button.addEventListener("click", () => {
      applySelectedTextStyle(style.key);
    });

    const label = document.createElement("span");
    label.className = "style-palette__label";
    label.textContent = getOverlayStyleDisplayLabel(style.key);

    const meta = document.createElement("span");
    meta.className = "style-palette__meta";
    meta.textContent = `${style.fontSizePx}px / ${style.lineHeightPx}px / ${style.fontWeight ?? 400}`;

    button.append(label, meta);
    palette.append(button);
  }

  body.append(palette);
  return root;
}

// ── Grid settings

function buildGridSection(): HTMLElement {
  const { root, body } = buildSectionEl("Layout Grid");
  const grid = state.params.grid;

  body.append(createFormGroup("Show overlay", (() => {
    const cb = createCheckboxInput(state.overlayVisible, v => {
      setOverlayVisible(v);
      void renderStage();
    });
    cb.setAttribute("data-overlay-visibility", "");
    return cb;
  })()));

  const fields = document.createElement("div");
  fields.className = "grid-row";

  fields.append(wrapCol(1, createFormGroup("Baseline (px)",
    createNumberInput(grid.baselineStepPx, { min: 1, max: 48, step: 1 }, v => {
      state.params = normalizeParamsTextFieldOffsets({
        ...state.params,
        grid: { ...state.params.grid, baselineStepPx: v }
      });
      buildConfigEditor();
      void renderStage();
    })
  )));

  fields.append(wrapCol(1, createFormGroup("Rows",
    createNumberInput(grid.rowCount, { min: 1, max: 24, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, rowCount: v } }; void renderStage();
    })
  )));

  fields.append(wrapCol(1, createFormGroup("Columns",
    createNumberInput(grid.columnCount, { min: 1, max: 24, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, columnCount: v } }; void renderStage();
    })
  )));

  fields.append(wrapCol(1, createFormGroup("Row Gutter",
    createNumberInput(grid.rowGutterBaselines, { min: 0, max: 48, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, rowGutterBaselines: v } }; void renderStage();
    })
  )));

  fields.append(wrapCol(1, createFormGroup("Col Gutter",
    createNumberInput(grid.columnGutterBaselines, { min: 0, max: 24, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, columnGutterBaselines: v } }; void renderStage();
    })
  )));

  body.append(fields);

  const margins = document.createElement("div");
  margins.className = "grid-row";

  margins.append(wrapCol(1, createFormGroup("Top Margin",
    createNumberInput(grid.marginTopBaselines, { min: 0, max: 48, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, marginTopBaselines: v } }; void renderStage();
    })
  )));

  margins.append(wrapCol(1, createFormGroup("Bottom Margin",
    createNumberInput(grid.marginBottomBaselines, { min: 0, max: 48, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, marginBottomBaselines: v } }; void renderStage();
    })
  )));

  margins.append(wrapCol(1, createFormGroup("Left Margin",
    createNumberInput(grid.marginLeftBaselines, { min: 0, max: 48, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, marginLeftBaselines: v } }; void renderStage();
    })
  )));

  margins.append(wrapCol(1, createFormGroup("Right Margin",
    createNumberInput(grid.marginRightBaselines, { min: 0, max: 48, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, marginRightBaselines: v } }; void renderStage();
    })
  )));

  body.append(margins);

  body.append(createFormGroup("Fit Within Safe Area",
    createCheckboxInput(grid.fitWithinSafeArea ?? true, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, fitWithinSafeArea: v } };
      buildConfigEditor();
      void renderStage();
    })
  ));

  if (grid.fitWithinSafeArea !== false) {
    const safeArea = state.params.safeArea;
    const safeFields = document.createElement("div");
    safeFields.className = "grid-row";

    safeFields.append(wrapCol(1, createFormGroup("Safe Top",
      createNumberInput(safeArea.top, { min: 0, step: 1 }, v => {
        state.params = { ...state.params, safeArea: { ...safeArea, top: v } }; void renderStage();
      })
    )));

    safeFields.append(wrapCol(1, createFormGroup("Safe Right",
      createNumberInput(safeArea.right, { min: 0, step: 1 }, v => {
        state.params = { ...state.params, safeArea: { ...safeArea, right: v } }; void renderStage();
      })
    )));

    safeFields.append(wrapCol(1, createFormGroup("Safe Bottom",
      createNumberInput(safeArea.bottom, { min: 0, step: 1 }, v => {
        state.params = { ...state.params, safeArea: { ...safeArea, bottom: v } }; void renderStage();
      })
    )));

    safeFields.append(wrapCol(1, createFormGroup("Safe Left",
      createNumberInput(safeArea.left, { min: 0, step: 1 }, v => {
        state.params = { ...state.params, safeArea: { ...safeArea, left: v } }; void renderStage();
      })
    )));

    body.append(safeFields);
  }

  body.append(createFormGroup("Guides",
    createSelectInput(state.guideMode,
      [{ label: "Off", value: "off" }, { label: "Composition Grid", value: "composition" }, { label: "Baseline Grid", value: "baseline" }],
      (v) => { state.guideMode = v as GuideMode; void renderStage(); }
    )
  ));

  return root;
}

// ── Halo field config

function buildHaloConfigSection(): HTMLElement {
  const { root, body } = buildSectionEl("Halo Field");
  const hc = state.haloConfig;

  const compositionFields = document.createElement("div");
  compositionFields.className = "grid-row";

  compositionFields.append(wrapCol(1, createFormGroup("Scale",
    createSliderInput(hc.composition.scale, { min: 0.1, max: 2, step: 0.01 }, v => {
      state.haloConfig = { ...hc, composition: { ...hc.composition, scale: v } }; void renderStage();
    })
  )));

  compositionFields.append(wrapCol(1, createFormGroup("Radial Scale",
    createSliderInput(hc.composition.radial_scale, { min: 0.1, max: 2, step: 0.01 }, v => {
      state.haloConfig = { ...hc, composition: { ...hc.composition, radial_scale: v } }; void renderStage();
    })
  )));

  compositionFields.append(wrapCol(1, createFormGroup("Inner Radius",
    createSliderInput(hc.generator_wrangle.inner_radius, { min: 0, max: 1, step: 0.001 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, inner_radius: v } }; void renderStage();
    })
  )));

  compositionFields.append(wrapCol(1, createFormGroup("Outer Radius",
    createSliderInput(hc.generator_wrangle.outer_radius, { min: 0, max: 1, step: 0.001 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, outer_radius: v } }; void renderStage();
    })
  )));

  body.append(compositionFields);

  const generatorFields = document.createElement("div");
  generatorFields.className = "grid-row";

  generatorFields.append(wrapCol(1, createFormGroup("Spokes",
    createNumberInput(hc.generator_wrangle.spoke_count, { min: 4, max: 120, step: 1 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, spoke_count: Math.round(v) } }; void renderStage();
    })
  )));

  generatorFields.append(wrapCol(1, createFormGroup("Orbits",
    createNumberInput(hc.generator_wrangle.num_orbits, { min: 1, max: 16, step: 1 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, num_orbits: Math.round(v) } }; void renderStage();
    })
  )));

  generatorFields.append(wrapCol(1, createFormGroup("Min Active Orbits",
    createNumberInput(hc.generator_wrangle.min_active_orbits, { min: 1, max: 16, step: 1 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, min_active_orbits: Math.round(v) } }; void renderStage();
    })
  )));

  generatorFields.append(wrapCol(1, createFormGroup("Phase Count",
    createNumberInput(hc.generator_wrangle.phase_count, { min: 1, max: 6, step: 1 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, phase_count: Math.round(v) } }; void renderStage();
    })
  )));

  body.append(generatorFields);

  const angleFields = document.createElement("div");
  angleFields.className = "grid-row";

  angleFields.append(wrapCol(1, createFormGroup("Base Angle",
    createSliderInput(hc.generator_wrangle.base_angle_deg, { min: -180, max: 180, step: 0.1 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, base_angle_deg: v } }; void renderStage();
    })
  )));

  angleFields.append(wrapCol(1, createFormGroup("Pattern Offset",
    createNumberInput(hc.generator_wrangle.pattern_offset_spokes, { min: -120, max: 120, step: 1 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, pattern_offset_spokes: Math.round(v) } }; void renderStage();
    })
  )));

  angleFields.append(wrapCol(1, createFormGroup("Start Radius",
    createSliderInput(hc.spoke_lines.start_radius_px, { min: 0, max: 400, step: 1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, start_radius_px: v } }; void renderStage();
    })
  )));

  angleFields.append(wrapCol(1, createFormGroup("End Radius Extra",
    createSliderInput(hc.spoke_lines.end_radius_extra_px, { min: 0, max: 400, step: 1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, end_radius_extra_px: v } }; void renderStage();
    })
  )));

  body.append(angleFields);

  /* colors row */
  const colorFields = document.createElement("div");
  colorFields.className = "grid-row";

  for (const [label, getValue, setValue] of [
    ["Background", () => hc.composition.background_color,
      (v: string) => { state.haloConfig = { ...hc, composition: { ...hc.composition, background_color: v } }; }],
    ["Dot Color", () => hc.point_style.color,
      (v: string) => { state.haloConfig = { ...hc, point_style: { ...hc.point_style, color: v } }; }],
    ["Construction", () => hc.spoke_lines.construction_color,
      (v: string) => { state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, construction_color: v } }; }],
    ["Reference", () => hc.spoke_lines.reference_color,
      (v: string) => { state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, reference_color: v } }; }],
    ["Spoke Color", () => hc.spoke_lines.color,
      (v: string) => { state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, color: v } }; }],
    ["Echo Color", () => hc.spoke_lines.echo_color,
      (v: string) => { state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_color: v } }; }]
  ] as const) {
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "control-color";
    colorInput.value = (getValue as () => string)();
    colorInput.addEventListener("input", () => {
      (setValue as (v: string) => void)(colorInput.value);
      void renderStage();
    });
    colorFields.append(wrapCol(1, createFormGroup(label as string, colorInput)));
  }

  body.append(colorFields);

  /* spoke details row */
  const spokeDetails = document.createElement("div");
  spokeDetails.className = "grid-row";

  spokeDetails.append(wrapCol(1, createFormGroup("Spoke Width",
    createSliderInput(hc.spoke_lines.width_px, { min: 0, max: 16, step: 0.5 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, width_px: v } }; void renderStage();
    })
  )));

  spokeDetails.append(wrapCol(1, createFormGroup("Echo Count",
    createNumberInput(hc.spoke_lines.echo_count, { min: 0, max: 32, step: 1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_count: Math.round(v) } }; void renderStage();
    })
  )));

  spokeDetails.append(wrapCol(1, createFormGroup("Echo Style",
    createSelectInput(hc.spoke_lines.echo_style,
      [
        { label: "Mixed", value: "mixed" },
        { label: "Dots", value: "dots" },
        { label: "Plus", value: "plus" },
        { label: "Triangles", value: "triangles" },
        { label: "Diamond", value: "diamond" },
        { label: "Star", value: "star" },
        { label: "Hexagon", value: "hexagon" },
        { label: "Radial Dash", value: "radial_dash" }
      ],
      (v) => { state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_style: v } }; void renderStage(); }
    )
  )));

  spokeDetails.append(wrapCol(1, createFormGroup("Phase Width",
    createSliderInput(hc.spoke_lines.phase_start_width_px, { min: 0, max: 32, step: 1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, phase_start_width_px: v } }; void renderStage();
    })
  )));

  body.append(spokeDetails);

  /* echo shape details row */
  const echoDetails = document.createElement("div");
  echoDetails.className = "grid-row";

  echoDetails.append(wrapCol(1, createFormGroup("Phase End Width",
    createSliderInput(hc.spoke_lines.phase_end_width_px, { min: 0, max: 32, step: 1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, phase_end_width_px: v } }; void renderStage();
    })
  )));

  echoDetails.append(wrapCol(1, createFormGroup("Echo Stroke",
    createSliderInput(hc.spoke_lines.echo_marker_stroke_px, { min: 0, max: 12, step: 0.5 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_marker_stroke_px: v } }; void renderStage();
    })
  )));

  echoDetails.append(wrapCol(1, createFormGroup("Echo Scale",
    createSliderInput(hc.spoke_lines.echo_marker_scale_mult, { min: 0.1, max: 6, step: 0.1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_marker_scale_mult: v } }; void renderStage();
    })
  )));

  echoDetails.append(wrapCol(1, createFormGroup("Sparse Boost",
    createSliderInput(hc.spoke_lines.echo_sparse_scale_boost, { min: 0, max: 6, step: 0.1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_sparse_scale_boost: v } }; void renderStage();
    })
  )));

  body.append(echoDetails);

  /* echo pattern details row */
  const echoPatternDetails = document.createElement("div");
  echoPatternDetails.className = "grid-row";

  echoPatternDetails.append(wrapCol(1, createFormGroup("Shape Seed",
    createNumberInput(hc.spoke_lines.echo_shape_seed, { min: 0, max: 9999, step: 1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_shape_seed: Math.round(v) } }; void renderStage();
    })
  )));

  echoPatternDetails.append(wrapCol(1, createFormGroup("Mix Shape %",
    createSliderInput(hc.spoke_lines.echo_mix_shape_pct, { min: 0, max: 1, step: 0.01 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_mix_shape_pct: v } }; void renderStage();
    })
  )));

  echoPatternDetails.append(wrapCol(1, createFormGroup("Ripple Count",
    createSliderInput(hc.spoke_lines.echo_wave_count, { min: 0, max: 12, step: 1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_wave_count: Math.round(v) } }; void renderStage();
    })
  )));

  echoPatternDetails.append(wrapCol(1, createFormGroup("Echo Fade",
    createSliderInput(hc.spoke_lines.echo_opacity_mult, { min: 0, max: 1, step: 0.01 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_opacity_mult: v } }; void renderStage();
    })
  )));

  body.append(echoPatternDetails);

  const screensaverDetails = document.createElement("div");
  screensaverDetails.className = "grid-row";

  screensaverDetails.append(wrapCol(1, createFormGroup("Breath Cycle",
    createSliderInput(hc.screensaver?.cycle_sec ?? 60, { min: 0, max: 60, step: 0.1 }, v => {
      state.haloConfig = { ...hc, screensaver: { ...hc.screensaver!, cycle_sec: v } }; void renderStage();
    })
  )));

  screensaverDetails.append(wrapCol(1, createFormGroup("Breath Ramp In",
    createSliderInput(hc.screensaver?.ramp_in_sec ?? 0.6, { min: 0, max: 60, step: 0.1 }, v => {
      state.haloConfig = { ...hc, screensaver: { ...hc.screensaver!, ramp_in_sec: v } }; void renderStage();
    })
  )));

  screensaverDetails.append(wrapCol(1, createFormGroup("Min Spokes",
    createSliderInput(hc.screensaver?.min_spoke_count ?? 24, { min: 1, max: 180, step: 1 }, v => {
      state.haloConfig = { ...hc, screensaver: { ...hc.screensaver!, min_spoke_count: Math.round(v) } }; void renderStage();
    })
  )));

  screensaverDetails.append(wrapCol(1, createFormGroup("Boundary Ease",
    createSliderInput(hc.screensaver?.phase_boundary_transition_sec ?? 0.35, { min: 0, max: 1.5, step: 0.01 }, v => {
      state.haloConfig = { ...hc, screensaver: { ...hc.screensaver!, phase_boundary_transition_sec: v } }; void renderStage();
    })
  )));

  body.append(screensaverDetails);

  /* pulse checkboxes */
  body.append(createFormGroup("Pulse Orbits",
    createCheckboxInput(hc.screensaver?.pulse_orbits ?? false, v => {
      state.haloConfig = { ...hc, screensaver: { ...hc.screensaver!, pulse_orbits: v } }; void renderStage();
    })
  ));

  body.append(createFormGroup("Pulse Spokes",
    createCheckboxInput(hc.screensaver?.pulse_spokes ?? false, v => {
      state.haloConfig = { ...hc, screensaver: { ...hc.screensaver!, pulse_spokes: v } }; void renderStage();
    })
  ));

  /* release labels (spoke_text) */
  body.append(createFormGroup("Show Release Labels",
    createCheckboxInput(hc.spoke_text?.enabled ?? false, v => {
      state.haloConfig = { ...hc, spoke_text: { ...hc.spoke_text!, enabled: v } }; void renderStage();
    })
  ));

  if (hc.spoke_text?.enabled) {
    const labelFields = document.createElement("div");
    labelFields.className = "grid-row";

    labelFields.append(wrapCol(1, createFormGroup("Label Size",
      createSliderInput(hc.spoke_text.font_size_px, { min: 3, max: 24, step: 0.5 }, v => {
        state.haloConfig = { ...hc, spoke_text: { ...hc.spoke_text!, font_size_px: v } }; void renderStage();
      })
    )));

    labelFields.append(wrapCol(1, createFormGroup("Label Position",
      createSliderInput(hc.spoke_text.radial_u, { min: 0, max: 1, step: 0.01 }, v => {
        state.haloConfig = { ...hc, spoke_text: { ...hc.spoke_text!, radial_u: v } }; void renderStage();
      })
    )));

    body.append(labelFields);
  }

  /* debug overlays */
  body.append(createFormGroup("Show Reference Halo",
    createCheckboxInput(hc.spoke_lines.show_reference_halo, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, show_reference_halo: v } }; void renderStage();
    })
  ));

  body.append(createFormGroup("Show Debug Masks",
    createCheckboxInput(hc.spoke_lines.show_debug_masks, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, show_debug_masks: v } }; void renderStage();
    })
  ));

  return root;
}

// ─── DOM authoring layer ──────────────────────────────────────────────

function createAuthoringBox(className: string): { box: HTMLElement; label: HTMLElement } {
  const box = document.createElement("div");
  box.className = className;
  box.hidden = true;

  const label = document.createElement("div");
  label.className = "stage__authoring-box-label";
  box.appendChild(label);

  return { box, label };
}

function initAuthoringLayer() {
  const layer = $<HTMLElement>("[data-authoring-layer]");
  if (!layer) return;

  const hover = createAuthoringBox("stage__authoring-box is-hover");
  authoringHoverBox = hover.box;
  authoringHoverLabel = hover.label;

  const selected = createAuthoringBox("stage__authoring-box is-selected");
  authoringSelectedBox = selected.box;
  authoringSelectedLabel = selected.label;

  // Resize handles on selected box
  const edges: ResizeEdge[] = ["nw", "ne", "sw", "se", "e", "w"];
  for (const edge of edges) {
    const handle = document.createElement("div");
    handle.className = `stage__authoring-handle stage__authoring-handle--${edge}`;
    handle.dataset.resizeEdge = edge;
    authoringSelectedBox.appendChild(handle);
    authoringHandles.set(edge, handle);
  }

  authoringBaselineGuide = document.createElement("div");
  authoringBaselineGuide.className = "stage__authoring-baseline-guide";
  authoringBaselineGuide.hidden = true;

  layer.append(authoringHoverBox, authoringSelectedBox, authoringBaselineGuide);
}

interface OverlayItemBounds {
  id: string;
  kind: "text" | "logo";
  label: string;
  leftPx: number;
  topPx: number;
  widthPx: number;
  heightPx: number;
  rightPx: number;
  bottomPx: number;
  left: number;
  top: number;
  width: number;
  height: number;
  baselineYPx?: number | undefined;
}

function getOverlayItemBounds(): OverlayItemBounds[] {
  if (!currentScene) return [];
  const items: OverlayItemBounds[] = [];
  const { widthPx, heightPx } = state.params.frame;
  const grid = currentScene.grid;
  const rowStepPx = grid.rowHeightPx + grid.rowGutterPx;

  for (const text of currentScene.texts) {
    const b = text.bounds;
    const authoringWidthPx = Math.max(text.maxWidthPx, b.width);
    const rowTopPx = grid.contentTopPx + (text.rowIndex - 1) * rowStepPx;
    const authoringTopPx = Math.min(rowTopPx, b.top);
    const authoringHeightPx = Math.max(text.lineHeightPx, b.bottom - authoringTopPx);
    items.push({
      id: text.id,
      kind: "text",
      label: getOverlayFieldDisplayLabel(state.params, text.id),
      leftPx: b.left,
      topPx: authoringTopPx,
      widthPx: authoringWidthPx,
      heightPx: authoringHeightPx,
      rightPx: b.left + authoringWidthPx,
      bottomPx: authoringTopPx + authoringHeightPx,
      left: b.left / widthPx * 100,
      top: authoringTopPx / heightPx * 100,
      width: authoringWidthPx / widthPx * 100,
      height: authoringHeightPx / heightPx * 100,
      baselineYPx: text.anchorBaselineYPx
    });
  }

  const logo = currentScene.logo;
  if (logo) {
    items.push({
      id: logo.id,
      kind: "logo",
      label: "Selected Logo",
      leftPx: logo.bounds.left,
      topPx: logo.bounds.top,
      widthPx: logo.bounds.width,
      heightPx: logo.bounds.height,
      rightPx: logo.bounds.right,
      bottomPx: logo.bounds.bottom,
      left: logo.bounds.left / widthPx * 100,
      top: logo.bounds.top / heightPx * 100,
      width: logo.bounds.width / widthPx * 100,
      height: logo.bounds.height / heightPx * 100
    });
  }

  return items;
}

function positionBox(box: HTMLElement, label: HTMLElement, item: OverlayItemBounds) {
  box.hidden = false;
  box.style.left = `${item.left}%`;
  box.style.top = `${item.top}%`;
  box.style.width = `${item.width}%`;
  box.style.height = `${item.height}%`;
  label.textContent = item.label;
}

function getSelectedOverlayItemBounds(items: OverlayItemBounds[]): OverlayItemBounds | null {
  if (!state.selected) return null;
  return items.find(item => item.id === state.selected?.id) ?? null;
}

function getResizeCursor(edge: ResizeEdge): string {
  switch (edge) {
    case "e":
    case "w":
      return "ew-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
    case "nw":
    case "se":
      return "nwse-resize";
  }
}

function setDocumentSelectionSuppressed(suppressed: boolean) {
  const value = suppressed ? "none" : "";
  document.body.style.userSelect = value;
  document.body.style.webkitUserSelect = value;
}

function renderAuthoringUI() {
  syncOverlayVisibilityUi();

  if (!state.overlayVisible) {
    if (authoringHoverBox) authoringHoverBox.hidden = true;
    if (authoringSelectedBox) authoringSelectedBox.hidden = true;
    if (authoringBaselineGuide) authoringBaselineGuide.hidden = true;

    const stage = getStageEl();
    if (stage) {
      stage.style.cursor = "";
    }
    return;
  }

  const items = getOverlayItemBounds();
  const { heightPx } = state.params.frame;

  // Hover box
  if (authoringHoverBox && authoringHoverLabel) {
    const hoverItem = hoverId ? items.find(i => i.id === hoverId) : undefined;
    const selectedId = state.selected ? (state.selected.kind === "text" ? state.selected.id : state.selected.id) : null;
    if (hoverItem && hoverItem.id !== selectedId) {
      positionBox(authoringHoverBox, authoringHoverLabel, hoverItem);
    } else {
      authoringHoverBox.hidden = true;
    }
  }

  // Selected box
  if (authoringSelectedBox && authoringSelectedLabel) {
    const selId = state.selected ? state.selected.id : null;
    const selItem = selId ? items.find(i => i.id === selId) : undefined;
    if (selItem) {
      positionBox(authoringSelectedBox, authoringSelectedLabel, selItem);
    } else {
      authoringSelectedBox.hidden = true;
    }
  }

  // Baseline guide (only during drag of text)
  if (authoringBaselineGuide) {
    if (currentDrag?.hasMoved && currentDrag.selection.kind === "text") {
      const draggedItem = items.find(i => i.id === currentDrag!.selection.id);
      if (draggedItem?.baselineYPx !== undefined) {
        authoringBaselineGuide.hidden = false;
        authoringBaselineGuide.style.top = `${(draggedItem.baselineYPx / heightPx) * 100}%`;
      } else {
        authoringBaselineGuide.hidden = true;
      }
    } else {
      authoringBaselineGuide.hidden = true;
    }
  }

  // Cursor
  const stage = getStageEl();
  if (stage) {
    if (currentDrag?.mode === "resize" && currentDrag.resizeEdge) {
      stage.style.cursor = getResizeCursor(currentDrag.resizeEdge);
    } else if (currentDrag) {
      stage.style.cursor = "grabbing";
    } else if (hoverHandle) {
      stage.style.cursor = getResizeCursor(hoverHandle);
    } else if (hoverId) {
      stage.style.cursor = "grab";
    } else {
      stage.style.cursor = "";
    }
  }
}

// ─── Inline editor ────────────────────────────────────────────────────

function openInlineEditor(fieldId: string) {
  if (!state.overlayVisible) return;
  closeInlineEditor();

  const layer = $<HTMLElement>("[data-authoring-layer]");
  const stage = getStageEl();
  if (!layer || !stage || !currentScene) return;

  const field = state.params.textFields.find(f => f.id === fieldId);
  if (!field) return;

  const text = currentScene.texts.find(t => t.id === fieldId);
  if (!text) return;

  const textStyle = state.params.textStyles.find((style) => style.key === field.styleKey);
  const editorBounds = getOverlayItemBounds().find((item) => item.kind === "text" && item.id === fieldId);
  if (!editorBounds) return;

  const { widthPx, heightPx } = state.params.frame;
  const stageRect = stage.getBoundingClientRect();
  const scaleX = stageRect.width > 0 ? stageRect.width / widthPx : 1;
  const scaleY = stageRect.height > 0 ? stageRect.height / heightPx : 1;
  const typeScale = Math.max(0.1, Math.min(scaleX, scaleY));

  const textarea = document.createElement("textarea");
  textarea.className = "stage__inline-editor";
  textarea.value = getResolvedTextFieldText(field);
  textarea.style.left = `${(editorBounds.leftPx / widthPx) * 100}%`;
  textarea.style.top = `${(editorBounds.topPx / heightPx) * 100}%`;
  textarea.style.width = `${Math.max((editorBounds.widthPx / widthPx) * 100, 15)}%`;
  textarea.style.height = `${Math.max((editorBounds.heightPx / heightPx) * 100, 5)}%`;
  if (textStyle) {
    textarea.style.fontFamily = '"Ubuntu Sans", "Ubuntu", sans-serif';
    textarea.style.fontSize = `${textStyle.fontSizePx * typeScale}px`;
    textarea.style.lineHeight = `${textStyle.lineHeightPx * typeScale}px`;
    textarea.style.fontWeight = String(textStyle.fontWeight ?? 400);
  }
  textarea.style.padding = `${Math.max(4, 8 * typeScale)}px ${Math.max(6, 10 * typeScale)}px`;

  textarea.addEventListener("input", () => {
    updateSelectedTextValue(fieldId, textarea.value);
    void renderStage();
  });

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeInlineEditor();
      e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      closeInlineEditor();
      e.preventDefault();
    }
    e.stopPropagation();
  });

  textarea.addEventListener("blur", () => {
    closeInlineEditor();
  });

  layer.appendChild(textarea);
  editSession = { id: fieldId, element: textarea };

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.select();
  });
}

function closeInlineEditor() {
  if (!editSession) return;
  editSession.element.remove();
  editSession = null;
}

// ─── Pointer event handling ───────────────────────────────────────────

function clientToFrame(clientX: number, clientY: number): { frameX: number; frameY: number } | null {
  const stage = getStageEl();
  if (!stage) return null;

  const rect = stage.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  return {
    frameX: (clientX - rect.left) / rect.width * state.params.frame.widthPx,
    frameY: (clientY - rect.top) / rect.height * state.params.frame.heightPx
  };
}

const HIT_SLOP_PX = 10;
const RESIZE_HANDLE_HIT_RADIUS_PX = 12;
const DRAG_ACTIVATION_DISTANCE_PX = 4;

function hasDragActivationDistance(current: DragState, clientX: number, clientY: number): boolean {
  return Math.hypot(clientX - current.startClientX, clientY - current.startClientY) >= DRAG_ACTIVATION_DISTANCE_PX;
}

function getResizeHandleAtPoint(clientX: number, clientY: number): ResizeEdge | null {
  if (!state.selected) return null;

  const stage = getStageEl();
  if (!stage || !currentScene) return null;

  const selectedItem = getSelectedOverlayItemBounds(getOverlayItemBounds());
  if (!selectedItem) return null;

  const rect = stage.getBoundingClientRect();
  const itemLeft = rect.left + (selectedItem.left / 100) * rect.width;
  const itemTop = rect.top + (selectedItem.top / 100) * rect.height;
  const itemWidth = (selectedItem.width / 100) * rect.width;
  const itemHeight = (selectedItem.height / 100) * rect.height;
  const itemRight = itemLeft + itemWidth;
  const itemBottom = itemTop + itemHeight;
  const itemMidY = itemTop + itemHeight / 2;

  const handlePoints: Array<{ edge: ResizeEdge; x: number; y: number }> = [
    { edge: "nw", x: itemLeft, y: itemTop },
    { edge: "ne", x: itemRight, y: itemTop },
    { edge: "sw", x: itemLeft, y: itemBottom },
    { edge: "se", x: itemRight, y: itemBottom },
    { edge: "w", x: itemLeft, y: itemMidY },
    { edge: "e", x: itemRight, y: itemMidY }
  ];

  for (const handle of handlePoints) {
    const dx = clientX - handle.x;
    const dy = clientY - handle.y;
    if (Math.hypot(dx, dy) <= RESIZE_HANDLE_HIT_RADIUS_PX) {
      return handle.edge;
    }
  }

  return null;
}

function findHitTarget(clientX: number, clientY: number): Selection | null {
  if (!state.overlayVisible) return null;
  const pt = clientToFrame(clientX, clientY);
  if (!pt) return null;
  const { frameX, frameY } = pt;
  const overlayItems = getOverlayItemBounds();

  // Check logo first
  const logo = state.params.logo;
  if (logo) {
    if (
      frameX >= logo.xPx - HIT_SLOP_PX && frameX <= logo.xPx + logo.widthPx + HIT_SLOP_PX &&
      frameY >= logo.yPx - HIT_SLOP_PX && frameY <= logo.yPx + logo.heightPx + HIT_SLOP_PX
    ) {
      return { kind: "logo", id: logo.id ?? "logo" };
    }
  }

  // Check text fields (reverse for z-order)
  if (currentScene) {
    const texts = overlayItems.filter(item => item.kind === "text").reverse();
    for (const text of texts) {
      if (
        frameX >= text.leftPx - HIT_SLOP_PX && frameX <= text.rightPx + HIT_SLOP_PX &&
        frameY >= text.topPx - HIT_SLOP_PX && frameY <= text.bottomPx + HIT_SLOP_PX
      ) {
        return { kind: "text", id: text.id };
      }
    }
  }

  return null;
}

function getFrameDelta(clientX: number, clientY: number): { deltaXPx: number; deltaYPx: number } {
  if (!currentDrag) return { deltaXPx: 0, deltaYPx: 0 };
  const stage = getStageEl();
  if (!stage) return { deltaXPx: 0, deltaYPx: 0 };

  const rect = stage.getBoundingClientRect();
  if (rect.width <= 0) return { deltaXPx: 0, deltaYPx: 0 };

  return {
    deltaXPx: (clientX - currentDrag.startClientX) / rect.width * state.params.frame.widthPx,
    deltaYPx: (clientY - currentDrag.startClientY) / rect.height * state.params.frame.heightPx
  };
}

function handlePointerDown(e: PointerEvent) {
  if (!state.overlayVisible) return;
  if (editSession || e.button !== 0) return;

  const resizeEdge = getResizeHandleAtPoint(e.clientX, e.clientY);
  if (resizeEdge && state.selected && currentScene) {
    const dragState: DragState = {
      selection: state.selected,
      metrics: currentScene.grid,
      startClientX: e.clientX,
      startClientY: e.clientY,
      hasMoved: false,
      mode: "resize",
      resizeEdge
    };
    if (state.selected.kind === "text") {
      dragState.initialField = state.params.textFields.find(f => f.id === state.selected!.id);
    } else if (state.selected.kind === "logo") {
      dragState.initialLogo = state.params.logo ? { ...state.params.logo } : undefined;
    }
    currentDrag = dragState;
    setDocumentSelectionSuppressed(true);
    const stage = getStageEl();
    stage?.setPointerCapture(e.pointerId);
    renderAuthoringUI();
    e.preventDefault();
    return;
  }

  const hit = findHitTarget(e.clientX, e.clientY);
  if (!hit) { select(null); renderAuthoringUI(); return; }

  select(hit);
  if (!currentScene) return;

  const dragState: DragState = {
    selection: hit,
    metrics: currentScene.grid,
    startClientX: e.clientX,
    startClientY: e.clientY,
    hasMoved: false,
    mode: "move"
  };

  if (hit.kind === "text") {
    dragState.initialField = state.params.textFields.find(f => f.id === hit.id);
  } else if (hit.kind === "logo") {
    dragState.initialLogo = state.params.logo ? { ...state.params.logo } : undefined;
  }

  currentDrag = dragState;
  setDocumentSelectionSuppressed(true);
  const stage = getStageEl();
  stage?.setPointerCapture(e.pointerId);
  renderAuthoringUI();
  e.preventDefault();
}

function handlePointerMove(e: PointerEvent) {
  if (!state.overlayVisible) {
    if (hoverId !== null || hoverHandle !== null) {
      hoverId = null;
      hoverHandle = null;
      renderAuthoringUI();
    }
    return;
  }

  if (currentDrag && currentScene) {
    if (!currentDrag.hasMoved) {
      if (!hasDragActivationDistance(currentDrag, e.clientX, e.clientY)) {
        return;
      }
      currentDrag.hasMoved = true;
    }

    const delta = getFrameDelta(e.clientX, e.clientY);

    if (currentDrag.mode === "resize") {
      // Resize mode — adjust columnSpan (text) or dimensions (logo)
      if (currentDrag.selection.kind === "text" && currentDrag.initialField) {
        const metrics = currentDrag.metrics;
        const colW = metrics.columnWidthPx + metrics.columnGutterPx;
        const edge = currentDrag.resizeEdge;
        let horizontalUpdate: Partial<TextFieldPlacementSpec> = {};
        let verticalUpdate: Partial<TextFieldPlacementSpec> = {};

        // Horizontal: adjust columnSpan and/or keylineIndex
        if (edge === "e" || edge === "ne" || edge === "se") {
          const spanDelta = colW > 0 ? Math.round(delta.deltaXPx / colW) : 0;
          const maxSpan = metrics.columnCount - currentDrag.initialField.keylineIndex + 1;
          const newSpan = Math.max(1, Math.min(maxSpan, currentDrag.initialField.columnSpan + spanDelta));
          horizontalUpdate = { columnSpan: newSpan };
        } else if (edge === "w" || edge === "nw" || edge === "sw") {
          const colDelta = colW > 0 ? Math.round(delta.deltaXPx / colW) : 0;
          const newKeyline = Math.max(1, Math.min(
            currentDrag.initialField.keylineIndex + currentDrag.initialField.columnSpan - 1,
            currentDrag.initialField.keylineIndex + colDelta
          ));
          const keylineDiff = newKeyline - currentDrag.initialField.keylineIndex;
          const newSpan = Math.max(1, currentDrag.initialField.columnSpan - keylineDiff);
          horizontalUpdate = { keylineIndex: newKeyline, columnSpan: newSpan };
        }

        // Vertical: north corners adjust rowIndex via grid snap
        if (edge === "ne" || edge === "nw") {
          const rowStepPx = metrics.rowHeightPx + metrics.rowGutterPx;
          const initialRowTopPx = metrics.contentTopPx + (currentDrag.initialField.rowIndex - 1) * rowStepPx;
          const initialBaselineYPx = initialRowTopPx + currentDrag.initialField.offsetBaselines * metrics.baselineStepPx;
          const snapped = snapBaselineToGrid(metrics, initialBaselineYPx + delta.deltaYPx);
          verticalUpdate = { rowIndex: snapped.rowIndex, offsetBaselines: snapped.offsetBaselines };
        }

        updateTextField(currentDrag.selection.id, f => ({ ...f, ...horizontalUpdate, ...verticalUpdate }));
        void renderStage();
      }

      if (currentDrag.selection.kind === "logo" && currentDrag.initialLogo) {
        const il = currentDrag.initialLogo;
        const edge = currentDrag.resizeEdge;
        let newW = il.widthPx;
        let newH = il.heightPx;
        let newX = il.xPx;
        let newY = il.yPx;
        const aspect = il.widthPx / (il.heightPx || 1);

        if (edge === "se" || edge === "e" || edge === "ne") {
          newW = Math.max(16, il.widthPx + delta.deltaXPx);
          if (edge !== "e") newH = newW / aspect;
          if (edge === "ne") newY = il.yPx + il.heightPx - newH;
        } else if (edge === "sw" || edge === "w" || edge === "nw") {
          newW = Math.max(16, il.widthPx - delta.deltaXPx);
          newX = il.xPx + il.widthPx - newW;
          if (edge !== "w") newH = newW / aspect;
          if (edge === "nw") newY = il.yPx + il.heightPx - newH;
        }

        updateLogo(() => ({ ...il, xPx: newX, yPx: newY, widthPx: newW, heightPx: newH }));
        syncTitleToLogoHeight(newH);
        void renderStage();
      }
      e.preventDefault();
    } else {
      // Move mode
      const axisLock: DragAxisLock = e.shiftKey
        ? (Math.abs(delta.deltaXPx) >= Math.abs(delta.deltaYPx) ? "x" : "y")
        : "free";

      if (currentDrag.selection.kind === "text" && currentDrag.initialField) {
        const result = moveTextField(currentDrag.initialField, currentDrag.metrics, { ...delta, axisLock });
        updateTextField(currentDrag.selection.id, () => result);
        void renderStage();
      }

      if (currentDrag.selection.kind === "logo" && currentDrag.initialLogo) {
        const result = moveLogo(currentDrag.initialLogo, { ...delta, axisLock });
        updateLogo(() => result);
        void renderStage();
      }

      e.preventDefault();
    }
  } else {
    const newHoverHandle = getResizeHandleAtPoint(e.clientX, e.clientY);
    const hit = findHitTarget(e.clientX, e.clientY);
    const newHoverId = hit ? hit.id : null;
    if (newHoverId !== hoverId || newHoverHandle !== hoverHandle) {
      hoverId = newHoverId;
      hoverHandle = newHoverHandle;
      renderAuthoringUI();
    }
  }
}

function handlePointerUp(_e: PointerEvent) {
  if (currentDrag) {
    currentDrag = null;
    setDocumentSelectionSuppressed(false);
    buildConfigEditor();
    renderAuthoringUI();
  }
}

function handlePointerCancel() {
  if (currentDrag) {
    currentDrag = null;
    setDocumentSelectionSuppressed(false);
    renderAuthoringUI();
  }
}

function handleDblClick(e: MouseEvent) {
  if (!state.overlayVisible) return;
  const hit = findHitTarget(e.clientX, e.clientY);
  if (hit && hit.kind === "text" && getContentSource() === "inline") {
    openInlineEditor(hit.id);
  }
}

function cycleGuideMode() {
  const idx = GUIDE_MODES.indexOf(state.guideMode);
  state.guideMode = GUIDE_MODES[(idx + 1) % GUIDE_MODES.length];
}

function setDrawerOpen(isOpen: boolean) {
  const toggleBtn = $<HTMLElement>("[data-drawer-toggle]");
  const aside = $<HTMLElement>("[data-control-panel]");

  if (isOpen) {
    aside?.classList.remove("is-collapsed");
    document.body.classList.add("drawer-open");
    toggleBtn?.setAttribute("aria-expanded", "true");
    return;
  }

  aside?.classList.add("is-collapsed");
  document.body.classList.remove("drawer-open");
  toggleBtn?.setAttribute("aria-expanded", "false");
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────

function handleKeyDown(e: KeyboardEvent) {
  if (editSession && e.key === "Escape") {
    closeInlineEditor();
    e.preventDefault();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    void (async () => {
      try {
        await writeCurrentAsSourceDefault();
        setSourceDefaultStatus("Source default saved.", "success");
      } catch {
        setSourceDefaultStatus("Source default save failed.", "error");
      }
    })();
    return;
  }

  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement ||
    e.target instanceof HTMLSelectElement
  ) {
    if (e.key === "Escape") {
      (e.target as HTMLElement).blur();
      e.preventDefault();
    }
    return;
  }

  if (e.key === "g" || e.key === "G" || e.key === "w" || e.key === "W") {
    cycleGuideMode();
    void renderStage();
    return;
  }

  if (e.key === " " || e.key === "Spacebar" || e.key === "p" || e.key === "P") {
    e.preventDefault();
    togglePlayback();
    return;
  }

  if (e.key === "Escape") {
    if (document.body.classList.contains("drawer-open")) {
      setDrawerOpen(false);
      e.preventDefault();
      return;
    }

    if (currentDrag) {
      currentDrag = null;
      setDocumentSelectionSuppressed(false);
      renderAuthoringUI();
      e.preventDefault();
    }
  }
}

// ─── Drawer toggle (mobile) ──────────────────────────────────────────

function setupDrawerToggle() {
  const toggleBtn = $<HTMLElement>("[data-drawer-toggle]");
  const closeBtn = $<HTMLElement>("[data-drawer-close]");
  const backdrop = $<HTMLElement>("[data-drawer-backdrop]");

  toggleBtn?.addEventListener("click", () => {
    const isOpen = toggleBtn.getAttribute("aria-expanded") === "true";
    setDrawerOpen(!isOpen);
  });
  closeBtn?.addEventListener("click", () => setDrawerOpen(false));
  backdrop?.addEventListener("click", () => setDrawerOpen(false));
}

// ─── Button handlers ──────────────────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

function serializeExportSvgMarkup(transparentBackground: boolean): string | null {
  const svg = getSvgOverlay();
  if (!svg) {
    return null;
  }

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(state.params.frame.widthPx));
  clone.setAttribute("height", String(state.params.frame.heightPx));
  clone.setAttribute("viewBox", `0 0 ${state.params.frame.widthPx} ${state.params.frame.heightPx}`);

  if (transparentBackground) {
    clone.querySelectorAll(".safe-area-fill").forEach((node) => node.remove());
  }

  return new XMLSerializer().serializeToString(clone);
}

async function exportComposedFramePng() {
  const stageCanvas = getCanvasEl();
  const textCanvas = getTextOverlayCanvas();
  if (!stageCanvas || !textCanvas) return;

  const { widthPx, heightPx } = state.params.frame;
  const composedCanvas = document.createElement("canvas");
  composedCanvas.width = widthPx;
  composedCanvas.height = heightPx;

  const ctx = composedCanvas.getContext("2d");
  if (!ctx) return;

  if (!state.exportSettings.transparentBackground) {
    ctx.fillStyle = state.haloConfig.composition.background_color || "#202020";
    ctx.fillRect(0, 0, widthPx, heightPx);
  } else {
    ctx.clearRect(0, 0, widthPx, heightPx);
  }

  ctx.drawImage(stageCanvas, 0, 0, widthPx, heightPx);
  ctx.drawImage(textCanvas, 0, 0, widthPx, heightPx);

  const svgMarkup = serializeExportSvgMarkup(state.exportSettings.transparentBackground);
  if (svgMarkup) {
    const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    try {
      const svgImage = await loadImage(svgUrl);
      ctx.drawImage(svgImage, 0, 0, widthPx, heightPx);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  composedCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${state.exportSettings.exportName}_${state.outputProfileKey}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

// ─── Export modal + sequence export ───────────────────────────────────

interface ExportOptions {
  startFrame: number;
  endFrame: number;
  frameRate: number;
}

let exportModalResolve: ((opts: ExportOptions | null) => void) | null = null;

function getDefaultExportEndFrame(): number {
  // Default 10 seconds of animation for the sequence
  return Math.max(1, Math.floor(10 * state.exportSettings.frameRate));
}

function promptForExportOptions(): Promise<ExportOptions | null> {
  return new Promise((resolve) => {
    exportModalResolve = resolve;

    let modal = document.getElementById("export-options-modal") as HTMLDialogElement | null;
    if (!modal) {
      modal = buildExportModal();
      document.body.append(modal);
    }

    // Populate defaults
    const startInput = modal.querySelector<HTMLInputElement>("[data-export-start-frame]");
    const endInput = modal.querySelector<HTMLInputElement>("[data-export-end-frame]");
    const summaryEl = modal.querySelector<HTMLElement>("[data-export-summary]");
    if (startInput) startInput.value = "1";
    if (endInput) endInput.value = String(getDefaultExportEndFrame());
    updateExportSummary(summaryEl, startInput, endInput);

    modal.showModal();
  });
}

function updateExportSummary(
  summaryEl: HTMLElement | null | undefined,
  startInput: HTMLInputElement | null | undefined,
  endInput: HTMLInputElement | null | undefined
) {
  if (!summaryEl || !startInput || !endInput) return;
  const start = parseInt(startInput.value, 10) || 1;
  const end = parseInt(endInput.value, 10) || 1;
  const count = Math.max(0, end - start + 1);
  const fps = state.exportSettings.frameRate;
  const durationSec = count > 0 ? (count / fps).toFixed(2) : "0";
  summaryEl.textContent = `${count} frames at ${fps} fps (${durationSec}s)`;
}

function buildExportModal(): HTMLDialogElement {
  const dialog = document.createElement("dialog");
  dialog.id = "export-options-modal";
  dialog.className = "p-modal";

  dialog.innerHTML = `
    <div class="p-modal__dialog" role="dialog" aria-labelledby="export-modal-title">
      <header class="p-modal__header">
        <h2 class="p-modal__title" id="export-modal-title">Export PNG Sequence</h2>
        <button class="p-modal__close" data-export-cancel type="button">Close</button>
      </header>
      <div class="p-modal__body">
        <div class="p-form__group">
          <label class="p-form__label">Start Frame</label>
          <div class="p-form__control">
            <input type="number" class="p-form-validation__input" data-export-start-frame min="1" step="1" value="1">
          </div>
        </div>
        <div class="p-form__group">
          <label class="p-form__label">End Frame</label>
          <div class="p-form__control">
            <input type="number" class="p-form-validation__input" data-export-end-frame min="1" step="1" value="240">
          </div>
        </div>
        <p class="p-form-help-text" data-export-summary></p>
      </div>
      <footer class="p-modal__footer">
        <button class="p-button--base" type="button" data-export-cancel>Cancel</button>
        <button class="p-button" type="button" data-export-submit>Export</button>
      </footer>
    </div>
  `;

  const startInput = dialog.querySelector<HTMLInputElement>("[data-export-start-frame]");
  const endInput = dialog.querySelector<HTMLInputElement>("[data-export-end-frame]");
  const summaryEl = dialog.querySelector<HTMLElement>("[data-export-summary]");

  const updateSummary = () => updateExportSummary(summaryEl, startInput, endInput);
  startInput?.addEventListener("input", updateSummary);
  endInput?.addEventListener("input", updateSummary);

  dialog.querySelectorAll("[data-export-cancel]").forEach(btn => {
    btn.addEventListener("click", () => {
      dialog.close();
      exportModalResolve?.(null);
      exportModalResolve = null;
    });
  });

  dialog.querySelector("[data-export-submit]")?.addEventListener("click", () => {
    const start = Math.max(1, parseInt(startInput?.value ?? "1", 10) || 1);
    const end = Math.max(start, parseInt(endInput?.value ?? "1", 10) || 1);
    dialog.close();
    exportModalResolve?.({ startFrame: start, endFrame: end, frameRate: state.exportSettings.frameRate });
    exportModalResolve = null;
  });

  dialog.addEventListener("close", () => {
    if (exportModalResolve) {
      exportModalResolve(null);
      exportModalResolve = null;
    }
  });

  return dialog;
}

async function composeFrameToCanvas(timeSec: number): Promise<HTMLCanvasElement | null> {
  const stageCanvas = getCanvasEl();
  const textCanvas = getTextOverlayCanvas();
  if (!stageCanvas || !textCanvas) return null;

  // Set time and render the halo frame
  state.playbackTimeSec = timeSec;
  renderHaloFrame();
  await renderStage();

  const { widthPx, heightPx } = state.params.frame;
  const composedCanvas = document.createElement("canvas");
  composedCanvas.width = widthPx;
  composedCanvas.height = heightPx;

  const ctx = composedCanvas.getContext("2d");
  if (!ctx) return null;

  if (!state.exportSettings.transparentBackground) {
    ctx.fillStyle = state.haloConfig.composition.background_color || "#202020";
    ctx.fillRect(0, 0, widthPx, heightPx);
  } else {
    ctx.clearRect(0, 0, widthPx, heightPx);
  }

  ctx.drawImage(stageCanvas, 0, 0, widthPx, heightPx);
  ctx.drawImage(textCanvas, 0, 0, widthPx, heightPx);

  const svgMarkup = serializeExportSvgMarkup(state.exportSettings.transparentBackground);
  if (svgMarkup) {
    const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    try {
      const svgImage = await loadImage(svgUrl);
      ctx.drawImage(svgImage, 0, 0, widthPx, heightPx);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  return composedCanvas;
}

async function exportPngSequence() {
  const opts = await promptForExportOptions();
  if (!opts) return;

  // Prompt for output directory via File System Access API (Chromium)
  let dirHandle: FileSystemDirectoryHandle | undefined;
  if ("showDirectoryPicker" in window) {
    try {
      dirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
    } catch {
      // User cancelled the picker
      return;
    }
  }

  const wasPlaying = state.isPlaying;
  setPlaybackPlaying(false);

  const { startFrame, endFrame, frameRate } = opts;
  const frameCount = endFrame - startFrame + 1;
  const baseName = state.exportSettings.exportName ?? "frame";
  const profileKey = state.outputProfileKey;
  const padLen = String(endFrame).length;

  setSourceDefaultStatus(`Exporting PNG sequence: 0/${frameCount}...`);

  for (let f = startFrame; f <= endFrame; f++) {
    const timeSec = (f - 1) / frameRate;
    const composed = await composeFrameToCanvas(timeSec);
    if (!composed) break;

    const blob = await new Promise<Blob | null>((resolve) =>
      composed.toBlob((b) => resolve(b), "image/png")
    );
    if (!blob) break;

    const fileName = `${baseName}_${profileKey}_${String(f).padStart(padLen, "0")}.png`;

    if (dirHandle) {
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    } else {
      // Fallback: individual browser downloads
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    }

    const exported = f - startFrame + 1;
    // Update progress periodically — every 12 frames or at start/end
    if (exported === 1 || exported === frameCount || exported % 12 === 0) {
      setSourceDefaultStatus(`Exporting PNG sequence: ${exported}/${frameCount}...`);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }

  setSourceDefaultStatus(`PNG sequence exported (${frameCount} frames).`, "success");

  if (wasPlaying) {
    setPlaybackPlaying(true);
  }
}

function setupButtons() {
  // All button event listeners are now created inline by
  // buildPlaybackExportSection, buildOutputFormatSection,
  // and buildPresetsSection inside buildConfigEditor().
  // This stub remains for call-site compatibility.
}

// ─── Window resize ───────────────────────────────────────────────────

function setupResize() {
  function checkDock() {
    if (window.innerWidth >= 1200) {
      document.body.classList.add("editor-docked");
    } else {
      document.body.classList.remove("editor-docked");
    }
  }
  checkDock();
  window.addEventListener("resize", checkDock);
}

// ─── Initialization ──────────────────────────────────────────────────

async function init() {
  setSourceDefaultStatus("Loading source default...");
  applySourceDefaultSnapshot(await readSourceDefaultSnapshot());
  state.playbackTimeSec = 0;
  updateStageAspectRatio();
  initHaloRenderer();

  // Load logo intrinsic dimensions for aspect-ratio-preserving scaling
  const logoPath = state.params.logo?.assetPath;
  if (logoPath) {
    await loadLogoIntrinsicDimensions(logoPath);
  }

  buildConfigEditor();

  setupDrawerToggle();
  setupButtons();
  setupResize();
  initAuthoringLayer();

  // Pointer events on the stage element (not the SVG — SVG is pointer-events:none)
  const stage = getStageEl();
  if (stage) {
    stage.addEventListener("pointerdown", handlePointerDown);
    stage.addEventListener("pointermove", handlePointerMove);
    stage.addEventListener("pointerup", handlePointerUp);
    stage.addEventListener("pointercancel", handlePointerCancel);
    stage.addEventListener("dblclick", handleDblClick);
  }

  window.addEventListener("keydown", handleKeyDown);

  void renderStage();
  ensurePlaybackLoop();
  setSourceDefaultStatus("Source default ready.");
}

const initPromise = init();

// ─── Headless automation API ──────────────────────────────────────────
// Matches the reference repo's window.__mascotAutomation pattern.
// Used by scripts/export_frames.py (Playwright) to drive headless rendering.

function getAutomationState() {
  const profile = getOutputProfile(state.outputProfileKey);
  const sceneDescriptor = getUbuntuSummitSceneDescriptor();
  return {
    output_profile_key: state.outputProfileKey,
    output_profile: {
      key: state.outputProfileKey,
      width_px: profile.widthPx,
      height_px: profile.heightPx,
      label: profile.label
    },
    frame_rate: Math.max(1, Math.round(state.exportSettings.frameRate)),
    current_playback_time_sec: state.playbackTimeSec,
    transparent_background: state.exportSettings.transparentBackground,
    scene_phase: sceneDescriptor.phase,
    scene_timing: sceneDescriptor.runtimeTiming,
    scene_loop_time_sec: sceneDescriptor.loopTimeSec,
    scene_effective_orbit_count: sceneDescriptor.frameState.effectiveOrbitCount,
    scene_effective_spoke_count: sceneDescriptor.frameState.effectiveSpokeCount,
    scene_halo_reveal_u: sceneDescriptor.frameState.haloU,
    scene_screensaver_active: sceneDescriptor.frameState.useScreensaverField,
    scene_blink_start_sec: sceneDescriptor.frameState.motionTiming.blinkStartSec,
    scene_blink_end_sec: sceneDescriptor.frameState.motionTiming.blinkEndSec,
    scene_head_turn_duration_sec: sceneDescriptor.frameState.motionTiming.headTurnDurationSec,
    scene_mascot_fade_u: sceneDescriptor.frameState.mascotMotion.mascotFadeU,
    scene_head_turn_deg: sceneDescriptor.frameState.mascotMotion.headTurnDeg,
    scene_head_turn_eye_squint_u: sceneDescriptor.frameState.mascotMotion.headTurnEyeSquintU,
    scene_eye_closure_u: sceneDescriptor.frameState.mascotMotion.eyeClosureU,
    scene_eye_scale_y: sceneDescriptor.frameState.mascotMotion.eyeScaleY,
    scene_closing_blink_u: sceneDescriptor.frameState.mascotMotion.closingBlinkU,
    scene_loop_blink_u: sceneDescriptor.frameState.mascotMotion.loopBlinkU,
    scene_sneeze_u: sceneDescriptor.frameState.mascotMotion.sneezeU,
    scene_nose_bob_px: sceneDescriptor.frameState.mascotMotion.noseBobPx
  };
}

async function applyAutomationSnapshot(payload: Record<string, unknown> = {}) {
  if (typeof payload.output_profile_key === "string" && OUTPUT_PROFILES[payload.output_profile_key]) {
    switchOutputProfile(payload.output_profile_key);
    buildConfigEditor();
    buildOutputProfileOptions();
  }

  if (typeof payload.transparent_background === "boolean") {
    const transparentBackground = payload.transparent_background;
    updateExportSettings((settings) => ({ ...settings, transparentBackground }));
  }

  if (typeof payload.frame_rate === "number" && Number.isFinite(payload.frame_rate)) {
    const frameRate = payload.frame_rate;
    updateExportSettings((settings) => ({ ...settings, frameRate: Math.max(1, Math.round(frameRate)) }));
  }

  const playbackTimeSec = typeof payload.playback_time_sec === "number" && Number.isFinite(payload.playback_time_sec)
    ? Math.max(0, payload.playback_time_sec)
    : 0;

  setPlaybackPlaying(false);
  state.playbackTimeSec = playbackTimeSec;
  renderHaloFrame();
  await renderStage();

  return getAutomationState();
}

async function exportAutomationFrame(payload: Record<string, unknown> = {}) {
  const playbackTimeSec = typeof payload.playback_time_sec === "number" && Number.isFinite(payload.playback_time_sec)
    ? Math.max(0, payload.playback_time_sec)
    : state.playbackTimeSec;
  const transparentBackground = typeof payload.transparent_background === "boolean"
    ? payload.transparent_background
    : state.exportSettings.transparentBackground;

  setPlaybackPlaying(false);

  const composed = await composeFrameToCanvas(playbackTimeSec);
  if (!composed) {
    throw new Error("Failed to compose frame to canvas.");
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    composed.toBlob((b) => resolve(b), "image/png")
  );
  if (!blob) {
    throw new Error("Failed to create PNG blob from composed canvas.");
  }

  // Convert blob to base64 data URL, strip prefix
  const pngBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip "data:image/png;base64," prefix
      const commaIndex = dataUrl.indexOf(",");
      resolve(commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl);
    };
    reader.onerror = () => reject(new Error("Failed to read blob as base64."));
    reader.readAsDataURL(blob);
  });

  const profile = getOutputProfile(state.outputProfileKey);
  return {
    png_base64: pngBase64,
    width_px: profile.widthPx,
    height_px: profile.heightPx,
    playback_time_sec: playbackTimeSec,
    output_profile_key: state.outputProfileKey,
    frame_rate: Math.max(1, Math.round(state.exportSettings.frameRate)),
    transparent_background: transparentBackground
  };
}

(window as unknown as Record<string, unknown>).__layoutOpsAutomation = {
  version: 1,
  ready: async () => {
    await initPromise;
    setPlaybackPlaying(false);
    return getAutomationState();
  },
  getState: () => getAutomationState(),
  applySnapshot: async (payload: Record<string, unknown> = {}) => {
    await initPromise;
    return applyAutomationSnapshot(payload);
  },
  exportFrame: async (payload: Record<string, unknown> = {}) => {
    await initPromise;
    return exportAutomationFrame(payload);
  }
};

initPromise.catch((error: unknown) => {
  console.error(error);
});
