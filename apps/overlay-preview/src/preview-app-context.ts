/**
 * preview-app-context.ts — Typed context bag for the preview application.
 *
 * Defines the PreviewAppContext interface that section-builder panel modules
 * receive instead of capturing module-level closures from main.ts.
 * main.ts creates the concrete implementation and passes it to builders
 * through the section-definition factory wrappers.
 *
 * This is the state-sharing protocol that unblocks extracting section builders,
 * authoring controllers, and export controllers out of main.ts.
 */

import type {
  LogoPlacementSpec,
  TextFieldPlacementSpec,
  TextStyleSpec
} from "@brand-layout-ops/core-types";
import type {
  OverlayDocumentProject,
  OverlayContentSource,
  OverlayLayoutOperatorParams,
  OverlaySceneFamilyKey,
  OverlaySourceDefaultSnapshot
} from "@brand-layout-ops/operator-overlay-layout";
import type { HaloFieldConfig } from "@brand-layout-ops/operator-halo-field";
import type { ExportSettings, Preset } from "./sample-document.js";
import type { OverlayPreviewDocument as OverlayPreviewDocumentModel } from "./preview-document.js";
import type { DocumentWorkspaceController } from "./document-workspace.js";

// ——— Constants shared between main.ts and extracted panel modules ———

export const UNTITLED_DOCUMENT_NAME = "Untitled document";

// ——— Types shared between main.ts and extracted panel modules ———

export type Selection =
  | { kind: "text"; id: string }
  | { kind: "logo"; id: string };

export type GuideMode = "off" | "composition" | "baseline";

export type SourceDefaultSnapshot = OverlaySourceDefaultSnapshot<ExportSettings, HaloFieldConfig, GuideMode>;

export type OverlayPreviewDocument = OverlayPreviewDocumentModel<HaloFieldConfig, GuideMode>;

export interface PreviewState {
  params: OverlayLayoutOperatorParams;
  selected: Selection | null;
  guideMode: GuideMode;
  overlayVisible: boolean;
  pendingCsvDraftsByBucket: Record<string, string>;
  outputProfileKey: string;
  contentFormatKey: string;
  profileFormatBuckets: import("@brand-layout-ops/operator-overlay-layout").ProfileFormatBuckets;
  contentFormatKeyByProfile: import("@brand-layout-ops/operator-overlay-layout").ProfileContentFormatMap;
  presets: Preset[];
  activePresetId: string | null;
  exportSettings: ExportSettings;
  exportSettingsByProfile: Record<string, ExportSettings>;
  haloConfig: HaloFieldConfig;
  haloConfigByProfile: Record<string, HaloFieldConfig>;
  sourceDefaults: SourceDefaultSnapshot;
  documentProject: OverlayDocumentProject;
  isPlaying: boolean;
  playbackTimeSec: number;
}

/**
 * Scene-family preview state snapshot, returned by getSceneFamilyPreviewState().
 */
export interface SceneFamilyPreviewSnapshot {
  title: string;
  subtitle: string;
  stats: string[];
}

// ——— Context interface ———

/**
 * Typed context bag that extracted panel modules receive.
 * main.ts creates the concrete implementation and passes it via
 * section-definition factory wrappers.
 */
export interface PreviewAppContext {
  /** Mutable application state. Panel code reads and writes this directly. */
  readonly state: PreviewState;

  // — Render / UI rebuild cycle —

  /** Trigger a full async render (operator graph evaluation + SVG + authoring UI). */
  renderStage(): Promise<void>;
  /** Rebuild all accordion sections from the section registry. */
  buildConfigEditor(): void;
  /** Rebuild the output-profile options sub-panel. */
  buildOutputProfileOptions(): void;
  /** Rebuild the preset tabs list. */
  buildPresetTabs(): void;
  /** Resize the Three.js renderer to match current frame dimensions. */
  resizeRenderer(): void;
  /** Sync overlay visibility checkbox and layer display. */
  syncOverlayVisibilityUi(): void;
  /** Sync play/pause button text. */
  updatePlaybackToggleUi(): void;
  /** Sync document panel (name, status, recent list). */
  updateDocumentUi(): void;

  // — State mutation actions —

  /** Mark the current document as modified (dirty). */
  markDocumentDirty(): void;
  /** Set the current selection and rebuild the editor + authoring UI. */
  select(sel: Selection | null): void;
  /** Toggle playback on/off. */
  togglePlayback(): void;
  /** Set playback state explicitly. */
  setPlaybackPlaying(isPlaying: boolean): void;
  /** Toggle overlay visibility. */
  setOverlayVisible(visible: boolean): void;
  /** Normalize text field offsets after grid/baseline changes. */
  normalizeParamsTextFieldOffsets(params: OverlayLayoutOperatorParams): OverlayLayoutOperatorParams;
  /** Update export settings via an updater function. */
  updateExportSettings(updater: (settings: ExportSettings) => ExportSettings): void;

  // — Text / overlay mutations —

  /** Update a text field by ID via an updater. */
  updateTextField(id: string, updater: (f: TextFieldPlacementSpec) => TextFieldPlacementSpec): void;
  /** Update the logo via an updater. */
  updateLogo(updater: (l: LogoPlacementSpec) => LogoPlacementSpec): void;
  /** Update logo size preserving aspect ratio. */
  updateLogoSizeWithAspectRatio(heightPx: number): void;
  /** Get the current logo intrinsic aspect ratio. */
  getCurrentLogoAspectRatio(): number;
  /** Load intrinsic dimensions for a logo asset path. */
  loadLogoIntrinsicDimensions(path: string): Promise<void>;
  /** Apply a text style to the selected text field by style key. */
  applySelectedTextStyle(styleKey: string): void;
  /** Update a text style by key via an updater. */
  updateTextStyle(key: string, updater: (s: TextStyleSpec) => TextStyleSpec): void;
  /** Sync logo dimensions to a title font size (linked sizing). */
  syncLogoToTitleFontSize(titleFontSizePx: number): void;
  /** Sync title font size to a logo height (linked sizing). */
  syncTitleToLogoHeight(logoHeightPx: number): void;
  /** Get the displayed offset baselines for a text field. */
  getDisplayedTextFieldOffsetBaselines(field: TextFieldPlacementSpec): number;
  /** Get the resolved text value for a text field. */
  getResolvedTextFieldText(field: TextFieldPlacementSpec): string;
  /** Update the inline text value for a text field by ID. */
  updateSelectedTextValue(id: string, value: string): void;
  /** Get the selected text field, or null if no text is selected. */
  getSelectedTextField(): TextFieldPlacementSpec | null;
  /** Get the title string for the Selected Element accordion section. */
  getSelectedOverlaySectionTitle(): string;
  /** Create the Add Text / Delete Text action row for the overlay section. */
  createOverlayItemActionRow(): HTMLElement;

  // — Content format —

  /** Switch to a different content format key. */
  switchContentFormat(key: string): void;
  /** Stage a CSV draft for the current profile/format bucket. */
  setStagedCsvDraft(draft: string | null): void;
  /** Get the staged CSV draft for the current format, or null. */
  getStagedCsvDraft(): string | null;
  /** Whether the staged CSV draft differs from the applied draft. */
  hasStagedCsvDraft(): boolean;
  /** Apply the staged CSV draft to params. */
  applyStagedCsvDraft(): void;
  /** Discard the staged CSV draft. */
  discardStagedCsvDraft(): void;
  /** Get the content source for the current params ("inline" or "csv"). */
  getContentSource(): OverlayContentSource;
  /** Get effective params with any staged CSV draft applied. */
  getEffectiveParams(): OverlayLayoutOperatorParams;

  // — Preset / profile / document actions —

  /** Switch to a different output profile. */
  switchOutputProfile(key: string): void;
  /** Save the current state as a new preset. */
  saveCurrentAsPreset(name?: string): void;
  /** Update the active preset with current state. */
  updateActivePreset(): void;
  /** Get the currently active preset, or undefined. */
  getActivePreset(): Preset | undefined;
  /** Export a preset to a JSON file download. */
  exportPreset(preset: Preset): void;
  /** Import presets from file input. Returns true if any were imported. */
  importPresetsFromFiles(files: FileList | null): Promise<boolean>;
  /** Delete a preset by ID. */
  deletePreset(id: string): void;
  /** Load a preset (apply its state). */
  loadPreset(preset: Preset): void;

  // — Source defaults —

  /** Apply a source-default snapshot to state. */
  applySourceDefaultSnapshot(snapshot: SourceDefaultSnapshot): void;
  /** Write current state as the source default (HTTP POST to dev server). */
  writeCurrentAsSourceDefault(): Promise<void>;
  /** Show a status message in the source-default area. */
  setSourceDefaultStatus(message: string, severity?: string): void;

  // — Scene family —

  /** Get the preview state snapshot for the current scene family. */
  getSceneFamilyPreviewState(): SceneFamilyPreviewSnapshot | null;
  /** Get a human-readable label for a scene family key. */
  getSceneFamilyLabel(key: OverlaySceneFamilyKey): string;

  // — Document targets —

  /** Add a new document target. Returns true if successful. */
  addDocumentTarget(): boolean;
  /** Remove the active document target. Returns true if successful. */
  removeActiveDocumentTarget(): boolean;
  /** Set the active document target by ID. */
  setActiveDocumentTarget(id: string): void;
  /** Update the label of the active document target. */
  updateActiveDocumentTargetLabel(label: string): void;
  /** Update the output profile of the active document target. */
  updateActiveDocumentTargetProfile(profileKey: string): void;
  /** Get profile keys not yet used by any document target, optionally excluding one. */
  getUnusedDocumentTargetProfileKeys(exclude?: string): string[];
  /** Get the default label for a document target profile key. */
  getDefaultDocumentTargetLabel(profileKey: string): string;

  // — Document workspace —

  /** The document workspace controller for file I/O operations. */
  readonly documentWorkspace: DocumentWorkspaceController<OverlayPreviewDocument>;
  /** Normalize a document name for display. */
  getNormalizedDocumentName(name: string): string;

  // — Export —

  /** Export the current frame as a composed PNG. */
  exportComposedFramePng(): Promise<void>;
  /** Export a PNG sequence with a frame-range modal. */
  exportPngSequence(): Promise<void>;
}
