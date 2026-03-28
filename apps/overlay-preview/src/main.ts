/**
 * main.ts ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Overlay-preview application entry point.
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
  createOverlayDocumentProjectFromSnapshot,
  cloneOverlaySourceDefaultSnapshot,
  cloneProfileContentFormatMap,
  cloneProfileFormatBuckets,
  createBuiltInOverlaySourceDefaultSnapshot,
  createDefaultOverlayParams,
  createOverlayLayoutOperator,
  getOverlayFieldDisplayLabel,
  getOverlayMainHeadingField,
  getOverlayStyleDisplayLabel,
  inspectOverlayCsvDraft,
  normalizeOverlayProfileBucketState,
  normalizeOverlayParamsForEditing,
  normalizeOverlayTextFieldOffsetBaselines,
  OVERLAY_SCENE_FAMILY_ORDER,
  OVERLAY_LAYOUT_OPERATOR_KEY,
  resolveOverlayContentFormatKeyForProfile,
  resolveOverlayTextValue,
  sanitizeOverlaySourceDefaultSnapshot,
  setOverlayTextValue,
  syncOverlayParamsFrameToProfile,
  syncOverlaySharedProfileParams,
  type OverlayDocumentProject,
  type OverlayDocumentTarget,
  type OverlaySceneFamilyKey,
  type OverlayContentSource,
  type OverlayLayoutOperatorParams,
  type OverlaySourceDefaultSnapshot,
  type ProfileContentFormatMap,
  type ProfileFormatBuckets
} from "@brand-layout-ops/operator-overlay-layout";
import {
  createDefaultHaloFieldConfig,
  createHaloFieldConfigForProfile,
  type HaloFieldConfig
} from "@brand-layout-ops/operator-halo-field";
import {
  buildAccordionSectionEl,
  createCheckboxFormGroup,
  createCheckboxInput,
  createFormGroup,
  createNumberInput,
  createParameterSectionRegistry,
  createReadonlySpan,
  createSelectInput,
  createSliderInput,
  setupAccordion,
  wrapCol,
  type ParameterSectionDefinition
} from "@brand-layout-ops/parameter-ui";

import { createHaloRenderer, type HaloRenderer } from "./halo-renderer.js";
import {
  createGuideMarkup,
  createLogoMarkup,
  createSafeAreaMarkup,
  createTextMarkup,
  escapeXml
} from "./svg-overlay-adapter.js";
import {
  buildSceneFamilyPreviewState,
  clearSceneFamilyPreviewCanvas,
  renderSceneFamilyPreviewFrame
} from "./scene-family-preview.js";
import {
  cloneOverlayParams,
  createDefaultExportSettings,
  createPresetId,
  denormalizePresetFromPersistence,
  getNextPresetName,
  loadOutputFormatKeys,
  normalizePresetForPersistence,
  saveActivePresetId,
  savePresets,
  saveOutputFormatKey,
  type ExportSettings,
  type PersistedPreset,
  type Preset
} from "./sample-document.js";
import {
  denormalizeOverlayPreviewDocumentFromPersistence,
  type PersistedOverlayPreviewDocument
} from "./preview-document.js";
import {
  applyOverlayPreviewDocumentState,
  applySourceDefaultSnapshotToState,
  buildOverlayPreviewDocument,
  buildOverlayPreviewDocumentPersistence,
  cloneExportSettingsByProfile,
  cloneHaloConfigByProfile,
  createCurrentSourceDefaultSnapshot as createCurrentSourceDefaultSnapshotFromState,
  resetOverlayPreviewDocumentState
} from "./preview-document-bridge.js";
import {
  createDocumentWorkspaceController,
  renderDocumentWorkspaceUi
} from "./document-workspace.js";
import type {
  PreviewAppContext,
  PreviewState,
  Selection,
  GuideMode,
  SourceDefaultSnapshot,
  OverlayPreviewDocument
} from "./preview-app-context.js";
import { UNTITLED_DOCUMENT_NAME } from "./preview-app-context.js";
import { buildHaloConfigSection } from "./halo-config-section.js";
import { buildGridSection } from "./grid-section.js";
import { buildPlaybackExportSection } from "./playback-export-section.js";
import { buildDocumentSection } from "./document-section.js";
import { buildOutputFormatSection } from "./output-format-section.js";
import { buildPresetsSection } from "./presets-section.js";
import { buildContentFormatSection } from "./content-format-section.js";
import { buildOverlaySection } from "./overlay-section.js";
import { buildParagraphStylesSection } from "./paragraph-styles-section.js";

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Types ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Operator registry ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

const PREVIEW_NODE_ID = "overlay-preview";
const registry = new OperatorRegistry();
registry.register(createOverlayLayoutOperator());

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ State ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

const INITIAL_PROFILE_KEY = "instagram_1080x1350";
const INITIAL_FORMAT_KEY = "generic_social";
const _persistedFormat = loadOutputFormatKeys();
const _startProfileKey = _persistedFormat?.profileKey ?? INITIAL_PROFILE_KEY;
const _startFormatKey = _persistedFormat?.formatKey ?? INITIAL_FORMAT_KEY;
const INITIAL_PARAMS = createDefaultOverlayParams(_startProfileKey, _startFormatKey);
const SOURCE_DEFAULT_AUTHORING_ENDPOINT = "/__authoring/source-default-config";
const SOURCE_DEFAULT_ASSET_PATH = "/assets/source-default-config.json";
const CONTROL_PANEL_WIDTH_STORAGE_KEY = "brand-layout-ops-control-panel-width-v1";
const CONTROL_PANEL_WIDTH_STEP_PX = 16;
const previewTextMeasurer = createApproximateTextMeasurer();

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
  presets: [],
  activePresetId: null,
  exportSettings: createDefaultExportSettings(_startProfileKey),
  exportSettingsByProfile: {
    [_startProfileKey]: createDefaultExportSettings(_startProfileKey)
  },
  haloConfig: getHaloConfigForProfile(_startProfileKey),
  haloConfigByProfile: {
    [_startProfileKey]: getHaloConfigForProfile(_startProfileKey)
  },
  sourceDefaults: cloneOverlaySourceDefaultSnapshot(INITIAL_SOURCE_DEFAULTS),
  documentProject: createOverlayDocumentProjectFromSnapshot(INITIAL_SOURCE_DEFAULTS),
  isPlaying: true,
  playbackTimeSec: 0
};

const previewDocumentBridge = {
  persistActiveProfileBuckets,
  persistActiveExportSettings,
  persistActiveHaloConfig,
  getOrCreateProfileFormatParams,
  normalizeParams: normalizeParamsTextFieldOffsets,
  syncHaloConfigToProfile
};

const documentWorkspaceController = createDocumentWorkspaceController<OverlayPreviewDocument>({
  untitledName: UNTITLED_DOCUMENT_NAME,
  initialStatusMessage: "Open or save a local document file. Presets are stored in the document when you save it.",
  parseDocument: sanitizePreviewDocument,
  getDocumentMetadata: (previewDocument) => previewDocument.document.metadata,
  buildPersistedDocument: buildCurrentDocumentPersistence,
  applyDocument: applyPreviewDocumentToState,
  applyNewDocumentState,
  onWorkspaceChange: () => {
    updateDocumentUi();
  }
});

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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Logo intrinsic dimension loading ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ DOM references ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

const $ = <T extends Element>(sel: string): T | null => document.querySelector<T>(sel);

function getStageEl(): HTMLElement | null { return $("[data-stage]"); }
function getAppShellEl(): HTMLElement | null { return document.querySelector<HTMLElement>(".mascot-app"); }
function getCanvasEl(): HTMLCanvasElement | null { return $("[data-stage-canvas]"); }
function getTextOverlayCanvas(): HTMLCanvasElement | null { return $("[data-text-overlay]"); }
function getSvgOverlay(): SVGSVGElement | null { return $("[data-svg-overlay]"); }
function getAuthoringLayerEl(): HTMLElement | null { return $("[data-authoring-layer]"); }
function getConfigEditor(): HTMLElement | null { return $("[data-config-editor]"); }
function getOutputProfileOptions(): HTMLElement | null { return $("[data-output-profile-options]"); }
function getPresetTabs(): HTMLElement | null { return $("[data-preset-tabs]"); }
function getOverlayVisibilityInput(): HTMLInputElement | null { return $("[data-overlay-visibility]"); }
function getControlPanelEl(): HTMLElement | null { return $("[data-control-panel]"); }
function getControlPanelResizeHandle(): HTMLElement | null { return $("[data-control-panel-resize-handle]"); }
function getDocumentNameInput(): HTMLInputElement | null { return $("[data-document-name-input]"); }
function getDocumentSummaryEl(): HTMLElement | null { return $("[data-document-summary]"); }
function getDocumentStatusEl(): HTMLElement | null { return $("[data-document-status]"); }
function getDocumentRecentListEl(): HTMLElement | null { return $("[data-document-recent-list]"); }

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Helper utilities ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function resolveCssLengthPx(host: HTMLElement, lengthValue: string, fallbackPx: number): number {
  const trimmedValue = lengthValue.trim();
  if (!trimmedValue) {
    return fallbackPx;
  }

  const probe = document.createElement("div");
  probe.style.blockSize = "0";
  probe.style.inlineSize = trimmedValue;
  probe.style.pointerEvents = "none";
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  host.appendChild(probe);
  const resolvedPx = probe.getBoundingClientRect().width;
  probe.remove();
  return Number.isFinite(resolvedPx) && resolvedPx > 0 ? resolvedPx : fallbackPx;
}

function getControlPanelWidthBounds(): { minPx: number; maxPx: number } {
  const appShell = getAppShellEl();
  if (!appShell) {
    return { minPx: 288, maxPx: 480 };
  }

  const computedStyle = getComputedStyle(appShell);
  const minPx = resolveCssLengthPx(appShell, computedStyle.getPropertyValue("--vr-application-aside-width-min"), 288);
  const maxPx = resolveCssLengthPx(appShell, computedStyle.getPropertyValue("--vr-application-aside-width-max"), 480);
  return {
    minPx,
    maxPx: Math.max(minPx, maxPx)
  };
}

function getCurrentControlPanelWidthPx(): number {
  const controlPanel = getControlPanelEl();
  if (controlPanel) {
    const measuredWidth = controlPanel.getBoundingClientRect().width;
    if (measuredWidth > 0) {
      return measuredWidth;
    }
  }

  const appShell = getAppShellEl();
  if (!appShell) {
    return 480;
  }

  return resolveCssLengthPx(
    appShell,
    getComputedStyle(appShell).getPropertyValue("--vr-application-aside-width"),
    480
  );
}

function updateControlPanelResizeHandleA11y(widthPx: number = getCurrentControlPanelWidthPx()): void {
  const handle = getControlPanelResizeHandle();
  if (!handle) {
    return;
  }

  const { minPx, maxPx } = getControlPanelWidthBounds();
  handle.setAttribute("aria-valuemin", String(Math.round(minPx)));
  handle.setAttribute("aria-valuemax", String(Math.round(maxPx)));
  handle.setAttribute("aria-valuenow", String(Math.round(clamp(widthPx, minPx, maxPx))));
}

function applyDockedControlPanelWidth(widthPx: number, persist: boolean = true): number {
  const appShell = getAppShellEl();
  if (!appShell) {
    return widthPx;
  }

  const { minPx, maxPx } = getControlPanelWidthBounds();
  const nextWidthPx = clamp(widthPx, minPx, maxPx);
  appShell.style.setProperty("--vr-application-aside-width", `${nextWidthPx}px`);
  updateControlPanelResizeHandleA11y(nextWidthPx);

  if (persist) {
    localStorage.setItem(CONTROL_PANEL_WIDTH_STORAGE_KEY, String(Math.round(nextWidthPx)));
  }

  return nextWidthPx;
}

function restoreDockedControlPanelWidth(): void {
  const rawWidth = localStorage.getItem(CONTROL_PANEL_WIDTH_STORAGE_KEY);
  if (!rawWidth) {
    updateControlPanelResizeHandleA11y();
    return;
  }

  const parsedWidth = Number.parseFloat(rawWidth);
  if (!Number.isFinite(parsedWidth)) {
    updateControlPanelResizeHandleA11y();
    return;
  }

  applyDockedControlPanelWidth(parsedWidth, false);
}

function getNormalizedDocumentName(rawName: string = documentWorkspaceController.state.name): string {
  return documentWorkspaceController.getNormalizedName(rawName);
}

function markDocumentDirty(): void {
  documentWorkspaceController.markDirty();
}

function updateDocumentUi(): void {
  renderDocumentWorkspaceUi({
    workspace: documentWorkspaceController.state,
    untitledName: UNTITLED_DOCUMENT_NAME,
    elements: {
      nameInput: getDocumentNameInput(),
      summaryEl: getDocumentSummaryEl(),
      statusEl: getDocumentStatusEl(),
      recentListEl: getDocumentRecentListEl()
    },
    actions: {
      reopenRecentDocument: (recentDocumentId) => documentWorkspaceController.openRecentDocument(recentDocumentId),
      forgetRecentDocument: (recentDocumentId) => documentWorkspaceController.forgetRecentDocument(recentDocumentId)
    }
  });
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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Operator graph evaluation ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Content source accessors ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

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
  markDocumentDirty();
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
  markDocumentDirty();
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
  markDocumentDirty();
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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ State mutators ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

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
  markDocumentDirty();
}

function discardStagedCsvDraft() {
  setStagedCsvDraft(null);
  markDocumentDirty();
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Profile / format / preset ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

function getDefaultDocumentTargetLabel(profileKey: string): string {
  return OUTPUT_PROFILES[profileKey]?.label ?? profileKey;
}

function createDocumentTarget(profileKey: string): OverlayDocumentTarget {
  return {
    id: profileKey,
    label: getDefaultDocumentTargetLabel(profileKey),
    outputProfileKey: profileKey
  };
}

function getDocumentTargetById(targetId: string | null | undefined = state.documentProject.activeTargetId): OverlayDocumentTarget | null {
  if (!targetId) {
    return null;
  }

  return state.documentProject.targets.find((target) => target.id === targetId) ?? null;
}

function getDocumentTargetByProfileKey(profileKey: string): OverlayDocumentTarget | null {
  return state.documentProject.targets.find((target) => target.outputProfileKey === profileKey) ?? null;
}

function syncDocumentProjectToCurrentOutputProfile(): OverlayDocumentTarget {
  const existingTarget = getDocumentTargetByProfileKey(state.outputProfileKey);
  if (existingTarget) {
    if (state.documentProject.activeTargetId !== existingTarget.id) {
      state.documentProject = {
        ...state.documentProject,
        activeTargetId: existingTarget.id
      };
    }

    return existingTarget;
  }

  const nextTarget = createDocumentTarget(state.outputProfileKey);
  state.documentProject = {
    ...state.documentProject,
    activeTargetId: nextTarget.id,
    targets: [...state.documentProject.targets, nextTarget]
  };
  return nextTarget;
}

function getUnusedDocumentTargetProfileKeys(currentProfileKey?: string): string[] {
  return OUTPUT_PROFILE_ORDER.filter((profileKey) => (
    profileKey === currentProfileKey || !state.documentProject.targets.some((target) => target.outputProfileKey === profileKey)
  ));
}

function pruneDocumentTargetProfileState(profileKey: string): void {
  if (state.documentProject.targets.some((target) => target.outputProfileKey === profileKey)) {
    return;
  }

  delete state.profileFormatBuckets[profileKey];
  delete state.contentFormatKeyByProfile[profileKey];
  delete state.exportSettingsByProfile[profileKey];
  delete state.haloConfigByProfile[profileKey];
}

function getSceneFamilyLabel(sceneFamilyKey: OverlaySceneFamilyKey): string {
  return sceneFamilyKey
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function setActiveDocumentTarget(targetId: string): void {
  const nextTarget = getDocumentTargetById(targetId);
  if (!nextTarget) {
    return;
  }

  state.documentProject = {
    ...state.documentProject,
    activeTargetId: nextTarget.id
  };

  if (nextTarget.outputProfileKey !== state.outputProfileKey) {
    switchOutputProfile(nextTarget.outputProfileKey);
  } else {
    syncDocumentProjectToCurrentOutputProfile();
  }
}

function addDocumentTarget(profileKey?: string): boolean {
  const nextProfileKey = profileKey ?? getUnusedDocumentTargetProfileKeys()[0];
  if (!nextProfileKey) {
    return false;
  }

  const existingTarget = getDocumentTargetByProfileKey(nextProfileKey);
  if (!existingTarget) {
    state.documentProject = {
      ...state.documentProject,
      targets: [...state.documentProject.targets, createDocumentTarget(nextProfileKey)]
    };
  }

  setActiveDocumentTarget(existingTarget?.id ?? nextProfileKey);
  return true;
}

function updateActiveDocumentTargetLabel(rawLabel: string): void {
  const activeTarget = getDocumentTargetById();
  if (!activeTarget) {
    return;
  }

  const nextLabel = rawLabel.trim() || getDefaultDocumentTargetLabel(activeTarget.outputProfileKey);
  if (nextLabel === activeTarget.label) {
    return;
  }

  state.documentProject = {
    ...state.documentProject,
    targets: state.documentProject.targets.map((target) => (
      target.id === activeTarget.id
        ? { ...target, label: nextLabel }
        : target
    ))
  };
}

function updateActiveDocumentTargetProfile(nextProfileKey: string): void {
  const activeTarget = getDocumentTargetById();
  if (!activeTarget || activeTarget.outputProfileKey === nextProfileKey) {
    return;
  }

  const existingTarget = getDocumentTargetByProfileKey(nextProfileKey);
  if (existingTarget && existingTarget.id !== activeTarget.id) {
    setActiveDocumentTarget(existingTarget.id);
    return;
  }

  const oldProfileKey = activeTarget.outputProfileKey;
  const shouldResetLabel = activeTarget.label.trim() === getDefaultDocumentTargetLabel(oldProfileKey);

  state.documentProject = {
    ...state.documentProject,
    targets: state.documentProject.targets.map((target) => (
      target.id === activeTarget.id
        ? {
          ...target,
          outputProfileKey: nextProfileKey,
          label: shouldResetLabel ? getDefaultDocumentTargetLabel(nextProfileKey) : target.label
        }
        : target
    ))
  };

  setActiveDocumentTarget(activeTarget.id);
  pruneDocumentTargetProfileState(oldProfileKey);
}

function removeActiveDocumentTarget(): boolean {
  const activeTarget = getDocumentTargetById();
  if (!activeTarget || state.documentProject.targets.length <= 1) {
    return false;
  }

  const activeIndex = state.documentProject.targets.findIndex((target) => target.id === activeTarget.id);
  const remainingTargets = state.documentProject.targets.filter((target) => target.id !== activeTarget.id);
  const fallbackTarget = remainingTargets[Math.min(activeIndex, remainingTargets.length - 1)] ?? remainingTargets[0];
  if (!fallbackTarget) {
    return false;
  }

  state.documentProject = {
    ...state.documentProject,
    activeTargetId: fallbackTarget.id,
    targets: remainingTargets
  };

  switchOutputProfile(fallbackTarget.outputProfileKey);
  pruneDocumentTargetProfileState(activeTarget.outputProfileKey);
  return true;
}

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
  syncDocumentProjectToCurrentOutputProfile();
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

function buildCurrentDocumentPayload(overrides?: { name?: string; createdAt?: string; updatedAt?: string }): OverlayPreviewDocument {
  const createdAt = overrides?.createdAt ?? documentWorkspaceController.state.createdAt ?? overrides?.updatedAt;
  const updatedAt = overrides?.updatedAt ?? documentWorkspaceController.state.updatedAt ?? createdAt;

  return buildOverlayPreviewDocument(state, previewDocumentBridge, {
    name: overrides?.name ?? getNormalizedDocumentName(),
    createdAt,
    updatedAt
  });
}

function buildCurrentDocumentPersistence(overrides?: { name?: string; createdAt?: string; updatedAt?: string }): PersistedOverlayPreviewDocument {
  const createdAt = overrides?.createdAt ?? documentWorkspaceController.state.createdAt ?? overrides?.updatedAt;
  const updatedAt = overrides?.updatedAt ?? documentWorkspaceController.state.updatedAt ?? createdAt;

  return buildOverlayPreviewDocumentPersistence(state, previewDocumentBridge, {
    name: overrides?.name ?? getNormalizedDocumentName(),
    createdAt,
    updatedAt
  });
}

function sanitizePreviewDocument(rawDocument: unknown): OverlayPreviewDocument | null {
  return denormalizeOverlayPreviewDocumentFromPersistence(rawDocument, {
    fallbackName: UNTITLED_DOCUMENT_NAME,
    fallbackSnapshot: INITIAL_SOURCE_DEFAULTS,
    createExportSettings: createDefaultExportSettings,
    createHaloConfig: getHaloConfigForProfile,
    normalizeGuideMode
  });
}

async function refreshPreviewAfterDocumentStateChange(): Promise<void> {
  state.playbackTimeSec = 0;
  state.selected = null;
  currentDrag = null;
  hoverId = null;
  hoverHandle = null;
  closeInlineEditor();
  normalizeSelection();
  resizeRenderer();
  buildConfigEditor();

  const logoPath = state.params.logo?.assetPath;
  if (logoPath) {
    await loadLogoIntrinsicDimensions(logoPath);
  } else {
    logoIntrinsicWidth = 0;
    logoIntrinsicHeight = 0;
  }

  await renderStage();
}

async function applyPreviewDocumentToState(previewDocument: OverlayPreviewDocument): Promise<void> {
  applyOverlayPreviewDocumentState(state, previewDocument, previewDocumentBridge);

  await refreshPreviewAfterDocumentStateChange();
}

async function applyNewDocumentState(): Promise<void> {
  resetOverlayPreviewDocumentState(state, previewDocumentBridge);

  await refreshPreviewAfterDocumentStateChange();
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

async function importPresetsFromFiles(files: FileList | null): Promise<boolean> {
  if (!files || files.length === 0) return false;

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

  if (importedPresets.length === 0) return false;

  state.presets = [...state.presets, ...importedPresets];
  const lastImportedPreset = importedPresets[importedPresets.length - 1];
  loadPreset(lastImportedPreset);
  savePresets(state.presets);
  return true;
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
    syncDocumentProjectToCurrentOutputProfile();
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
  return sanitizeOverlaySourceDefaultSnapshot(rawSnapshot, {
    fallbackSnapshot: INITIAL_SOURCE_DEFAULTS,
    createExportSettings: createDefaultExportSettings,
    createHaloConfig: getHaloConfigForProfile,
    normalizeGuideMode
  });
}

function createCurrentSourceDefaultSnapshot(): SourceDefaultSnapshot {
  return createCurrentSourceDefaultSnapshotFromState(state, previewDocumentBridge);
}

function applySourceDefaultSnapshot(snapshot: SourceDefaultSnapshot) {
  applySourceDefaultSnapshotToState(state, snapshot, previewDocumentBridge);
  state.documentProject = createOverlayDocumentProjectFromSnapshot(snapshot, state.documentProject);
  syncDocumentProjectToCurrentOutputProfile();
  normalizeSelection();
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

  return cloneOverlaySourceDefaultSnapshot(INITIAL_SOURCE_DEFAULTS);
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

  state.sourceDefaults = cloneOverlaySourceDefaultSnapshot(snapshot);
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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Halo field rendering (Three.js) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

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
  syncBackgroundRendererVisibility();
}

function resizeRenderer() {
  if (!haloRendererInstance) return;
  const { widthPx, heightPx } = state.params.frame;
  haloRendererInstance.resize(widthPx, heightPx);
  syncBackgroundRendererVisibility();
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

function syncBackgroundRendererVisibility() {
  const stageCanvas = getCanvasEl();
  const textCanvas = getTextOverlayCanvas();
  if (!stageCanvas || !textCanvas) {
    return;
  }

  const showHaloCanvas = state.documentProject.sceneFamilyKey === "halo";
  stageCanvas.style.opacity = showHaloCanvas ? "1" : "0";
  textCanvas.style.opacity = "1";
}

function getSceneFamilyPreviewState() {
  return buildSceneFamilyPreviewState({
    sceneFamilyKey: state.documentProject.sceneFamilyKey,
    widthPx: state.params.frame.widthPx,
    heightPx: state.params.frame.heightPx,
    playbackTimeSec: state.playbackTimeSec,
    haloConfig: state.haloConfig
  });
}

function renderBackgroundFrame() {
  syncBackgroundRendererVisibility();

  if (state.documentProject.sceneFamilyKey === "halo") {
    renderHaloFrame();
    return;
  }

  const textCanvas = getTextOverlayCanvas();
  if (!textCanvas) {
    return;
  }

  const previewState = getSceneFamilyPreviewState();
  haloRendererInstance?.clearFrame();
  if (!previewState) {
    clearSceneFamilyPreviewCanvas(textCanvas, state.params.frame.widthPx, state.params.frame.heightPx);
    return;
  }

  renderSceneFamilyPreviewFrame({
    canvas: textCanvas,
    widthPx: state.params.frame.widthPx,
    heightPx: state.params.frame.heightPx,
    transparentBackground: state.exportSettings.transparentBackground,
    haloConfig: state.haloConfig,
    previewState
  });
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
  renderBackgroundFrame();
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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ SVG overlay rendering (text, logo, guides) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

function renderSvgOverlay(scene: LayerScene) {
  const svg = getSvgOverlay();
  if (!svg) return;

  if (!state.overlayVisible) {
    svg.innerHTML = "";
    svg.style.display = "none";
    return;
  }

  svg.style.display = "block";

  const frame = state.params.frame;
  svg.setAttribute("viewBox", `0 0 ${frame.widthPx} ${frame.heightPx}`);

  const styleByKey = new Map(state.params.textStyles.map(s => [s.key, s]));
  const parts: string[] = [];

  if (state.guideMode !== "off") {
    parts.push(createGuideMarkup(scene.grid, frame, state.guideMode));
  }

  parts.push(createSafeAreaMarkup(frame, state.params.safeArea, state.haloConfig.composition.background_color));

  for (const text of scene.texts) {
    const style = styleByKey.get(text.styleKey);
    if (style) parts.push(createTextMarkup(text, style));
  }

  parts.push(createLogoMarkup(state.params.logo));

  svg.innerHTML = parts.join("");
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Full render pipeline ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

async function renderStage() {
  const myToken = ++renderToken;
  const graph = buildGraph(getEffectiveParams());
  const resultMap = await evaluateGraph(graph, registry);
  if (renderToken !== myToken) return;

  const nodeResult = resultMap.get(PREVIEW_NODE_ID) as { scene?: LayerScene } | undefined;
  const scene = nodeResult?.scene;
  if (!scene) return;
  currentScene = scene;

  renderBackgroundFrame();
  renderSvgOverlay(scene);
  renderAuthoringUI();
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Aside panel: output profiles ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

function buildOutputProfileOptions() {
  const container = getOutputProfileOptions();
  if (!container) return;

  const activeTarget = syncDocumentProjectToCurrentOutputProfile();
  container.innerHTML = "";

  const sceneFields = document.createElement("div");
  sceneFields.className = "grid-row";

  sceneFields.append(wrapCol(2, createFormGroup("Scene Family",
    createSelectInput(
      state.documentProject.sceneFamilyKey,
      OVERLAY_SCENE_FAMILY_ORDER.map((sceneFamilyKey) => ({
        label: getSceneFamilyLabel(sceneFamilyKey),
        value: sceneFamilyKey
      })),
      (value) => {
        state.documentProject = {
          ...state.documentProject,
          sceneFamilyKey: value as OverlaySceneFamilyKey
        };
        markDocumentDirty();
        buildOutputProfileOptions();
      }
    )
  )));

  sceneFields.append(wrapCol(2, createFormGroup(
    "Document Sizes",
    createReadonlySpan(`${state.documentProject.targets.length} saved size${state.documentProject.targets.length === 1 ? "" : "s"}`)
  )));

  container.append(sceneFields);

  const help = document.createElement("p");
  help.className = "p-form-help-text control-help";
  help.textContent = "Scene family now saves with the document. The size list below controls which output profiles stay in this document.";
  container.append(help);

  const toolbar = document.createElement("div");
  toolbar.className = "preset-toolbar";

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "p-button is-dense";
  addButton.textContent = "Add Size";
  addButton.disabled = getUnusedDocumentTargetProfileKeys().length === 0;
  addButton.addEventListener("click", () => {
    if (!addDocumentTarget()) {
      return;
    }

    markDocumentDirty();
    buildConfigEditor();
    void renderStage();
  });

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "p-button--base is-dense";
  removeButton.textContent = "Delete Active Size";
  removeButton.disabled = state.documentProject.targets.length <= 1;
  removeButton.addEventListener("click", () => {
    if (!removeActiveDocumentTarget()) {
      return;
    }

    markDocumentDirty();
    buildConfigEditor();
    void renderStage();
  });

  toolbar.append(addButton, removeButton);
  container.append(toolbar);

  const list = document.createElement("div");
  list.className = "preset-radio-list";

  for (const target of state.documentProject.targets) {
    const profile = OUTPUT_PROFILES[target.outputProfileKey];
    const row = document.createElement("label");
    row.className = "preset-radio-row";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "document-target";
    radio.value = target.id;
    radio.checked = target.id === activeTarget.id;
    radio.addEventListener("change", () => {
      setActiveDocumentTarget(target.id);
      markDocumentDirty();
      buildConfigEditor();
      void renderStage();
    });

    const nameSpan = document.createElement("span");
    nameSpan.className = "preset-radio-name";
    nameSpan.textContent = target.label;

    const metaSpan = document.createElement("span");
    metaSpan.className = "preset-radio-status";
    const profileMeta = profile
      ? `${profile.label} \u2022 ${profile.widthPx}x${profile.heightPx}`
      : target.outputProfileKey;
    metaSpan.textContent = radio.checked ? `${profileMeta} \u2022 Active` : profileMeta;

    row.append(radio, nameSpan, metaSpan);
    list.append(row);
  }

  container.append(list);

  const details = document.createElement("div");
  details.className = "grid-row";

  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.className = "p-form-validation__input is-dense";
  labelInput.value = activeTarget.label;
  labelInput.placeholder = getDefaultDocumentTargetLabel(activeTarget.outputProfileKey);
  labelInput.addEventListener("change", () => {
    updateActiveDocumentTargetLabel(labelInput.value);
    markDocumentDirty();
    buildOutputProfileOptions();
  });

  details.append(wrapCol(2, createFormGroup("Active Size Label", labelInput)));

  details.append(wrapCol(2, createFormGroup(
    "Active Size",
    createSelectInput(
      activeTarget.outputProfileKey,
      getUnusedDocumentTargetProfileKeys(activeTarget.outputProfileKey).map((profileKey) => {
        const profile = OUTPUT_PROFILES[profileKey];
        return {
          label: profile ? `${profile.label} \u2022 ${profile.widthPx}x${profile.heightPx}` : profileKey,
          value: profileKey
        };
      }),
      (value) => {
        updateActiveDocumentTargetProfile(value);
        markDocumentDirty();
        buildConfigEditor();
        void renderStage();
      }
    )
  )));

  container.append(details);
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Aside panel: preset tabs ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

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
      markDocumentDirty();
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
      statusSpan.textContent = isActivePresetDirty() ? "Active \u2022 Dirty" : "Active";
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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Aside panel: config editor ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬





// Ã¢â‚¬â€ Preview app context (passed to extracted panel modules) Ã¢â‚¬â€

const ctx: PreviewAppContext = {
  state,
  renderStage,
  buildConfigEditor,
  buildOutputProfileOptions,
  buildPresetTabs,
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
  saveCurrentAsPreset,
  updateActivePreset,
  getActivePreset,
  exportPreset,
  importPresetsFromFiles,
  deletePreset,
  loadPreset,
  applySourceDefaultSnapshot,
  writeCurrentAsSourceDefault,
  setSourceDefaultStatus,
  getSceneFamilyPreviewState,
  getSceneFamilyLabel,
  addDocumentTarget,
  removeActiveDocumentTarget: removeActiveDocumentTarget,
  setActiveDocumentTarget,
  updateActiveDocumentTargetLabel,
  updateActiveDocumentTargetProfile,
  getUnusedDocumentTargetProfileKeys,
  getDefaultDocumentTargetLabel,
  documentWorkspace: documentWorkspaceController,
  getNormalizedDocumentName,
  exportComposedFramePng,
  exportPngSequence
};

const CORE_CONFIG_SECTION_DEFINITIONS: ConfigSectionDefinition[] = [
  { key: "playback-export", order: 100, factory: () => buildPlaybackExportSection(ctx), afterRender: updatePlaybackToggleUi },
  { key: "output-format", order: 200, factory: () => buildOutputFormatSection(), afterRender: buildOutputProfileOptions },
  { key: "document", order: 250, factory: () => buildDocumentSection(ctx), afterRender: updateDocumentUi },
  { key: "presets", order: 300, factory: () => buildPresetsSection(ctx), afterRender: buildPresetTabs },
  { key: "content-format", order: 400, factory: () => buildContentFormatSection(ctx) },
  { key: "selected-overlay", order: 500, factory: () => buildOverlaySection(ctx) },
  { key: "paragraph-styles", order: 600, factory: () => buildParagraphStylesSection(ctx) },
  { key: "layout-grid", order: 700, factory: () => buildGridSection(ctx), afterRender: syncOverlayVisibilityUi },
  { key: "halo-config", order: 800, factory: () => buildHaloConfigSection(ctx) }
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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Content format section


// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Selected overlay item


// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Paragraph style palette


// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Grid settings



// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ DOM authoring layer ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

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

  for (const text of currentScene.texts) {
    const b = text.bounds;
    const authoringWidthPx = Math.max(text.maxWidthPx, b.width);
    const authoringTopPx = b.top;
    const authoringHeightPx = Math.max(text.lineHeightPx, b.height);
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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Inline editor ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Pointer event handling ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

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
      // Resize mode ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â adjust columnSpan (text) or dimensions (logo)
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
    const didMutateDocument = currentDrag.hasMoved;
    currentDrag = null;
    setDocumentSelectionSuppressed(false);
    if (didMutateDocument) {
      markDocumentDirty();
    }
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
  if (document.body.classList.contains("editor-docked")) {
    aside?.classList.remove("is-collapsed");
    toggleBtn?.setAttribute("aria-expanded", "true");
    document.body.classList.remove("drawer-open");
    return;
  }

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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Keyboard shortcuts ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

function handleKeyDown(e: KeyboardEvent) {
  if (editSession && e.key === "Escape") {
    closeInlineEditor();
    e.preventDefault();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === "s" || e.key === "S")) {
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

  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    if (e.shiftKey) {
      void documentWorkspaceController.saveCurrentDocument(true);
      return;
    }

    void documentWorkspaceController.saveCurrentDocument(false);
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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Drawer toggle (mobile) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Button handlers ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Export modal + sequence export ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

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

  // Set time and render the active scene-family background
  state.playbackTimeSec = timeSec;
  renderBackgroundFrame();
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
    // Update progress periodically ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â every 12 frames or at start/end
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
  const configEditor = getConfigEditor();
  if (!configEditor) {
    return;
  }

  const trackDocumentInput = (event: Event): void => {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLTextAreaElement) &&
      !(target instanceof HTMLSelectElement)
    ) {
      return;
    }

    if (target instanceof HTMLInputElement && target.type === "file") {
      return;
    }

    if (target instanceof HTMLInputElement && target.hasAttribute("data-preset-name-input")) {
      return;
    }

    if (target instanceof HTMLInputElement && target.hasAttribute("data-document-name-input")) {
      documentWorkspaceController.setName(target.value);
      return;
    }

    markDocumentDirty();
  };

  configEditor.addEventListener("input", trackDocumentInput);
  configEditor.addEventListener("change", trackDocumentInput);
}

function setupControlPanelResize() {
  const appShell = getAppShellEl();
  const handle = getControlPanelResizeHandle();
  if (!appShell || !handle) {
    return;
  }

  restoreDockedControlPanelWidth();

  const commitWidth = (nextWidthPx: number, persist: boolean = true): void => {
    applyDockedControlPanelWidth(nextWidthPx, persist);
  };

  handle.addEventListener("dblclick", () => {
    localStorage.removeItem(CONTROL_PANEL_WIDTH_STORAGE_KEY);
    appShell.style.removeProperty("--vr-application-aside-width");
    updateControlPanelResizeHandleA11y();
  });

  handle.addEventListener("keydown", (event) => {
    if (!document.body.classList.contains("editor-docked")) {
      return;
    }

    const { minPx, maxPx } = getControlPanelWidthBounds();
    const currentWidthPx = getCurrentControlPanelWidthPx();
    const stepPx = event.shiftKey ? CONTROL_PANEL_WIDTH_STEP_PX * 3 : CONTROL_PANEL_WIDTH_STEP_PX;

    if (event.key === "ArrowLeft") {
      commitWidth(currentWidthPx + stepPx);
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowRight") {
      commitWidth(currentWidthPx - stepPx);
      event.preventDefault();
      return;
    }

    if (event.key === "Home") {
      commitWidth(minPx);
      event.preventDefault();
      return;
    }

    if (event.key === "End") {
      commitWidth(maxPx);
      event.preventDefault();
    }
  });

  handle.addEventListener("pointerdown", (event: PointerEvent) => {
    if (event.button !== 0 || !document.body.classList.contains("editor-docked")) {
      return;
    }

    event.preventDefault();
    const shellRect = appShell.getBoundingClientRect();
    appShell.classList.add("is-resizing-aside");
    handle.setPointerCapture(event.pointerId);

    const onPointerMove = (moveEvent: PointerEvent): void => {
      const nextWidthPx = shellRect.right - moveEvent.clientX;
      commitWidth(nextWidthPx, false);
    };

    const finishResize = (): void => {
      appShell.classList.remove("is-resizing-aside");
      commitWidth(getCurrentControlPanelWidthPx(), true);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", finishResize);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", finishResize, { once: true });
    window.addEventListener("pointercancel", finishResize, { once: true });
  });
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Window resize ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

function setupResize() {
  const appShell = getAppShellEl();
  const aside = getControlPanelEl();
  const toggleBtn = $<HTMLElement>("[data-drawer-toggle]");

  function checkDock() {
    const isDocked = window.innerWidth >= 1200;
    document.body.classList.toggle("editor-docked", isDocked);
    appShell?.classList.toggle("has-pinned-aside", isDocked);
    aside?.classList.toggle("is-pinned", isDocked);

    if (isDocked) {
      aside?.classList.remove("is-collapsed");
      document.body.classList.remove("drawer-open");
      toggleBtn?.setAttribute("aria-expanded", "true");
      updateControlPanelResizeHandleA11y();
      return;
    }

    aside?.classList.add("is-collapsed");
    toggleBtn?.setAttribute("aria-expanded", "false");
  }
  checkDock();
  window.addEventListener("resize", checkDock);
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Initialization ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

async function init() {
  setSourceDefaultStatus("Loading source default...");
  applySourceDefaultSnapshot(await readSourceDefaultSnapshot());
  state.playbackTimeSec = 0;
  updateStageAspectRatio();
  initHaloRenderer();
  await documentWorkspaceController.refreshRecentDocuments();

  // Load logo intrinsic dimensions for aspect-ratio-preserving scaling
  const logoPath = state.params.logo?.assetPath;
  if (logoPath) {
    await loadLogoIntrinsicDimensions(logoPath);
  }

  buildConfigEditor();

  setupDrawerToggle();
  setupButtons();
  setupControlPanelResize();
  setupResize();
  initAuthoringLayer();

  // Pointer events on the stage element (not the SVG ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â SVG is pointer-events:none)
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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Headless automation API ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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
    document_scene_family_key: state.documentProject.sceneFamilyKey,
    document_active_target_id: state.documentProject.activeTargetId,
    document_targets: state.documentProject.targets.map((target) => ({
      id: target.id,
      label: target.label,
      output_profile_key: target.outputProfileKey
    })),
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

  if (
    typeof payload.document_scene_family_key === "string" &&
    OVERLAY_SCENE_FAMILY_ORDER.includes(payload.document_scene_family_key as OverlaySceneFamilyKey)
  ) {
    state.documentProject = {
      ...state.documentProject,
      sceneFamilyKey: payload.document_scene_family_key as OverlaySceneFamilyKey
    };
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
  renderBackgroundFrame();
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
