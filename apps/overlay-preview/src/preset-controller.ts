/**
 * preset-controller.ts - Preset persistence, loading, and tabs UI rebuild.
 *
 * Owns preset CRUD, import/export, active-preset application, and the preset
 * tab list so main.ts can stay closer to composition wiring.
 */

import {
  DEFAULT_OUTPUT_PROFILE_KEY,
  getOutputProfile
} from "@brand-layout-ops/core-types";
import {
  cloneProfileContentFormatMap,
  cloneProfileFormatBuckets,
  normalizeOverlayProfileBucketState,
  type OverlayLayoutOperatorParams
} from "@brand-layout-ops/operator-overlay-layout";
import {
  getHaloConfigForProfile,
  type HaloFieldConfig
} from "@brand-layout-ops/operator-halo-field";

import {
  getNextVersionedPresetFileName
} from "./export-controller.js";
import type { PreviewState } from "./preview-app-context.js";
import {
  cloneExportSettingsByProfile,
  cloneHaloConfigByProfile
} from "./preview-document-bridge.js";
import {
  cloneOverlayParams,
  createDefaultExportSettings,
  createPresetId,
  denormalizePresetFromPersistence,
  getNextPresetName,
  normalizePresetForPersistence,
  saveActivePresetId,
  savePresets,
  type ExportSettings,
  type PersistedPreset,
  type Preset
} from "./sample-document.js";

export interface PresetControllerDeps {
  readonly state: PreviewState;
  readonly initialFormatKey: string;
  getEffectiveParams(): OverlayLayoutOperatorParams;
  normalizeParamsTextFieldOffsets(params: OverlayLayoutOperatorParams): OverlayLayoutOperatorParams;
  getOrCreateProfileFormatParams(profileKey: string, formatKey: string): OverlayLayoutOperatorParams;
  getOrCreateExportSettingsForProfile(profileKey: string): ExportSettings;
  persistActiveProfileBuckets(): void;
  persistActiveExportSettings(): void;
  persistActiveHaloConfig(): void;
  normalizeSelection(): void;
  syncHaloConfigToProfile(profileKey: string): void;
  syncDocumentProjectToCurrentOutputProfile(): void;
  getPresetTabs(): HTMLElement | null;
  markDocumentDirty(): void;
  buildOutputProfileOptions(): void;
  buildConfigEditor(): void;
  resizeRenderer(): void;
  renderStage(): Promise<void>;
  setStatusMessage?(message: string, severity?: "neutral" | "success" | "error"): void;
}

export interface PresetController {
  getActivePreset(): Preset | undefined;
  saveCurrentAsPreset(name?: string): void;
  updateActivePreset(): void;
  exportPreset(preset: Preset): Promise<void>;
  importPresetsFromFiles(files: FileList | null): Promise<boolean>;
  loadPreset(preset: Preset): void;
  deletePreset(presetId: string): void;
  buildPresetTabs(): void;
}

export function createPresetController(deps: PresetControllerDeps): PresetController {
  const { state } = deps;

  function buildCurrentPresetPayload(overrides?: Partial<Pick<Preset, "id" | "name">>): Preset {
    deps.persistActiveProfileBuckets();
    deps.persistActiveExportSettings();
    deps.persistActiveHaloConfig();
    return {
      id: overrides?.id ?? createPresetId(),
      name: overrides?.name ?? getNextPresetName(state.presets),
      config: cloneOverlayParams(deps.getEffectiveParams()),
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

  function saveCurrentAsPreset(name?: string): void {
    const preset = buildCurrentPresetPayload(name ? { name } : undefined);
    state.presets = [...state.presets, preset];
    state.activePresetId = preset.id;
    savePresets(state.presets);
    saveActivePresetId(preset.id);
  }

  function updateActivePreset(): void {
    if (!state.activePresetId) {
      return;
    }

    const index = state.presets.findIndex((preset) => preset.id === state.activePresetId);
    if (index === -1) {
      return;
    }

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

  async function exportPreset(preset: Preset): Promise<void> {
    const persistedPreset = normalizePresetForPersistence(preset);
    const json = JSON.stringify(persistedPreset, null, 2);
    const slug = sanitizePresetFileName(preset.name).toLowerCase();
    const profile = getOutputProfile(state.outputProfileKey);
    const dimensionsFolder = `${profile.widthPx}x${profile.heightPx}`;

    if ("showDirectoryPicker" in window) {
      try {
        const rootDir: FileSystemDirectoryHandle = await (window as Window & {
          showDirectoryPicker(options?: { mode?: string }): Promise<FileSystemDirectoryHandle>;
        }).showDirectoryPicker({ mode: "readwrite" });
        const presetsDir = rootDir.name.toLowerCase() === "presets"
          ? rootDir
          : await rootDir.getDirectoryHandle("presets", { create: true });
        const dimDir = await presetsDir.getDirectoryHandle(dimensionsFolder, { create: true });
        const fileName = await getNextVersionedPresetFileName(dimDir, slug);
        const fileHandle = await dimDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(json);
        await writable.close();

        const basePath = rootDir.name.toLowerCase() === "presets"
          ? rootDir.name
          : `${rootDir.name}/${presetsDir.name}`;
        deps.setStatusMessage?.(`Exported "${preset.name}" to ${basePath}/${dimensionsFolder}/${fileName}`, "success");
        return;
      } catch {
        // User cancelled - fall through to blob download.
      }
    }

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug}.json`;
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

  async function importPresetsFromFiles(files: FileList | null): Promise<boolean> {
    if (!files || files.length === 0) {
      return false;
    }

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

    if (importedPresets.length === 0) {
      return false;
    }

    state.presets = [...state.presets, ...importedPresets];
    const lastImportedPreset = importedPresets[importedPresets.length - 1];
    loadPreset(lastImportedPreset);
    savePresets(state.presets);
    return true;
  }

  function loadPreset(preset: Preset): void {
    const normalizedProfileState = normalizeOverlayProfileBucketState({
      outputProfileKey: preset.outputProfileKey ?? DEFAULT_OUTPUT_PROFILE_KEY,
      contentFormatKey: preset.contentFormatKey ?? deps.initialFormatKey,
      profileFormatBuckets: preset.profileFormatBuckets ?? {
        [preset.outputProfileKey ?? DEFAULT_OUTPUT_PROFILE_KEY]: {
          [preset.contentFormatKey ?? deps.initialFormatKey]: cloneOverlayParams(preset.config)
        }
      },
      contentFormatKeyByProfile: preset.contentFormatKeyByProfile ?? {
        [preset.outputProfileKey ?? DEFAULT_OUTPUT_PROFILE_KEY]: preset.contentFormatKey ?? deps.initialFormatKey
      }
    });
    state.outputProfileKey = normalizedProfileState.outputProfileKey;
    state.profileFormatBuckets = normalizedProfileState.profileFormatBuckets;
    state.contentFormatKeyByProfile = normalizedProfileState.contentFormatKeyByProfile;
    state.contentFormatKey = normalizedProfileState.contentFormatKey;
    state.params = deps.normalizeParamsTextFieldOffsets(cloneOverlayParams(
      deps.getOrCreateProfileFormatParams(state.outputProfileKey, state.contentFormatKey)
    ));
    state.activePresetId = preset.id;
    state.pendingCsvDraftsByBucket = {};
    state.exportSettingsByProfile = cloneExportSettingsByProfile(preset.exportSettingsByProfile ?? {
      [state.outputProfileKey]: createDefaultExportSettings(state.outputProfileKey)
    });
    state.exportSettings = deps.getOrCreateExportSettingsForProfile(state.outputProfileKey);
    state.haloConfigByProfile = isRecord(preset.haloConfigByProfile)
      ? Object.fromEntries(
        Object.entries(preset.haloConfigByProfile).map(([profileKey, rawHaloConfig]) => [
          profileKey,
          getHaloConfigForProfile(profileKey, rawHaloConfig)
        ])
      )
      : {
        [state.outputProfileKey]: getHaloConfigForProfile(state.outputProfileKey)
      };
    deps.normalizeSelection();
    deps.syncHaloConfigToProfile(state.outputProfileKey);
    deps.syncDocumentProjectToCurrentOutputProfile();
    saveActivePresetId(preset.id);
  }

  function deletePreset(presetId: string): void {
    state.presets = state.presets.filter((preset) => preset.id !== presetId);
    if (state.activePresetId === presetId) {
      state.activePresetId = null;
    }

    savePresets(state.presets);
    saveActivePresetId(state.activePresetId);
  }

  function updatePresetToolbarState(): void {
    const hasActivePreset = Boolean(getActivePreset());
    const activePresetDirty = isActivePresetDirty();
    const updateButton = document.querySelector<HTMLButtonElement>("[data-preset-update]");
    const exportButton = document.querySelector<HTMLButtonElement>("[data-preset-export]");
    const deleteButton = document.querySelector<HTMLButtonElement>("[data-preset-delete]");

    if (updateButton) {
      updateButton.disabled = !hasActivePreset || !activePresetDirty;
    }
    if (exportButton) {
      exportButton.disabled = !hasActivePreset;
    }
    if (deleteButton) {
      deleteButton.disabled = !hasActivePreset;
    }
  }

  function buildPresetTabs(): void {
    const container = deps.getPresetTabs();
    if (!container) {
      return;
    }

    container.innerHTML = "";

    if (state.presets.length === 0) {
      const empty = document.createElement("p");
      empty.className = "bf-form-help bf-u-no-margin--bottom";
      empty.textContent = "No presets saved yet.";
      container.append(empty);
      updatePresetToolbarState();
      return;
    }

    const list = document.createElement("div");
    list.className = "bf-choice-list bf-stack preview-stack--compact";

    for (const preset of state.presets) {
      const row = document.createElement("label");
      row.className = "bf-choice-row";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "preset";
      radio.value = preset.id;
      radio.checked = preset.id === state.activePresetId;
      radio.addEventListener("change", () => {
        loadPreset(preset);
        deps.markDocumentDirty();
        deps.buildOutputProfileOptions();
        buildPresetTabs();
        deps.buildConfigEditor();
        deps.resizeRenderer();
        void deps.renderStage();
      });

      const nameSpan = document.createElement("span");
      nameSpan.className = "bf-choice-row-name";
      nameSpan.textContent = preset.name;

      const statusSpan = document.createElement("span");
      statusSpan.className = "bf-choice-row-meta";
      statusSpan.textContent = preset.id === state.activePresetId
        ? (isActivePresetDirty() ? "Active \u2022 Dirty" : "Active")
        : "";

      row.append(radio, nameSpan, statusSpan);
      list.append(row);
    }

    container.append(list);
    updatePresetToolbarState();
  }

  return {
    getActivePreset,
    saveCurrentAsPreset,
    updateActivePreset,
    exportPreset,
    importPresetsFromFiles,
    loadPreset,
    deletePreset,
    buildPresetTabs
  };
}