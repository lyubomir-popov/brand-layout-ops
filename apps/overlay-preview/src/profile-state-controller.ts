import { OVERLAY_CONTENT_FORMAT_ORDER } from "@brand-layout-ops/core-types";
import type { HaloFieldConfig } from "@brand-layout-ops/operator-halo-field";
import {
  createDefaultOverlayParams,
  normalizeOverlayProfileBucketState,
  seedOverlayFormatVariantParams,
  syncOverlayParamsFrameToProfile,
  syncOverlaySharedProfileParams,
  type OverlayLayoutOperatorParams
} from "@brand-layout-ops/operator-overlay-layout";

import type { PreviewState } from "./preview-app-context.js";
import { cloneOverlayParams, type ExportSettings } from "./sample-document.js";

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface ProfileStateControllerOptions {
  readonly state: PreviewState;
  createDefaultExportSettings(profileKey: string): ExportSettings;
  getHaloConfigForProfile(profileKey: string): HaloFieldConfig;
  normalizeParamsTextFieldOffsets(params: OverlayLayoutOperatorParams): OverlayLayoutOperatorParams;
  getEffectiveParams(): OverlayLayoutOperatorParams;
  normalizeSelection(): void;
  resizeRenderer(): void;
  syncDocumentProjectToCurrentOutputProfile(): void;
  saveOutputFormatKey(profileKey: string, formatKey: string): void;
}

export interface ProfileStateController {
  getProfileFormatBucket(profileKey: string): Record<string, OverlayLayoutOperatorParams>;
  getOrCreateExportSettingsForProfile(profileKey: string): ExportSettings;
  getOrCreateHaloConfigForProfile(profileKey: string): HaloFieldConfig;
  persistActiveExportSettings(): void;
  persistActiveHaloConfig(): void;
  updateExportSettings(updater: (settings: ExportSettings) => ExportSettings): void;
  persistActiveProfileBuckets(): void;
  getOrCreateProfileFormatParams(profileKey: string, formatKey: string): OverlayLayoutOperatorParams;
  syncHaloConfigToProfile(profileKey: string): void;
  switchOutputProfile(profileKey: string): void;
  switchContentFormat(formatKey: string): void;
}

export function createProfileStateController(
  options: ProfileStateControllerOptions
): ProfileStateController {
  const { state } = options;

  function getProfileFormatBucket(profileKey: string): Record<string, OverlayLayoutOperatorParams> {
    if (!state.profileFormatBuckets[profileKey]) {
      state.profileFormatBuckets[profileKey] = {};
    }

    return state.profileFormatBuckets[profileKey];
  }

  function getDocumentFormatByProfileKey(profileKey: string) {
    return state.documentProject.targets.find((target) => target.outputProfileKey === profileKey) ?? null;
  }

  function getDocumentFormatById(formatId: string | null | undefined) {
    if (!formatId) {
      return null;
    }

    return state.documentProject.targets.find((target) => target.id === formatId) ?? null;
  }

  function getOrCreateExportSettingsForProfile(profileKey: string): ExportSettings {
    if (!state.exportSettingsByProfile[profileKey]) {
      state.exportSettingsByProfile[profileKey] = options.createDefaultExportSettings(profileKey);
    }

    return cloneJson(state.exportSettingsByProfile[profileKey]);
  }

  function getOrCreateHaloConfigForProfile(profileKey: string): HaloFieldConfig {
    if (!state.haloConfigByProfile[profileKey]) {
      state.haloConfigByProfile[profileKey] = options.getHaloConfigForProfile(profileKey);
    }

    return cloneJson(state.haloConfigByProfile[profileKey]);
  }

  function persistActiveExportSettings(): void {
    state.exportSettingsByProfile[state.outputProfileKey] = cloneJson(state.exportSettings);
  }

  function persistActiveHaloConfig(): void {
    state.haloConfigByProfile[state.outputProfileKey] = cloneJson(state.haloConfig);
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
      const existing = profileBucket[formatKey] ?? cloneOverlayParams(syncOverlayParamsFrameToProfile(
        state.params,
        state.outputProfileKey
      ));
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

    const created = syncOverlayParamsFrameToProfile(state.params, profileKey);
    const seeded = {
      ...cloneOverlayParams(created),
      contentFormatKey: formatKey
    };
    const nextParams = syncOverlaySharedProfileParams(seeded, created, profileKey);
    profileBucket[formatKey] = cloneOverlayParams(nextParams);
    return nextParams;
  }

  function getOrCreateOutputProfileFormatParams(
    profileKey: string,
    formatKey: string
  ): OverlayLayoutOperatorParams {
    const profileBucket = getProfileFormatBucket(profileKey);
    const existing = profileBucket[formatKey];
    if (existing) {
      return syncOverlayParamsFrameToProfile(existing, profileKey);
    }

    const targetFormat = getDocumentFormatByProfileKey(profileKey);
    const targetSeed = createDefaultOverlayParams(profileKey, formatKey);
    const sourceFormat = getDocumentFormatById(targetFormat?.derivedFromFormatId);

    if (!sourceFormat) {
      profileBucket[formatKey] = cloneOverlayParams(targetSeed);
      return targetSeed;
    }

    const sourceParams = state.profileFormatBuckets[sourceFormat.outputProfileKey]?.[formatKey]
      ? cloneOverlayParams(state.profileFormatBuckets[sourceFormat.outputProfileKey][formatKey])
      : createDefaultOverlayParams(sourceFormat.outputProfileKey, formatKey);

    const nextParams = seedOverlayFormatVariantParams(sourceParams, targetSeed, profileKey, {
      preserveTargetSafeArea: Boolean(targetFormat?.formatPresetKey),
      preserveTargetGrid: Boolean(targetFormat?.formatPresetKey)
    });

    profileBucket[formatKey] = cloneOverlayParams(nextParams);
    return nextParams;
  }

  function syncHaloConfigToProfile(profileKey: string): void {
    state.haloConfig = getOrCreateHaloConfigForProfile(profileKey);
  }

  function switchOutputProfile(profileKey: string): void {
    if (profileKey === state.outputProfileKey) {
      return;
    }

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
    state.params = options.normalizeParamsTextFieldOffsets(
      cloneOverlayParams(getOrCreateOutputProfileFormatParams(state.outputProfileKey, state.contentFormatKey))
    );
    state.exportSettings = getOrCreateExportSettingsForProfile(state.outputProfileKey);
    options.normalizeSelection();
    syncHaloConfigToProfile(state.outputProfileKey);
    options.resizeRenderer();
    options.syncDocumentProjectToCurrentOutputProfile();
    options.saveOutputFormatKey(state.outputProfileKey, state.contentFormatKey);
  }

  function switchContentFormat(formatKey: string): void {
    if (formatKey === state.contentFormatKey) {
      return;
    }

    persistActiveProfileBuckets();
    const nextParams = syncOverlaySharedProfileParams(
      options.getEffectiveParams(),
      getOrCreateProfileFormatParams(state.outputProfileKey, formatKey),
      state.outputProfileKey
    );

    getProfileFormatBucket(state.outputProfileKey)[formatKey] = cloneOverlayParams(nextParams);
    state.contentFormatKey = formatKey;
    state.contentFormatKeyByProfile[state.outputProfileKey] = formatKey;
    state.params = options.normalizeParamsTextFieldOffsets(cloneOverlayParams(nextParams));
    options.normalizeSelection();
    options.saveOutputFormatKey(state.outputProfileKey, state.contentFormatKey);
  }

  return {
    getProfileFormatBucket,
    getOrCreateExportSettingsForProfile,
    getOrCreateHaloConfigForProfile,
    persistActiveExportSettings,
    persistActiveHaloConfig,
    updateExportSettings,
    persistActiveProfileBuckets,
    getOrCreateProfileFormatParams,
    syncHaloConfigToProfile,
    switchOutputProfile,
    switchContentFormat
  };
}