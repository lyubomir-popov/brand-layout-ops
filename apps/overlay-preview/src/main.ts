/**
 * main.ts — Overlay-preview application entry point.
 *
 * Architecture:
 * 1. Three.js WebGL canvas renders the halo field animation (bottom layer)
 * 2. 2D canvas renders release labels (middle layer)
 * 3. SVG overlay renders text, logo, and composition guides (top layer)
 * 4. DOM authoring layer provides inline text editing
 * 5. Vanilla-framework aside panel provides all controls
 */
import "./styles.scss";

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
  OUTPUT_PROFILE_ORDER,
  OUTPUT_PROFILES,
  OVERLAY_CONTENT_FORMAT_ORDER,
  OVERLAY_CONTENT_FORMATS
} from "@brand-layout-ops/core-types";
import { OperatorRegistry, evaluateGraph } from "@brand-layout-ops/graph-runtime";
import { getColumnSpanWidthPx, getKeylineXPx } from "@brand-layout-ops/layout-grid";
import type { DragAxisLock } from "@brand-layout-ops/overlay-interaction";
import { moveLogo, moveTextField } from "@brand-layout-ops/overlay-interaction";
import {
  createOverlayLayoutOperator,
  OVERLAY_LAYOUT_OPERATOR_KEY,
  resolveOverlayTextValue,
  type OverlayContentSource,
  type OverlayLayoutOperatorParams
} from "@brand-layout-ops/operator-overlay-layout";
import {
  createDefaultHaloFieldConfig,
  type HaloFieldConfig,
  type MascotBox
} from "@brand-layout-ops/operator-halo-field";

import { createHaloRenderer, type HaloRenderer } from "./halo-renderer.js";
import {
  buildTextFieldsForFormat,
  createDefaultExportSettings,
  createDefaultOverlayParams,
  createPresetId,
  getLinkedLogoDimensionsPx,
  getLinkedTitleFontSizePx,
  getNextPresetName,
  loadActivePresetId,
  loadPresets,
  saveActivePresetId,
  savePresets,
  TEXT_STYLE_DISPLAY_LABELS,
  type ExportSettings,
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
  mode: DragMode;
  resizeEdge?: ResizeEdge | undefined;
  initialField?: TextFieldPlacementSpec | undefined;
  initialLogo?: LogoPlacementSpec | undefined;
}

// ─── Operator registry ────────────────────────────────────────────────

const PREVIEW_NODE_ID = "overlay-preview";
const registry = new OperatorRegistry();
registry.register(createOverlayLayoutOperator());

// ─── State ────────────────────────────────────────────────────────────

interface PreviewState {
  params: OverlayLayoutOperatorParams;
  selected: Selection | null;
  guideMode: GuideMode;
  stagedCsvDraft: string | null;
  outputProfileKey: string;
  contentFormatKey: string;
  presets: Preset[];
  activePresetId: string | null;
  exportSettings: ExportSettings;
  haloConfig: HaloFieldConfig;
}

const state: PreviewState = {
  params: createDefaultOverlayParams(),
  selected: { kind: "text", id: "main_heading" },
  guideMode: "composition",
  stagedCsvDraft: null,
  outputProfileKey: DEFAULT_OUTPUT_PROFILE_KEY,
  contentFormatKey: "generic_social",
  presets: loadPresets(),
  activePresetId: loadActivePresetId(),
  exportSettings: createDefaultExportSettings(),
  haloConfig: createDefaultHaloFieldConfig()
};

let currentScene: LayerScene | null = null;
let currentDrag: DragState | null = null;
let hoverId: string | null = null;
let hoverHandle: ResizeEdge | null = null;
let editSession: { id: string; element: HTMLTextAreaElement } | null = null;
let renderToken = 0;
let haloRendererInstance: HaloRenderer | null = null;

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
function getConfigEditor(): HTMLElement | null { return $("[data-config-editor]"); }
function getOutputProfileOptions(): HTMLElement | null { return $("[data-output-profile-options]"); }
function getPresetTabs(): HTMLElement | null { return $("[data-preset-tabs]"); }

// ─── Helper utilities ─────────────────────────────────────────────────

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Operator graph evaluation ────────────────────────────────────────

function buildGraph(params: OverlayLayoutOperatorParams): OperatorGraph {
  return {
    nodes: [{ id: PREVIEW_NODE_ID, operatorKey: OVERLAY_LAYOUT_OPERATOR_KEY, params }],
    edges: []
  };
}

function getEffectiveParams(): OverlayLayoutOperatorParams {
  if (getContentSource() !== "csv" || state.stagedCsvDraft === null) return state.params;
  return {
    ...state.params,
    csvContent: {
      draft: state.stagedCsvDraft,
      rowIndex: state.params.csvContent?.rowIndex ?? 1
    }
  };
}

// ─── Content source accessors ─────────────────────────────────────────

function getContentSource(): OverlayContentSource {
  return state.params.contentSource === "csv" ? "csv" : "inline";
}

function getResolvedTextFieldText(field: TextFieldPlacementSpec): string {
  return resolveOverlayTextValue(getEffectiveParams(), field);
}

function hasStagedCsvDraft(): boolean {
  return state.stagedCsvDraft !== null &&
    state.stagedCsvDraft !== (state.params.csvContent?.draft ?? "");
}

// ─── State mutators ───────────────────────────────────────────────────

function updateTextField(
  id: string,
  updater: (f: TextFieldPlacementSpec) => TextFieldPlacementSpec
) {
  state.params = {
    ...state.params,
    textFields: state.params.textFields.map(f => (f.id === id ? updater(f) : f))
  };
}

function updateTextStyle(key: string, updater: (s: TextStyleSpec) => TextStyleSpec) {
  state.params = {
    ...state.params,
    textStyles: state.params.textStyles.map(s => (s.key === key ? updater(s) : s))
  };
}

function updateLogo(updater: (l: LogoPlacementSpec) => LogoPlacementSpec) {
  if (!state.params.logo) return;
  state.params = { ...state.params, logo: updater(state.params.logo) };
}

function getCurrentLogoAspectRatio(): number {
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

function select(sel: Selection | null) {
  state.selected = sel;
  closeInlineEditor();
  buildConfigEditor();
  renderAuthoringUI();
}

function applyStagedCsvDraft() {
  if (state.stagedCsvDraft === null) return;
  state.params = {
    ...state.params,
    csvContent: {
      draft: state.stagedCsvDraft,
      rowIndex: state.params.csvContent?.rowIndex ?? 1
    }
  };
  state.stagedCsvDraft = null;
}

function discardStagedCsvDraft() {
  state.stagedCsvDraft = null;
}

// ─── Profile / format / preset ────────────────────────────────────────

function switchOutputProfile(profileKey: string) {
  state.outputProfileKey = profileKey;
  const profile = getOutputProfile(profileKey);
  state.params = {
    ...state.params,
    frame: { widthPx: profile.widthPx, heightPx: profile.heightPx },
    safeArea: { ...profile.safeArea }
  };
  state.exportSettings = { ...state.exportSettings, frameRate: profile.defaultFrameRate };

  state.haloConfig = {
    ...state.haloConfig,
    composition: {
      ...state.haloConfig.composition,
      center_x_px: profile.widthPx * 0.5,
      center_y_px: profile.heightPx * 0.464
    }
  };

  resizeRenderer();
}

function switchContentFormat(formatKey: string) {
  state.contentFormatKey = formatKey;
  const mainHeading = state.params.textFields.find(f => f.id === "main_heading");
  state.params = {
    ...state.params,
    textFields: buildTextFieldsForFormat(formatKey, undefined, mainHeading)
  };
}

function saveCurrentAsPreset() {
  const preset: Preset = {
    id: createPresetId(),
    name: getNextPresetName(state.presets),
    config: JSON.parse(JSON.stringify(state.params)),
    outputProfileKey: state.outputProfileKey,
    contentFormatKey: state.contentFormatKey
  };
  state.presets = [...state.presets, preset];
  state.activePresetId = preset.id;
  savePresets(state.presets);
  saveActivePresetId(preset.id);
}

function loadPreset(preset: Preset) {
  state.params = JSON.parse(JSON.stringify(preset.config));
  state.outputProfileKey = preset.outputProfileKey ?? DEFAULT_OUTPUT_PROFILE_KEY;
  state.contentFormatKey = preset.contentFormatKey ?? "generic_social";
  state.activePresetId = preset.id;
  state.stagedCsvDraft = null;
  saveActivePresetId(preset.id);
}

function deletePreset(presetId: string) {
  state.presets = state.presets.filter(p => p.id !== presetId);
  if (state.activePresetId === presetId) state.activePresetId = null;
  savePresets(state.presets);
  saveActivePresetId(state.activePresetId);
}

// ─── Mascot box from composition scale ────────────────────────────────

function getMascotBox(): MascotBox | null {
  const scale = state.haloConfig.composition.scale;
  if (scale <= 0) return null;
  return {
    center_x_px: state.haloConfig.composition.center_x_px,
    center_y_px: state.haloConfig.composition.center_y_px,
    draw_size_px: 600 * scale
  };
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
}

function renderHaloFrame() {
  if (!haloRendererInstance) return;
  haloRendererInstance.renderFrame(state.haloConfig, getMascotBox(), 0);
}

// ─── SVG overlay rendering (text, logo, guides) ──────────────────────

function renderSvgOverlay(scene: LayerScene) {
  const svg = getSvgOverlay();
  if (!svg) return;

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
    statusSpan.textContent = preset.id === state.activePresetId ? "Active" : "";

    row.append(radio, nameSpan, statusSpan);
    list.append(row);
  }

  container.append(list);
}

// ─── Aside panel: config editor ───────────────────────────────────────

function buildConfigEditor() {
  const container = getConfigEditor();
  if (!container) return;
  container.innerHTML = "";

  container.append(buildContentFormatSection());
  container.append(buildOverlaySection());
  container.append(buildTextStylesSection());
  container.append(buildGridSection());
  container.append(buildHaloConfigSection());
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
  input.className = "p-form-validation__input is-dense";
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

function buildSectionEl(title: string): { root: HTMLElement; body: HTMLElement } {
  const root = document.createElement("div");
  root.className = "config-section";

  const heading = document.createElement("h2");
  heading.className = "p-muted-heading u-no-margin--bottom";
  heading.textContent = title;

  const body = document.createElement("div");
  body.className = "config-group";

  root.append(heading, body);
  return { root, body };
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
    const textarea = document.createElement("textarea");
    textarea.className = "p-form-validation__input is-dense control-inline-text";
    textarea.rows = 5;
    textarea.value = state.stagedCsvDraft ?? state.params.csvContent?.draft ?? "";
    textarea.addEventListener("input", () => { state.stagedCsvDraft = textarea.value; });
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
  }

  return root;
}

// ── Selected overlay item

function buildOverlaySection(): HTMLElement {
  const { root, body } = buildSectionEl("Selected Overlay Item");

  if (!state.selected) {
    const p = document.createElement("p");
    p.className = "p-form-help-text";
    p.textContent = "Click a text block or logo in the stage to select it.";
    body.append(p);
    return root;
  }

  if (state.selected.kind === "text") {
    const field = state.params.textFields.find(f => f.id === state.selected!.id);
    if (!field) return root;

    body.append(createFormGroup("ID", createReadonlySpan(field.id)));

    body.append(createFormGroup("Style",
      createSelectInput(
        field.styleKey,
        state.params.textStyles.map(s => ({
          label: TEXT_STYLE_DISPLAY_LABELS[s.key] ?? s.key,
          value: s.key
        })),
        (v) => { updateTextField(field.id, f => ({ ...f, styleKey: v })); void renderStage(); }
      )
    ));

    if (getContentSource() === "inline") {
      const textarea = document.createElement("textarea");
      textarea.className = "p-form-validation__input is-dense control-inline-text";
      textarea.rows = 3;
      textarea.value = field.text ?? "";
      textarea.addEventListener("input", () => {
        updateTextField(field.id, f => ({ ...f, text: textarea.value }));
        void renderStage();
      });
      body.append(createFormGroup("Text", textarea));
    }

    const grid = document.createElement("div");
    grid.className = "overlay-control-grid grid-row";

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
      createNumberInput(field.offsetBaselines, { min: -200, max: 500, step: 1 }, v => {
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

    const grid = document.createElement("div");
    grid.className = "overlay-control-grid grid-row";

    grid.append(wrapCol(1, createFormGroup("X",
      createNumberInput(logo.xPx, { step: 1 }, v => { updateLogo(l => ({ ...l, xPx: v })); void renderStage(); })
    )));

    grid.append(wrapCol(1, createFormGroup("Y",
      createNumberInput(logo.yPx, { step: 1 }, v => { updateLogo(l => ({ ...l, yPx: v })); void renderStage(); })
    )));

    const widthInput = createNumberInput(logo.widthPx, { min: 1, step: 1 }, v => {
      const aspectRatio = logo.widthPx > 0 && logo.heightPx > 0 ? logo.widthPx / logo.heightPx : getCurrentLogoAspectRatio();
      const nextHeightPx = Math.max(1, Math.round(v / Math.max(0.0001, aspectRatio)));
      syncTitleToLogoHeight(nextHeightPx);
      void renderStage();
    });
    widthInput.title = "Derived from the locked A Head to logo scale.";

    grid.append(wrapCol(1, createFormGroup("Width",
      widthInput
    )));

    grid.append(wrapCol(1, createFormGroup("Height",
      createNumberInput(logo.heightPx, { min: 1, step: 1 }, v => {
        syncTitleToLogoHeight(v);
        void renderStage();
      })
    )));

    body.append(grid);
  }

  return root;
}

// ── Text styles

function buildTextStylesSection(): HTMLElement {
  const { root, body } = buildSectionEl("Text Styles");

  for (const style of state.params.textStyles) {
    const label = TEXT_STYLE_DISPLAY_LABELS[style.key] ?? style.key;
    const sub = document.createElement("div");
    sub.style.display = "grid";
    sub.style.gap = "0.5rem";

    const heading = document.createElement("strong");
    heading.textContent = label;
    sub.append(heading);

    const grid = document.createElement("div");
    grid.className = "overlay-control-grid grid-row";

    grid.append(wrapCol(1, createFormGroup("Size (px)",
      createNumberInput(style.fontSizePx, { min: 6, max: 200, step: 1 }, v => {
        updateTextStyle(style.key, s => ({ ...s, fontSizePx: v }));
        if (style.key === "title") {
          syncLogoToTitleFontSize(v);
        }
        void renderStage();
      })
    )));

    grid.append(wrapCol(1, createFormGroup("Line Height",
      createNumberInput(style.lineHeightPx, { min: 6, max: 300, step: 1 }, v => {
        updateTextStyle(style.key, s => ({ ...s, lineHeightPx: v })); void renderStage();
      })
    )));

    grid.append(wrapCol(1, createFormGroup("Weight",
      createNumberInput(style.fontWeight ?? 400, { min: 100, max: 900, step: 100 }, v => {
        updateTextStyle(style.key, s => ({ ...s, fontWeight: v })); void renderStage();
      })
    )));

    sub.append(grid);
    body.append(sub);
  }

  return root;
}

// ── Grid settings

function buildGridSection(): HTMLElement {
  const { root, body } = buildSectionEl("Layout Grid");
  const grid = state.params.grid;

  const fields = document.createElement("div");
  fields.className = "overlay-control-grid grid-row";

  fields.append(wrapCol(1, createFormGroup("Baseline (px)",
    createNumberInput(grid.baselineStepPx, { min: 1, max: 48, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, baselineStepPx: v } }; void renderStage();
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

  body.append(fields);

  const margins = document.createElement("div");
  margins.className = "overlay-control-grid grid-row";

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
      state.params = { ...state.params, grid: { ...state.params.grid, fitWithinSafeArea: v } }; void renderStage();
    })
  ));

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

  const fields = document.createElement("div");
  fields.className = "overlay-control-grid grid-row";

  fields.append(wrapCol(1, createFormGroup("Scale",
    createNumberInput(hc.composition.scale, { min: 0.1, max: 2, step: 0.01 }, v => {
      state.haloConfig = { ...hc, composition: { ...hc.composition, scale: v } }; void renderStage();
    })
  )));

  fields.append(wrapCol(1, createFormGroup("Spokes",
    createNumberInput(hc.generator_wrangle.spoke_count, { min: 4, max: 120, step: 1 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, spoke_count: Math.round(v) } }; void renderStage();
    })
  )));

  fields.append(wrapCol(1, createFormGroup("Orbits",
    createNumberInput(hc.generator_wrangle.num_orbits, { min: 1, max: 16, step: 1 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, num_orbits: Math.round(v) } }; void renderStage();
    })
  )));

  fields.append(wrapCol(1, createFormGroup("Phase Count",
    createNumberInput(hc.generator_wrangle.phase_count, { min: 1, max: 6, step: 1 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, phase_count: Math.round(v) } }; void renderStage();
    })
  )));

  body.append(fields);

  /* colors row */
  const colorFields = document.createElement("div");
  colorFields.className = "overlay-control-grid grid-row";

  for (const [label, getValue, setValue] of [
    ["Background", () => hc.composition.background_color,
      (v: string) => { state.haloConfig = { ...hc, composition: { ...hc.composition, background_color: v } }; }],
    ["Dot Color", () => hc.point_style.color,
      (v: string) => { state.haloConfig = { ...hc, point_style: { ...hc.point_style, color: v } }; }],
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
  spokeDetails.className = "overlay-control-grid grid-row";

  spokeDetails.append(wrapCol(1, createFormGroup("Spoke Width",
    createNumberInput(hc.spoke_lines.width_px, { min: 0, max: 16, step: 0.5 }, v => {
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
      [{ label: "Mixed", value: "mixed" }, { label: "Dots", value: "dots" }, { label: "Plus", value: "plus" }, { label: "Triangles", value: "triangles" }],
      (v) => { state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_style: v } }; void renderStage(); }
    )
  )));

  spokeDetails.append(wrapCol(1, createFormGroup("Phase Width",
    createNumberInput(hc.spoke_lines.phase_start_width_px, { min: 0, max: 32, step: 1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, phase_start_width_px: v } }; void renderStage();
    })
  )));

  body.append(spokeDetails);

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

  for (const text of currentScene.texts) {
    const b = text.bounds;
    const styleLabel = TEXT_STYLE_DISPLAY_LABELS[text.styleKey] ?? text.styleKey;
    const authoringWidthPx = Math.max(text.maxWidthPx, b.width);
    items.push({
      id: text.id,
      kind: "text",
      label: `${styleLabel}: ${text.id}`,
      leftPx: b.left,
      topPx: b.top,
      widthPx: authoringWidthPx,
      heightPx: b.height,
      rightPx: b.left + authoringWidthPx,
      bottomPx: b.bottom,
      left: b.left / widthPx * 100,
      top: b.top / heightPx * 100,
      width: authoringWidthPx / widthPx * 100,
      height: b.height / heightPx * 100,
      baselineYPx: text.anchorBaselineYPx
    });
  }

  const logo = currentScene.logo;
  if (logo) {
    items.push({
      id: logo.id,
      kind: "logo",
      label: "Logo",
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
    if (currentDrag && currentDrag.selection.kind === "text") {
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
  closeInlineEditor();

  const layer = $<HTMLElement>("[data-authoring-layer]");
  if (!layer || !currentScene) return;

  const field = state.params.textFields.find(f => f.id === fieldId);
  if (!field) return;

  const text = currentScene.texts.find(t => t.id === fieldId);
  if (!text) return;

  const { widthPx, heightPx } = state.params.frame;
  const b = text.bounds;

  const textarea = document.createElement("textarea");
  textarea.className = "stage__inline-editor";
  textarea.value = getResolvedTextFieldText(field);
  textarea.style.left = `${(b.left / widthPx) * 100}%`;
  textarea.style.top = `${(b.top / heightPx) * 100}%`;
  textarea.style.width = `${Math.max(b.width / widthPx * 100, 15)}%`;
  textarea.style.minHeight = `${Math.max(b.height / heightPx * 100, 5)}%`;

  textarea.addEventListener("input", () => {
    updateTextField(fieldId, f => ({ ...f, text: textarea.value }));
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
  if (editSession || e.button !== 0) return;

  const resizeEdge = getResizeHandleAtPoint(e.clientX, e.clientY);
  if (resizeEdge && state.selected && currentScene) {
    const dragState: DragState = {
      selection: state.selected,
      metrics: currentScene.grid,
      startClientX: e.clientX,
      startClientY: e.clientY,
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
  if (currentDrag && currentScene) {
    const delta = getFrameDelta(e.clientX, e.clientY);

    if (currentDrag.mode === "resize") {
      // Resize mode — adjust columnSpan (text) or dimensions (logo)
      if (currentDrag.selection.kind === "text" && currentDrag.initialField) {
        const metrics = currentDrag.metrics;
        const colW = metrics.columnWidthPx + metrics.columnGutterPx;
        const edge = currentDrag.resizeEdge;

        if (edge === "e" || edge === "ne" || edge === "se") {
          // Expand/shrink right edge → change columnSpan
          const spanDelta = colW > 0 ? Math.round(delta.deltaXPx / colW) : 0;
          const maxSpan = metrics.columnCount - currentDrag.initialField.keylineIndex + 1;
          const newSpan = Math.max(1, Math.min(maxSpan, currentDrag.initialField.columnSpan + spanDelta));
          updateTextField(currentDrag.selection.id, f => ({ ...f, columnSpan: newSpan }));
        } else if (edge === "w" || edge === "nw" || edge === "sw") {
          // Shrink/expand left edge → change keylineIndex + columnSpan
          const colDelta = colW > 0 ? Math.round(delta.deltaXPx / colW) : 0;
          const newKeyline = Math.max(1, Math.min(
            currentDrag.initialField.keylineIndex + currentDrag.initialField.columnSpan - 1,
            currentDrag.initialField.keylineIndex + colDelta
          ));
          const keylineDiff = newKeyline - currentDrag.initialField.keylineIndex;
          const newSpan = Math.max(1, currentDrag.initialField.columnSpan - keylineDiff);
          updateTextField(currentDrag.selection.id, f => ({ ...f, keylineIndex: newKeyline, columnSpan: newSpan }));
        }
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
  const hit = findHitTarget(e.clientX, e.clientY);
  if (hit && hit.kind === "text" && getContentSource() === "inline") {
    openInlineEditor(hit.id);
  }
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────

function handleKeyDown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    if (e.key === "Escape") {
      (e.target as HTMLElement).blur();
      e.preventDefault();
    }
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    saveCurrentAsPreset();
    buildPresetTabs();
    return;
  }

  if (e.key === "g" || e.key === "G") {
    const idx = GUIDE_MODES.indexOf(state.guideMode);
    state.guideMode = GUIDE_MODES[(idx + 1) % GUIDE_MODES.length];
    void renderStage();
    return;
  }

  if (e.key === "Escape" && currentDrag) {
    currentDrag = null;
    return;
  }
}

// ─── Drawer toggle (mobile) ──────────────────────────────────────────

function setupDrawerToggle() {
  const toggleBtn = $<HTMLElement>("[data-drawer-toggle]");
  const closeBtn = $<HTMLElement>("[data-drawer-close]");
  const backdrop = $<HTMLElement>("[data-drawer-backdrop]");
  const aside = $<HTMLElement>("[data-control-panel]");

  function openDrawer() {
    aside?.classList.remove("is-collapsed");
    document.body.classList.add("drawer-open");
    toggleBtn?.setAttribute("aria-expanded", "true");
  }

  function closeDrawer() {
    aside?.classList.add("is-collapsed");
    document.body.classList.remove("drawer-open");
    toggleBtn?.setAttribute("aria-expanded", "false");
  }

  toggleBtn?.addEventListener("click", () => {
    const isOpen = toggleBtn.getAttribute("aria-expanded") === "true";
    if (isOpen) closeDrawer(); else openDrawer();
  });
  closeBtn?.addEventListener("click", closeDrawer);
  backdrop?.addEventListener("click", closeDrawer);
}

// ─── Button handlers ──────────────────────────────────────────────────

function setupButtons() {
  $("[data-export-frame-button]")?.addEventListener("click", () => {
    const canvas = getCanvasEl();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.exportSettings.exportName}_${state.outputProfileKey}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  });

  $("[data-reset-button]")?.addEventListener("click", () => {
    state.params = createDefaultOverlayParams();
    state.haloConfig = createDefaultHaloFieldConfig();
    state.outputProfileKey = DEFAULT_OUTPUT_PROFILE_KEY;
    state.contentFormatKey = "generic_social";
    state.selected = { kind: "text", id: "main_heading" };
    state.stagedCsvDraft = null;
    resizeRenderer();
    buildOutputProfileOptions();
    buildPresetTabs();
    buildConfigEditor();
    void renderStage();
  });

  $("[data-preset-save]")?.addEventListener("click", () => {
    saveCurrentAsPreset();
    buildPresetTabs();
  });

  $("[data-preset-delete]")?.addEventListener("click", () => {
    if (state.activePresetId) {
      deletePreset(state.activePresetId);
      buildPresetTabs();
    }
  });
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

function init() {
  updateStageAspectRatio();
  initHaloRenderer();

  buildOutputProfileOptions();
  buildPresetTabs();
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
}

init();
