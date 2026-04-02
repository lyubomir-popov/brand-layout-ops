import "baseline-foundry/presets/app-tier.css";
import "./styles.css";

import type {
  LogoPlacementSpec,
  TextFieldPlacementSpec,
  TextStyleSpec
} from "@brand-layout-ops/core-types";
import {
  cloneOverlayDocumentProject,
  cloneOverlaySourceDefaultSnapshot,
  createBuiltInOverlaySourceDefaultSnapshot,
  createDefaultOverlayParams,
  createOverlayDocumentProjectFromSnapshot,
  normalizeOverlayParamsForEditing,
  resolveOverlayTextValue
} from "@brand-layout-ops/operator-overlay-layout";
import type {
  OverlayBackgroundNode,
  OverlayContentSource,
  OverlayDocumentProject,
  OverlayLayoutOperatorParams,
  OverlaySceneFamilyKey
} from "@brand-layout-ops/operator-overlay-layout";
import { getHaloConfigForProfile } from "@brand-layout-ops/operator-halo-field";
import type { HaloFieldConfig } from "@brand-layout-ops/operator-halo-field";
import type { ParameterSectionDefinition } from "@brand-layout-ops/parameter-ui";

import type { SceneFamilyPreviewMode } from "./scene-family-preview.js";
import {
  cloneOverlayParams,
  createDefaultExportSettings,
  loadOutputFormatKeys,
  saveOutputFormatKey,
  type ExportSettings
} from "./sample-document.js";
import { type PersistedOverlayPreviewDocument } from "./preview-document.js";
import {
  createDocumentWorkspaceController
} from "./document-workspace.js";
import type {
  GuideMode,
  OverlayPreviewDocument,
  PreviewAppContext,
  PreviewState,
  SelectedOperatorId,
  Selection
} from "./preview-app-context.js";
import {
  OVERLAY_LAYOUT_OPERATOR_SELECTION_ID,
  UNTITLED_DOCUMENT_NAME
} from "./preview-app-context.js";
import {
  createBackgroundGraphController
} from "./background-graph-controller.js";
import {
  createAuthoringInteractionController,
  type AuthoringInteractionController
} from "./authoring-controller.js";
import {
  createConfigEditorController,
  type ConfigEditorController
} from "./config-editor-controller.js";
import {
  createCsvDraftController,
  type CsvDraftController
} from "./csv-draft-controller.js";
import {
  createDocumentTargetController,
  type DocumentTargetController
} from "./document-target-controller.js";
import {
  createExportAutomationController,
  type ExportAutomationController
} from "./export-controller.js";
import {
  createOverlayEditingController,
  type OverlayEditingController
} from "./overlay-editing-controller.js";
import {
  createPlaybackController,
  type PlaybackController
} from "./playback-controller.js";
import {
  createPreviewDocumentStateController,
  type PreviewDocumentStateController
} from "./preview-document-state-controller.js";
import {
  createProfileStateController,
  type ProfileStateController
} from "./profile-state-controller.js";
import {
  createSourceDefaultController,
  type SourceDefaultController
} from "./source-default-controller.js";
import { createStageRenderController } from "./stage-render-controller.js";
import {
  createPreviewShellController,
  type PreviewShellController
} from "./preview-shell-controller.js";
import {
  createStageNetworkOverlayController,
  type StageNetworkOverlayController
} from "./stage-network-overlay-controller.js";
import { buildFuzzyBoidsSection } from "./fuzzy-boids-section.js";
import { buildGridSection } from "./grid-section.js";
import { buildHaloConfigSection } from "./halo-config-section.js";
import { buildOverlaySection } from "./overlay-section.js";
import { buildPhyllotaxisSection } from "./phyllotaxis-section.js";
import { buildScatterSection } from "./scatter-section.js";

type ConfigSectionDefinition = ParameterSectionDefinition;

const INITIAL_PROFILE_KEY = "instagram_1080x1350";
const INITIAL_FORMAT_KEY = "generic_social";
const OVERLAY_VISIBLE_STORAGE_KEY = "brand-layout-ops-overlay-visible-v1";
const NETWORK_OVERLAY_VISIBLE_STORAGE_KEY = "brand-layout-ops-network-overlay-visible-v1";
const GUIDE_MODE_STORAGE_KEY = "brand-layout-ops-guide-mode-v1";

const persistedFormat = loadOutputFormatKeys();
const startProfileKey = persistedFormat?.profileKey ?? INITIAL_PROFILE_KEY;
const startFormatKey = persistedFormat?.formatKey ?? INITIAL_FORMAT_KEY;
const INITIAL_PARAMS = createDefaultOverlayParams(startProfileKey, startFormatKey);

function normalizeGuideMode(rawGuideMode: unknown): GuideMode {
  return rawGuideMode === "off" || rawGuideMode === "baseline"
    ? rawGuideMode
    : "composition";
}

const INITIAL_SOURCE_DEFAULTS = createBuiltInOverlaySourceDefaultSnapshot<ExportSettings, HaloFieldConfig, GuideMode>({
  outputProfileKey: INITIAL_PROFILE_KEY,
  contentFormatKey: INITIAL_FORMAT_KEY,
  guideMode: "composition",
  createExportSettings: createDefaultExportSettings,
  createHaloConfig: getHaloConfigForProfile
});

const INITIAL_SOURCE_DEFAULT_PROJECT = createOverlayDocumentProjectFromSnapshot(INITIAL_SOURCE_DEFAULTS);

const state: PreviewState = {
  params: cloneOverlayParams(INITIAL_PARAMS),
  selected: null,
  guideMode: normalizeGuideMode(localStorage.getItem(GUIDE_MODE_STORAGE_KEY) ?? "composition"),
  overlayVisible: localStorage.getItem(OVERLAY_VISIBLE_STORAGE_KEY) !== "0",
  networkOverlayVisible: localStorage.getItem(NETWORK_OVERLAY_VISIBLE_STORAGE_KEY) === "1",
  pendingCsvDraftsByBucket: {},
  outputProfileKey: startProfileKey,
  contentFormatKey: startFormatKey,
  profileFormatBuckets: {
    [startProfileKey]: {
      [startFormatKey]: cloneOverlayParams(INITIAL_PARAMS)
    }
  },
  contentFormatKeyByProfile: {
    [startProfileKey]: startFormatKey
  },
  exportSettings: createDefaultExportSettings(startProfileKey),
  exportSettingsByProfile: {
    [startProfileKey]: createDefaultExportSettings(startProfileKey)
  },
  haloConfig: getHaloConfigForProfile(startProfileKey),
  haloConfigByProfile: {
    [startProfileKey]: getHaloConfigForProfile(startProfileKey)
  },
  sourceDefaults: cloneOverlaySourceDefaultSnapshot(INITIAL_SOURCE_DEFAULTS),
  sourceDefaultProject: cloneOverlayDocumentProject(INITIAL_SOURCE_DEFAULT_PROJECT),
  documentProject: cloneOverlayDocumentProject(INITIAL_SOURCE_DEFAULT_PROJECT),
  selectedBackgroundNodeId: INITIAL_SOURCE_DEFAULT_PROJECT.backgroundGraph.activeNodeId,
  selectedOperatorId: OVERLAY_LAYOUT_OPERATOR_SELECTION_ID,
  isPlaying: true,
  playbackTimeSec: 0
};

const backgroundGraphController = createBackgroundGraphController({ state });

const previewDocumentBridge = {
  persistActiveProfileBuckets,
  persistActiveExportSettings,
  persistActiveHaloConfig,
  getOrCreateProfileFormatParams,
  normalizeParams: normalizeParamsTextFieldOffsets,
  syncHaloConfigToProfile
};

let previewShellController: PreviewShellController | null = null;
let networkOverlayController: StageNetworkOverlayController | null = null;

const documentWorkspaceController = createDocumentWorkspaceController<OverlayPreviewDocument>({
  untitledName: UNTITLED_DOCUMENT_NAME,
  initialStatusMessage: "Open or save a local document file.",
  parseDocument: sanitizePreviewDocument,
  getDocumentMetadata: (previewDocument) => previewDocument.document.metadata,
  buildPersistedDocument: buildCurrentDocumentPersistence,
  applyDocument: applyPreviewDocumentToState,
  applyNewDocumentState,
  onWorkspaceChange: () => {
    previewShellController?.updateDocumentUi();
  }
});

let logoIntrinsicWidth = 0;
let logoIntrinsicHeight = 0;
let exportAutomationController: ExportAutomationController | null = null;
let authoringController: AuthoringInteractionController | null = null;
let sourceDefaultController: SourceDefaultController | null = null;
let csvDraftController: CsvDraftController | null = null;
let playbackController: PlaybackController | null = null;
let overlayEditingController: OverlayEditingController | null = null;
let configEditorController: ConfigEditorController | null = null;
let documentTargetController: DocumentTargetController | null = null;
let profileStateController: ProfileStateController | null = null;
let documentStateController: PreviewDocumentStateController | null = null;

const $ = <T extends Element>(selector: string): T | null => document.querySelector<T>(selector);

function getStageEl(): HTMLElement | null {
  return $("[data-stage]");
}

function getCanvasEl(): HTMLCanvasElement | null {
  return $("[data-stage-canvas]");
}

function getScenePreviewCanvas(): HTMLCanvasElement | null {
  return $("[data-scene-preview]");
}

function getScenePreviewGpuCanvas(): HTMLCanvasElement | null {
  return $("[data-scene-preview-gpu]");
}

function getTextOverlayCanvas(): HTMLCanvasElement | null {
  return $("[data-text-overlay]");
}

function getSvgOverlay(): SVGSVGElement | null {
  return $("[data-svg-overlay]");
}

function getAuthoringLayerEl(): HTMLElement | null {
  return $("[data-authoring-layer]");
}

function getNetworkOverlayEl(): HTMLElement | null {
  return $("[data-network-overlay]");
}

function getConfigEditor(): HTMLElement | null {
  return $("[data-config-editor]");
}

function getOutputProfileOptions(): HTMLElement | null {
  return $("[data-output-profile-options]");
}

function getOverlayVisibilityInput(): HTMLInputElement | null {
  return $("[data-overlay-visibility]");
}

const stageRenderController = createStageRenderController({
  state,
  getStageEl,
  getCanvasEl,
  getScenePreviewCanvas,
  getScenePreviewGpuCanvas,
  getTextOverlayCanvas,
  getSvgOverlay,
  getEffectiveParams,
  onAuthoringRender: () => {
    authoringController?.render();
  }
});

profileStateController = createProfileStateController({
  state,
  createDefaultExportSettings,
  getHaloConfigForProfile,
  normalizeParamsTextFieldOffsets,
  getEffectiveParams,
  normalizeSelection,
  resizeRenderer,
  syncDocumentProjectToCurrentOutputProfile,
  saveOutputFormatKey
});

syncHaloConfigToProfile(state.outputProfileKey);

function getNormalizedDocumentName(rawName: string = documentWorkspaceController.state.name): string {
  return documentWorkspaceController.getNormalizedName(rawName);
}

function loadLogoIntrinsicDimensions(assetPath: string): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!assetPath) {
      logoIntrinsicWidth = 0;
      logoIntrinsicHeight = 0;
      resolve();
      return;
    }

    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", () => {
      logoIntrinsicWidth = image.naturalWidth;
      logoIntrinsicHeight = image.naturalHeight;
      resolve();
    });
    image.addEventListener("error", () => {
      logoIntrinsicWidth = 0;
      logoIntrinsicHeight = 0;
      resolve();
    });
    image.src = assetPath;
  });
}

function markDocumentDirty(): void {
  documentWorkspaceController.markDirty();
}

function updateDocumentUi(): void {
  previewShellController?.updateDocumentUi();
}

function getCsvDraftBucketKey(profileKey?: string, formatKey?: string): string {
  return csvDraftController!.getCsvDraftBucketKey(profileKey, formatKey);
}

function getStagedCsvDraft(profileKey?: string, formatKey?: string): string | null {
  return csvDraftController!.getStagedCsvDraft(profileKey, formatKey);
}

function setStagedCsvDraft(draft: string | null, profileKey?: string, formatKey?: string): void {
  csvDraftController!.setStagedCsvDraft(draft, profileKey, formatKey);
}

function getOverlayFormatCsvPath(formatKey: string): string | null {
  return csvDraftController!.getOverlayFormatCsvPath(formatKey);
}

function commitCsvDraftToProfileFormat(profileKey: string, formatKey: string, draft: string): void {
  csvDraftController!.commitCsvDraftToProfileFormat(profileKey, formatKey, draft);
}

function syncCsvDraftAcrossFormatBuckets(formatKey: string, draft: string): void {
  csvDraftController!.syncCsvDraftAcrossFormatBuckets(formatKey, draft);
}

async function flushPendingCsvDrafts(): Promise<string[]> {
  return csvDraftController!.flushPendingCsvDrafts();
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

function getContentSource(): OverlayContentSource {
  return state.params.contentSource === "csv" ? "csv" : "inline";
}

function normalizeSelectedBackgroundNodeId(
  preferredNodeId: string | null = state.selectedBackgroundNodeId
): string | null {
  return backgroundGraphController.normalizeSelectedBackgroundNodeId(preferredNodeId);
}

function normalizeSelectedOperatorId(
  preferredOperatorId: string | null = state.selectedOperatorId
): SelectedOperatorId {
  return backgroundGraphController.normalizeSelectedOperatorId(preferredOperatorId);
}

function setSelectedOperator(operatorId: string | null): boolean {
  const didChange = backgroundGraphController.setSelectedOperator(operatorId);
  networkOverlayController?.render();
  return didChange;
}

function getSelectedOperatorId(): SelectedOperatorId {
  return backgroundGraphController.getSelectedOperatorId();
}

function setSelectedBackgroundNode(nodeId: string | null): boolean {
  return backgroundGraphController.setSelectedBackgroundNode(nodeId);
}

function getSelectedBackgroundNode(): OverlayBackgroundNode | null {
  return backgroundGraphController.getSelectedBackgroundNode();
}

function getSelectedOperatorGroup(): string {
  return backgroundGraphController.getSelectedOperatorGroup();
}

function updateSelectedBackgroundNode(
  updater: (node: OverlayBackgroundNode) => OverlayBackgroundNode
): boolean {
  return backgroundGraphController.updateSelectedBackgroundNode(updater);
}

function syncDocumentBackgroundGraph(): void {
  backgroundGraphController.syncDocumentBackgroundGraph();
  networkOverlayController?.render();
}

function removeBackgroundNode(nodeId: string): boolean {
  const didRemove = backgroundGraphController.removeBackgroundNode(nodeId);
  networkOverlayController?.render();
  return didRemove;
}

function getResolvedTextFieldText(field: TextFieldPlacementSpec): string {
  return resolveOverlayTextValue(getEffectiveParams(), field);
}

function hasStagedCsvDraft(): boolean {
  return csvDraftController!.hasStagedCsvDraft();
}

function getProfileFormatBucket(profileKey: string): Record<string, OverlayLayoutOperatorParams> {
  return profileStateController!.getProfileFormatBucket(profileKey);
}

function getOrCreateExportSettingsForProfile(profileKey: string): ExportSettings {
  return profileStateController!.getOrCreateExportSettingsForProfile(profileKey);
}

function getOrCreateHaloConfigForProfile(profileKey: string): HaloFieldConfig {
  return profileStateController!.getOrCreateHaloConfigForProfile(profileKey);
}

function persistActiveExportSettings(): void {
  profileStateController!.persistActiveExportSettings();
}

function persistActiveHaloConfig(): void {
  profileStateController!.persistActiveHaloConfig();
}

function updateExportSettings(updater: (settings: ExportSettings) => ExportSettings): void {
  profileStateController!.updateExportSettings(updater);
}

function persistActiveProfileBuckets(): void {
  profileStateController!.persistActiveProfileBuckets();
}

function getOrCreateProfileFormatParams(
  profileKey: string,
  formatKey: string
): OverlayLayoutOperatorParams {
  return profileStateController!.getOrCreateProfileFormatParams(profileKey, formatKey);
}

function syncHaloConfigToProfile(profileKey: string) {
  profileStateController!.syncHaloConfigToProfile(profileKey);
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
  overlayEditingController!.updateSelectedTextValue(id, value);
}

function normalizeParamsTextFieldOffsets(params: OverlayLayoutOperatorParams): OverlayLayoutOperatorParams {
  return normalizeOverlayParamsForEditing(params);
}

function getDisplayedTextFieldOffsetBaselines(field: TextFieldPlacementSpec): number {
  return overlayEditingController!.getDisplayedTextFieldOffsetBaselines(field);
}

function updateTextField(
  id: string,
  updater: (field: TextFieldPlacementSpec) => TextFieldPlacementSpec
) {
  overlayEditingController!.updateTextField(id, updater);
}

function updateTextStyle(key: string, updater: (style: TextStyleSpec) => TextStyleSpec) {
  overlayEditingController!.updateTextStyle(key, updater);
}

function updateLogo(updater: (logo: LogoPlacementSpec) => LogoPlacementSpec) {
  overlayEditingController!.updateLogo(updater);
}

function getCurrentLogoAspectRatio(): number {
  return overlayEditingController!.getCurrentLogoAspectRatio();
}

function syncLogoToTitleFontSize(titleFontSizePx: number) {
  overlayEditingController!.syncLogoToTitleFontSize(titleFontSizePx);
}

function syncTitleToLogoHeight(logoHeightPx: number) {
  overlayEditingController!.syncTitleToLogoHeight(logoHeightPx);
}

function updateLogoSizeWithAspectRatio(nextHeightPx: number) {
  overlayEditingController!.updateLogoSizeWithAspectRatio(nextHeightPx);
}

function createOverlayItemActionRow(): HTMLElement {
  return overlayEditingController!.createOverlayItemActionRow();
}

function select(sel: Selection | null) {
  state.selected = sel;
  if (authoringController) {
    authoringController.handleSelectionChange();
    networkOverlayController?.render();
    return;
  }
  buildConfigEditor();
  networkOverlayController?.render();
}

function applyStagedCsvDraft() {
  csvDraftController!.applyStagedCsvDraft();
}

function discardStagedCsvDraft() {
  csvDraftController!.discardStagedCsvDraft();
}

function getDefaultDocumentTargetLabel(profileKey: string): string {
  return documentTargetController!.getDefaultDocumentTargetLabel(profileKey);
}

function syncDocumentProjectToCurrentOutputProfile() {
  return documentTargetController!.syncDocumentProjectToCurrentOutputProfile();
}

function getUnusedDocumentTargetProfileKeys(currentProfileKey?: string): string[] {
  return documentTargetController!.getUnusedDocumentTargetProfileKeys(currentProfileKey);
}

function getSceneFamilyLabel(sceneFamilyKey: OverlaySceneFamilyKey): string {
  return backgroundGraphController.getSceneFamilyLabel(sceneFamilyKey);
}

function setActiveDocumentTarget(targetId: string): void {
  documentTargetController!.setActiveDocumentTarget(targetId);
}

function addDocumentTarget(profileKey?: string): boolean {
  return documentTargetController!.addDocumentTarget(profileKey);
}

function updateActiveDocumentTargetLabel(rawLabel: string): void {
  documentTargetController!.updateActiveDocumentTargetLabel(rawLabel);
}

function updateActiveDocumentTargetProfile(nextProfileKey: string): void {
  documentTargetController!.updateActiveDocumentTargetProfile(nextProfileKey);
}

function removeActiveDocumentTarget(): boolean {
  return documentTargetController!.removeActiveDocumentTarget();
}

function switchOutputProfile(profileKey: string) {
  profileStateController!.switchOutputProfile(profileKey);
  networkOverlayController?.render();
}

function switchContentFormat(formatKey: string) {
  profileStateController!.switchContentFormat(formatKey);
}

function buildCurrentDocumentPayload(overrides?: { name?: string; createdAt?: string; updatedAt?: string }): OverlayPreviewDocument {
  return documentStateController!.buildCurrentDocumentPayload(overrides);
}

function buildCurrentDocumentPersistence(overrides?: { name?: string; createdAt?: string; updatedAt?: string }): PersistedOverlayPreviewDocument {
  return documentStateController!.buildCurrentDocumentPersistence(overrides);
}

function sanitizePreviewDocument(rawDocument: unknown): OverlayPreviewDocument | null {
  return documentStateController!.sanitizePreviewDocument(rawDocument);
}

async function applyPreviewDocumentToState(previewDocument: OverlayPreviewDocument): Promise<void> {
  await documentStateController!.applyPreviewDocumentToState(previewDocument);
  networkOverlayController?.render();
}

async function applyNewDocumentState(): Promise<void> {
  await documentStateController!.applyNewDocumentState();
  networkOverlayController?.render();
}

function setOverlayVisible(nextVisible: boolean) {
  if (state.overlayVisible === nextVisible) {
    syncOverlayVisibilityUi();
    authoringController?.render();
    networkOverlayController?.render();
    previewShellController?.updateViewUi();
    return;
  }

  state.overlayVisible = nextVisible;

  try { localStorage.setItem(OVERLAY_VISIBLE_STORAGE_KEY, nextVisible ? "1" : "0"); } catch { }

  if (!nextVisible) {
    authoringController?.resetInteractionState();
  }

  syncOverlayVisibilityUi();
  authoringController?.render();
  networkOverlayController?.render();
  previewShellController?.updateViewUi();
}

function setNetworkOverlayVisible(nextVisible: boolean) {
  if (state.networkOverlayVisible === nextVisible) {
    networkOverlayController?.render();
    previewShellController?.updateViewUi();
    return;
  }

  state.networkOverlayVisible = nextVisible;

  try { localStorage.setItem(NETWORK_OVERLAY_VISIBLE_STORAGE_KEY, nextVisible ? "1" : "0"); } catch { }

  networkOverlayController?.render();
  previewShellController?.updateViewUi();
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

function resizeRenderer() {
  stageRenderController.resizeRenderer();
  networkOverlayController?.render();
}

function syncBackgroundRendererVisibility() {
  stageRenderController.syncBackgroundRendererVisibility();
}

function getSceneFamilyPreviewState(mode: SceneFamilyPreviewMode = "interactive") {
  return stageRenderController.getSceneFamilyPreviewState(mode);
}

function renderBackgroundFrame(mode: SceneFamilyPreviewMode = "interactive") {
  stageRenderController.renderBackgroundFrame(mode);
}

function updatePlaybackToggleUi() { playbackController!.updatePlaybackToggleUi(); }
function stopPlaybackLoop() { playbackController!.stopPlaybackLoop(); }
function ensurePlaybackLoop() { playbackController!.ensurePlaybackLoop(); }
function setPlaybackPlaying(nextIsPlaying: boolean) { playbackController!.setPlaybackPlaying(nextIsPlaying); }
function togglePlayback() { playbackController!.togglePlayback(); }

async function renderStage(mode: SceneFamilyPreviewMode = "interactive") {
  await stageRenderController.renderStage(mode);
}

function buildOutputProfileOptions() {
  documentTargetController!.buildOutputProfileOptions();
}

function getSelectedOverlaySectionTitle(): string {
  return overlayEditingController!.getSelectedOverlaySectionTitle();
}

function getSelectedTextField(): TextFieldPlacementSpec | null {
  return overlayEditingController!.getSelectedTextField();
}

function applySelectedTextStyle(styleKey: string) {
  overlayEditingController!.applySelectedTextStyle(styleKey);
}

const ctx: PreviewAppContext = {
  state,
  renderStage,
  buildConfigEditor,
  buildOutputProfileOptions,
  resizeRenderer,
  syncOverlayVisibilityUi,
  updatePlaybackToggleUi,
  updateDocumentUi,
  markDocumentDirty,
  select,
  togglePlayback,
  setPlaybackPlaying,
  setOverlayVisible,
  normalizeParamsTextFieldOffsets,
  updateExportSettings,
  updateTextField,
  updateLogo,
  updateLogoSizeWithAspectRatio,
  getCurrentLogoAspectRatio,
  loadLogoIntrinsicDimensions,
  applySelectedTextStyle,
  updateTextStyle,
  syncLogoToTitleFontSize,
  syncTitleToLogoHeight,
  getDisplayedTextFieldOffsetBaselines,
  getResolvedTextFieldText,
  updateSelectedTextValue,
  getSelectedTextField,
  getSelectedOverlaySectionTitle,
  createOverlayItemActionRow,
  switchContentFormat,
  setStagedCsvDraft,
  getStagedCsvDraft,
  hasStagedCsvDraft,
  applyStagedCsvDraft,
  discardStagedCsvDraft,
  getContentSource,
  getEffectiveParams,
  switchOutputProfile,
  applySourceDefaultSnapshot(snapshot) {
    sourceDefaultController?.applySourceDefaultSnapshot(snapshot);
  },
  writeCurrentAsSourceDefault() {
    return sourceDefaultController!.writeCurrentAsSourceDefault();
  },
  setSourceDefaultStatus(message, severity) {
    sourceDefaultController?.setSourceDefaultStatus(message, severity as "neutral" | "success" | "error");
  },
  setSelectedBackgroundNode,
  getSelectedBackgroundNode,
  updateSelectedBackgroundNode,
  syncDocumentBackgroundGraph,
  getSceneFamilyPreviewState,
  getSceneFamilyLabel,
  addDocumentTarget,
  removeActiveDocumentTarget,
  setActiveDocumentTarget,
  updateActiveDocumentTargetLabel,
  updateActiveDocumentTargetProfile,
  getUnusedDocumentTargetProfileKeys,
  getDefaultDocumentTargetLabel,
  documentWorkspace: documentWorkspaceController,
  getNormalizedDocumentName,
  exportComposedFramePng: async () => {
    await exportAutomationController?.exportComposedFramePng();
  },
  exportPngSequence: async () => {
    await exportAutomationController?.exportPngSequence();
  }
};


networkOverlayController = createStageNetworkOverlayController({
  state,
  getStageEl,
  getOverlayEl: getNetworkOverlayEl,
  getSelectedOperatorId,
  getSceneFamilyLabel,
  getSceneFamilyPreviewState,
  selectBackgroundNode(nodeId: string) {
    const didChange = setSelectedOperator(nodeId);
    if (didChange) {
      buildConfigEditor();
    }
  },
  selectOverlayLayout() {
    setSelectedOperator(OVERLAY_LAYOUT_OPERATOR_SELECTION_ID);
    select(null);
  }
});
authoringController = createAuthoringInteractionController({
  ctx,
  getCurrentScene: () => stageRenderController.getCurrentScene(),
  getStageEl,
  getAuthoringLayerEl
});

documentStateController = createPreviewDocumentStateController({
  state,
  previewDocumentBridge,
  initialSourceDefaults: INITIAL_SOURCE_DEFAULTS,
  createDefaultExportSettings,
  getHaloConfigForProfile,
  normalizeGuideMode,
  getCurrentDocumentName: () => getNormalizedDocumentName(),
  getCurrentDocumentCreatedAt: () => documentWorkspaceController.state.createdAt,
  getCurrentDocumentUpdatedAt: () => documentWorkspaceController.state.updatedAt,
  buildConfigEditor,
  resizeRenderer,
  renderStage,
  loadLogoIntrinsicDimensions,
  resetAuthoringInteractionState: () => {
    authoringController?.resetInteractionState();
  },
  normalizeSelection,
  normalizeSelectedBackgroundNodeId,
  normalizeSelectedOperatorId
});

exportAutomationController = createExportAutomationController({
  ctx,
  getCanvasEl,
  getScenePreviewCanvas,
  getScenePreviewGpuCanvas,
  getTextOverlayCanvas,
  getSvgOverlay,
  getSceneDescriptor: () => stageRenderController.getSceneDescriptor(),
  normalizeSelectedBackgroundNodeId,
  buildCurrentDocumentPersistence,
  parsePreviewDocument: sanitizePreviewDocument,
    applyPreviewDocument: applyPreviewDocumentToState
});

csvDraftController = createCsvDraftController({
  state,
  getProfileFormatBucket,
  getOrCreateProfileFormatParams,
  markDocumentDirty
});

playbackController = createPlaybackController({
  state,
  renderBackgroundFrame
});

overlayEditingController = createOverlayEditingController({
  state,
  normalizeParamsTextFieldOffsets,
  markDocumentDirty,
  buildConfigEditor,
  renderStage,
  select,
  getLogoIntrinsicDimensions: () => ({
    width: logoIntrinsicWidth,
    height: logoIntrinsicHeight
  })
});

sourceDefaultController = createSourceDefaultController({
  state,
  initialSourceDefaults: INITIAL_SOURCE_DEFAULTS,
  initialSourceDefaultProject: INITIAL_SOURCE_DEFAULT_PROJECT,
  previewDocumentBridge,
  createDefaultExportSettings,
  getHaloConfigForProfile,
  normalizeGuideMode,
  flushPendingCsvDrafts,
  buildCurrentDocumentPayload,
  buildConfigEditor,
  syncDocumentProjectToCurrentOutputProfile,
  normalizeSelectedBackgroundNodeId,
  normalizeSelectedOperatorId,
  normalizeSelection
});

previewShellController = createPreviewShellController({
  state,
  untitledName: UNTITLED_DOCUMENT_NAME,
  guideModeStorageKey: GUIDE_MODE_STORAGE_KEY,
  documentWorkspace: documentWorkspaceController,
  sourceDefaultController,
  markDocumentDirty,
  loadLogoIntrinsicDimensions,
  buildConfigEditor,
  buildOutputProfileOptions,
  renderStage,
  resizeRenderer,
  togglePlayback,
  ensurePlaybackLoop,
  updateExportSettings,
  setOverlayVisible,
  setNetworkOverlayVisible,
  addDocumentTarget,
  removeActiveDocumentTarget,
  exportComposedFramePng: async () => {
    await exportAutomationController?.exportComposedFramePng();
  },
  exportPngSequence: async () => {
    await exportAutomationController?.exportPngSequence();
  },
  initHaloRenderer: () => {
    stageRenderController.initHaloRenderer();
  },
  initAuthoring: () => {
    authoringController?.init();
  },
  handleAuthoringEditingKeyDown: (event) => {
    return authoringController?.handleEditingKeyDown(event) ?? false;
  },
  handleAuthoringInteractionKeyDown: (event) => {
    return authoringController?.handleInteractionKeyDown(event) ?? false;
  }
});

const CORE_CONFIG_SECTION_DEFINITIONS: ConfigSectionDefinition[] = [
  { key: "overlay-layer", scope: "operator", group: OVERLAY_LAYOUT_OPERATOR_SELECTION_ID, order: 500, factory: () => buildOverlaySection(ctx) },
  { key: "layout-grid", scope: "operator", group: OVERLAY_LAYOUT_OPERATOR_SELECTION_ID, order: 700, factory: () => buildGridSection(ctx) },
  { key: "halo-config", scope: "operator", order: 800, group: "halo", factory: () => buildHaloConfigSection(ctx) },
  { key: "fuzzy-boids", scope: "operator", order: 810, group: "fuzzy-boids", factory: () => buildFuzzyBoidsSection(ctx) },
  { key: "phyllotaxis", scope: "operator", order: 820, group: "phyllotaxis", factory: () => buildPhyllotaxisSection(ctx) },
  { key: "scatter", scope: "operator", order: 830, group: "scatter", factory: () => buildScatterSection(ctx) }
];

configEditorController = createConfigEditorController({
  state,
  sectionDefinitions: CORE_CONFIG_SECTION_DEFINITIONS,
  getConfigEditor,
  getSelectedOperatorId,
  getSelectedOperatorGroup,
  getSceneFamilyLabel,
  setSelectedOperator,
  selectOverlayItem: select,
  syncDocumentBackgroundGraph,
  removeBackgroundNode,
  markDocumentDirty,
  syncBackgroundRendererVisibility,
  renderStage
});

documentTargetController = createDocumentTargetController({
  state,
  getOutputProfileOptions,
  switchOutputProfile,
  markDocumentDirty,
  buildConfigEditor,
  renderStage
});

function buildConfigEditor() {
  configEditorController!.buildConfigEditor();
}
const initPromise = previewShellController.init();
exportAutomationController?.installAutomationApi(initPromise);
void initPromise.then(() => {
  networkOverlayController?.render();
}).catch(() => {
  // initPromise error is handled below.
});

initPromise.catch((error: unknown) => {
  console.error(error);
});
