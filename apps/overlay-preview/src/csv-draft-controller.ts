/**
 * csv-draft-controller.ts — CSV draft staging, committing, and flushing.
 *
 * Manages the per-bucket CSV draft staging workflow: edits are staged per
 * (profileKey, formatKey) bucket, committed across profile-format buckets
 * on flush, and written to the dev-server authoring endpoint.
 */

import {
  DEFAULT_OVERLAY_FORMAT_OVERRIDES,
  normalizeOverlayParamsForEditing,
  type OverlayLayoutOperatorParams
} from "@brand-layout-ops/operator-overlay-layout";
import { OUTPUT_PROFILES } from "@brand-layout-ops/core-types";
import { cloneOverlayParams } from "./sample-document.js";
import type { PreviewState } from "./preview-app-context.js";

// ——— Constants ———

const CSV_AUTHORING_ENDPOINT = "/__authoring/overlay-csv";

// ——— Dependency interface ———

export interface CsvDraftControllerDeps {
  readonly state: PreviewState;
  getProfileFormatBucket(profileKey: string): Record<string, OverlayLayoutOperatorParams>;
  getOrCreateProfileFormatParams(profileKey: string, formatKey: string): OverlayLayoutOperatorParams;
  markDocumentDirty(): void;
}

// ——— Controller ———

export interface CsvDraftController {
  getCsvDraftBucketKey(profileKey?: string, formatKey?: string): string;
  getStagedCsvDraft(profileKey?: string, formatKey?: string): string | null;
  setStagedCsvDraft(draft: string | null, profileKey?: string, formatKey?: string): void;
  hasStagedCsvDraft(): boolean;
  commitCsvDraftToProfileFormat(profileKey: string, formatKey: string, draft: string): void;
  syncCsvDraftAcrossFormatBuckets(formatKey: string, draft: string): void;
  flushPendingCsvDrafts(): Promise<string[]>;
  applyStagedCsvDraft(): void;
  discardStagedCsvDraft(): void;
  getOverlayFormatCsvPath(formatKey: string): string | null;
}

export function createCsvDraftController(deps: CsvDraftControllerDeps): CsvDraftController {
  const { state } = deps;

  function normalizeParamsTextFieldOffsets(params: OverlayLayoutOperatorParams): OverlayLayoutOperatorParams {
    return normalizeOverlayParamsForEditing(params);
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

  function parseCsvDraftBucketKey(bucketKey: string): { profileKey: string; formatKey: string } | null {
    const separatorIndex = bucketKey.indexOf("::");
    if (separatorIndex <= 0 || separatorIndex >= bucketKey.length - 2) {
      return null;
    }
    return {
      profileKey: bucketKey.slice(0, separatorIndex),
      formatKey: bucketKey.slice(separatorIndex + 2)
    };
  }

  function normalizeCsvDraftForWrite(draft: string): string {
    return String(draft || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  function getOverlayFormatCsvPath(formatKey: string): string | null {
    const csvPath = DEFAULT_OVERLAY_FORMAT_OVERRIDES[formatKey]?.csvPath?.trim();
    return csvPath && csvPath.length > 0 ? csvPath : null;
  }

  function getProfileKeysForCsvFormat(formatKey: string): string[] {
    const profileKeys = new Set<string>([
      state.outputProfileKey,
      ...Object.keys(state.profileFormatBuckets),
      ...Object.keys(state.contentFormatKeyByProfile)
    ]);
    return Array.from(profileKeys).filter((profileKey) => {
      const profileBucket = state.profileFormatBuckets[profileKey];
      return Boolean(profileBucket?.[formatKey])
        || (profileKey === state.outputProfileKey && state.contentFormatKey === formatKey);
    });
  }

  function commitCsvDraftToProfileFormat(profileKey: string, formatKey: string, draft: string): void {
    const isActiveBucket = profileKey === state.outputProfileKey && formatKey === state.contentFormatKey;
    const baseParams = isActiveBucket
      ? state.params
      : deps.getOrCreateProfileFormatParams(profileKey, formatKey);
    const nextParams = normalizeParamsTextFieldOffsets({
      ...cloneOverlayParams(baseParams),
      csvContent: {
        draft,
        rowIndex: baseParams.csvContent?.rowIndex ?? 1
      }
    });
    deps.getProfileFormatBucket(profileKey)[formatKey] = cloneOverlayParams(nextParams);
    if (isActiveBucket) {
      state.params = nextParams;
    }
  }

  function syncCsvDraftAcrossFormatBuckets(formatKey: string, draft: string): void {
    for (const profileKey of getProfileKeysForCsvFormat(formatKey)) {
      commitCsvDraftToProfileFormat(profileKey, formatKey, draft);
    }
  }

  function hasStagedCsvDraft(): boolean {
    const stagedCsvDraft = getStagedCsvDraft();
    return stagedCsvDraft !== null &&
      stagedCsvDraft !== (state.params.csvContent?.draft ?? "");
  }

  async function flushPendingCsvDrafts(): Promise<string[]> {
    const pendingEntries = Object.entries(state.pendingCsvDraftsByBucket);
    if (pendingEntries.length === 0) {
      return [];
    }

    const batchesByPath = new Map<string, {
      csvPath: string;
      draft: string;
      bucketInfos: Array<{ bucketKey: string; profileKey: string; formatKey: string }>;
    }>();

    for (const [bucketKey, rawDraft] of pendingEntries) {
      const bucketInfo = parseCsvDraftBucketKey(bucketKey);
      if (!bucketInfo) {
        throw new Error(`Invalid staged CSV bucket key: ${bucketKey}.`);
      }

      const csvPath = getOverlayFormatCsvPath(bucketInfo.formatKey);
      if (!csvPath) {
        throw new Error(`No CSV path is configured for ${bucketInfo.formatKey}.`);
      }

      const draft = normalizeCsvDraftForWrite(rawDraft);
      const existingBatch = batchesByPath.get(csvPath);
      if (existingBatch && existingBatch.draft !== draft) {
        const conflictingBuckets = Array.from(new Set([
          ...existingBatch.bucketInfos.map((info) => `${OUTPUT_PROFILES[info.profileKey]?.label ?? info.profileKey} / ${info.formatKey}`),
          `${OUTPUT_PROFILES[bucketInfo.profileKey]?.label ?? bucketInfo.profileKey} / ${bucketInfo.formatKey}`
        ]));
        throw new Error(
          `Conflicting staged CSV drafts target ${csvPath}. Resolve ${conflictingBuckets.join(", ")} before writing source defaults.`
        );
      }

      const batch = existingBatch ?? {
        csvPath,
        draft,
        bucketInfos: []
      };
      batch.bucketInfos.push({ bucketKey, ...bucketInfo });
      batchesByPath.set(csvPath, batch);
    }

    const savedPaths: string[] = [];

    for (const batch of batchesByPath.values()) {
      const response = await fetch(CSV_AUTHORING_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetPath: batch.csvPath,
          draft: batch.draft
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || `CSV writeback failed with HTTP ${response.status}.`);
      }

      const formatKeys = new Set(batch.bucketInfos.map((info) => info.formatKey));
      for (const formatKey of formatKeys) {
        syncCsvDraftAcrossFormatBuckets(formatKey, batch.draft);
      }
      for (const info of batch.bucketInfos) {
        setStagedCsvDraft(null, info.profileKey, info.formatKey);
      }

      savedPaths.push(String(payload?.path || batch.csvPath));
    }

    return Array.from(new Set(savedPaths));
  }

  function applyStagedCsvDraft(): void {
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
    deps.markDocumentDirty();
  }

  function discardStagedCsvDraft(): void {
    setStagedCsvDraft(null);
    deps.markDocumentDirty();
  }

  return {
    getCsvDraftBucketKey,
    getStagedCsvDraft,
    setStagedCsvDraft,
    hasStagedCsvDraft,
    commitCsvDraftToProfileFormat,
    syncCsvDraftAcrossFormatBuckets,
    flushPendingCsvDrafts,
    applyStagedCsvDraft,
    discardStagedCsvDraft,
    getOverlayFormatCsvPath
  };
}
