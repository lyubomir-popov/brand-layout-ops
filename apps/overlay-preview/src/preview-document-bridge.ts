import {
  cloneOverlayDocumentProject,
  cloneOverlaySourceDefaultSnapshot,
  createOverlayDocumentProjectFromSnapshot,
  normalizeOverlayDocumentProject,
  normalizeOverlayProfileBucketState,
  type OverlayDocumentProject,
  type OverlayLayoutOperatorParams,
  type OverlaySourceDefaultSnapshot,
  type ProfileContentFormatMap,
  type ProfileFormatBuckets
} from "@brand-layout-ops/operator-overlay-layout";

import {
  clonePreset,
  createOverlayPreviewDocument,
  normalizeOverlayPreviewDocumentForPersistence,
  type OverlayPreviewDocument,
  type PersistedOverlayPreviewDocument
} from "./preview-document.js";
import {
  cloneOverlayParams,
  saveActivePresetId,
  saveOutputFormatKey,
  savePresets,
  type ExportSettings,
  type Preset
} from "./sample-document.js";

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function cloneExportSettingsByProfile(
  exportSettingsByProfile: Record<string, ExportSettings>
): Record<string, ExportSettings> {
  return cloneJson(exportSettingsByProfile);
}

export function cloneHaloConfigByProfile<THaloConfig extends object>(
  haloConfigByProfile: Record<string, THaloConfig>
): Record<string, THaloConfig> {
  return cloneJson(haloConfigByProfile);
}

export interface OverlayPreviewDocumentBridgeState<
  THaloConfig extends object,
  TGuideMode extends string = string,
  TSelection = unknown
> {
  params: OverlayLayoutOperatorParams;
  selected: TSelection | null;
  guideMode: TGuideMode;
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
  haloConfig: THaloConfig;
  haloConfigByProfile: Record<string, THaloConfig>;
  sourceDefaults: OverlaySourceDefaultSnapshot<ExportSettings, THaloConfig, TGuideMode>;
  documentProject: OverlayDocumentProject;
}

export interface OverlayPreviewDocumentBridgeAdapter<THaloConfig extends object> {
  persistActiveProfileBuckets(): void;
  persistActiveExportSettings(): void;
  persistActiveHaloConfig(): void;
  getOrCreateProfileFormatParams(profileKey: string, formatKey: string): OverlayLayoutOperatorParams;
  normalizeParams(params: OverlayLayoutOperatorParams): OverlayLayoutOperatorParams;
  syncHaloConfigToProfile(profileKey: string): void;
}

export interface BuildOverlayPreviewDocumentOptions {
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export function createCurrentSourceDefaultSnapshot<
  THaloConfig extends object,
  TGuideMode extends string = string,
  TSelection = unknown
>(
  state: OverlayPreviewDocumentBridgeState<THaloConfig, TGuideMode, TSelection>,
  adapter: OverlayPreviewDocumentBridgeAdapter<THaloConfig>
): OverlaySourceDefaultSnapshot<ExportSettings, THaloConfig, TGuideMode> {
  adapter.persistActiveProfileBuckets();
  adapter.persistActiveExportSettings();
  adapter.persistActiveHaloConfig();

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
    exportSettings: cloneJson(state.exportSettings),
    exportSettingsByProfile: cloneExportSettingsByProfile(state.exportSettingsByProfile),
    haloConfig: cloneJson(state.haloConfig),
    haloConfigByProfile: cloneHaloConfigByProfile(state.haloConfigByProfile),
    guideMode: state.guideMode
  };
}

export function applySourceDefaultSnapshotToState<
  THaloConfig extends object,
  TGuideMode extends string = string,
  TSelection = unknown
>(
  state: OverlayPreviewDocumentBridgeState<THaloConfig, TGuideMode, TSelection>,
  snapshot: OverlaySourceDefaultSnapshot<ExportSettings, THaloConfig, TGuideMode>,
  adapter: OverlayPreviewDocumentBridgeAdapter<THaloConfig>
): void {
  const normalizedProfileState = normalizeOverlayProfileBucketState({
    outputProfileKey: snapshot.outputProfileKey,
    contentFormatKey: snapshot.contentFormatKey,
    profileFormatBuckets: snapshot.profileFormatBuckets,
    contentFormatKeyByProfile: snapshot.contentFormatKeyByProfile
  });

  state.sourceDefaults = cloneOverlaySourceDefaultSnapshot(snapshot);
  state.outputProfileKey = normalizedProfileState.outputProfileKey;
  state.profileFormatBuckets = normalizedProfileState.profileFormatBuckets;
  state.contentFormatKeyByProfile = normalizedProfileState.contentFormatKeyByProfile;
  state.contentFormatKey = normalizedProfileState.contentFormatKey;
  state.params = adapter.normalizeParams(cloneOverlayParams(
    adapter.getOrCreateProfileFormatParams(state.outputProfileKey, state.contentFormatKey)
  ));
  state.exportSettingsByProfile = cloneExportSettingsByProfile(snapshot.exportSettingsByProfile);
  state.exportSettings = cloneJson(
    state.exportSettingsByProfile[state.outputProfileKey] ?? snapshot.exportSettings
  );
  state.haloConfigByProfile = cloneHaloConfigByProfile(snapshot.haloConfigByProfile);
  state.haloConfig = cloneJson(
    state.haloConfigByProfile[state.outputProfileKey] ?? snapshot.haloConfig
  );
  // Preserve guideMode across document loads — it's a UI display preference, not document state
  // Preserve overlayVisible across document loads — it's a UI display preference, not document state
  state.selected = null;
  state.pendingCsvDraftsByBucket = {};
  adapter.syncHaloConfigToProfile(state.outputProfileKey);
}

export function buildOverlayPreviewDocument<
  THaloConfig extends object,
  TGuideMode extends string = string,
  TSelection = unknown
>(
  state: OverlayPreviewDocumentBridgeState<THaloConfig, TGuideMode, TSelection>,
  adapter: OverlayPreviewDocumentBridgeAdapter<THaloConfig>,
  options: BuildOverlayPreviewDocumentOptions
): OverlayPreviewDocument<THaloConfig, TGuideMode> {
  const snapshot = createCurrentSourceDefaultSnapshot(state, adapter);

  return createOverlayPreviewDocument({
    name: options.name,
    ...(options.createdAt ? { createdAt: options.createdAt } : {}),
    ...(options.updatedAt ? { updatedAt: options.updatedAt } : {}),
    project: normalizeOverlayDocumentProject(state.documentProject, snapshot),
    state: snapshot,
    pendingCsvDraftsByBucket: state.pendingCsvDraftsByBucket,
    presets: state.presets,
    activePresetId: state.activePresetId
  });
}

export function buildOverlayPreviewDocumentPersistence<
  THaloConfig extends object,
  TGuideMode extends string = string,
  TSelection = unknown
>(
  state: OverlayPreviewDocumentBridgeState<THaloConfig, TGuideMode, TSelection>,
  adapter: OverlayPreviewDocumentBridgeAdapter<THaloConfig>,
  options: BuildOverlayPreviewDocumentOptions
): PersistedOverlayPreviewDocument {
  return normalizeOverlayPreviewDocumentForPersistence(
    buildOverlayPreviewDocument(state, adapter, options)
  );
}

export function applyOverlayPreviewDocumentState<
  THaloConfig extends object,
  TGuideMode extends string = string,
  TSelection = unknown
>(
  state: OverlayPreviewDocumentBridgeState<THaloConfig, TGuideMode, TSelection>,
  previewDocument: OverlayPreviewDocument<THaloConfig, TGuideMode>,
  adapter: OverlayPreviewDocumentBridgeAdapter<THaloConfig>
): void {
  applySourceDefaultSnapshotToState(state, previewDocument.document.state, adapter);
  state.documentProject = cloneOverlayDocumentProject(previewDocument.document.project);
  state.pendingCsvDraftsByBucket = { ...previewDocument.pendingCsvDraftsByBucket };
  state.presets = previewDocument.presets.map((preset) => clonePreset(preset));
  state.activePresetId = previewDocument.activePresetId && state.presets.some((preset) => preset.id === previewDocument.activePresetId)
    ? previewDocument.activePresetId
    : null;

  savePresets(state.presets);
  saveActivePresetId(state.activePresetId);
  saveOutputFormatKey(state.outputProfileKey, state.contentFormatKey);
}

export function resetOverlayPreviewDocumentState<
  THaloConfig extends object,
  TGuideMode extends string = string,
  TSelection = unknown
>(
  state: OverlayPreviewDocumentBridgeState<THaloConfig, TGuideMode, TSelection>,
  adapter: OverlayPreviewDocumentBridgeAdapter<THaloConfig>
): void {
  applySourceDefaultSnapshotToState(state, state.sourceDefaults, adapter);
  state.documentProject = createOverlayDocumentProjectFromSnapshot(state.sourceDefaults, {
    sceneFamilyKey: state.documentProject.sceneFamilyKey
  });
  state.pendingCsvDraftsByBucket = {};
  state.presets = [];
  state.activePresetId = null;

  savePresets(state.presets);
  saveActivePresetId(state.activePresetId);
  saveOutputFormatKey(state.outputProfileKey, state.contentFormatKey);
}