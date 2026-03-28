import type { TextFieldPlacementSpec } from "@brand-layout-ops/core-types";
import {
  DEFAULT_OUTPUT_PROFILE_KEY,
  getOutputProfile,
  OVERLAY_CONTENT_FORMAT_ORDER
} from "@brand-layout-ops/core-types";
import {
  cloneProfileContentFormatMap,
  cloneProfileFormatBuckets,
  createDefaultOverlayParams,
  type ProfileContentFormatMap,
  type ProfileFormatBuckets,
  type OverlayLayoutOperatorParams
} from "@brand-layout-ops/operator-overlay-layout";

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

