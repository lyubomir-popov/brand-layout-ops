import "./styles.css";

import type { LayerScene, LayoutGridMetrics, LogoPlacementSpec, OperatorGraph, ResolvedTextPlacement, TextFieldPlacementSpec, TextStyleSpec } from "@brand-layout-ops/core-types";
import { OperatorRegistry, evaluateGraph } from "@brand-layout-ops/graph-runtime";
import type { DragAxisLock } from "@brand-layout-ops/overlay-interaction";
import { moveLogo, moveTextField } from "@brand-layout-ops/overlay-interaction";
import { createOverlayLayoutOperator, OVERLAY_LAYOUT_OPERATOR_KEY, type OverlayLayoutOperatorParams } from "@brand-layout-ops/operator-overlay-layout";
import { createCheckboxField, createNumberField, createReadoutField, createSection, createTextAreaField } from "@brand-layout-ops/parameter-ui";

import { createDefaultOverlayParams } from "./sample-document.js";

type Selection =
  | { kind: "text"; id: string }
  | { kind: "logo"; id: string };

interface PreviewState {
  params: OverlayLayoutOperatorParams;
  selected: Selection | null;
  showGuides: boolean;
}

interface DragState {
  selection: Selection;
  metrics: LayoutGridMetrics;
  startClientX: number;
  startClientY: number;
  initialField?: TextFieldPlacementSpec;
  initialLogo?: LogoPlacementSpec;
}

const PREVIEW_NODE_ID = "overlay-preview";
const registry = new OperatorRegistry();
registry.register(createOverlayLayoutOperator());

const state: PreviewState = {
  params: createDefaultOverlayParams(),
  selected: { kind: "text", id: "headline" },
  showGuides: true
};

let currentScene: LayerScene | null = null;
let currentDrag: DragState | null = null;
let currentTextEditor: HTMLTextAreaElement | null = null;
let renderToken = 0;

function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getAxisLock(deltaXPx: number, deltaYPx: number, shiftKey: boolean): DragAxisLock {
  if (!shiftKey) {
    return "free";
  }

  return Math.abs(deltaXPx) >= Math.abs(deltaYPx) ? "x" : "y";
}

function buildGraph(params: OverlayLayoutOperatorParams): OperatorGraph {
  return {
    nodes: [
      {
        id: PREVIEW_NODE_ID,
        operatorKey: OVERLAY_LAYOUT_OPERATOR_KEY,
        params
      }
    ],
    edges: []
  };
}

function getStyleByKey(textStyles: TextStyleSpec[]): Map<string, TextStyleSpec> {
  return new Map(textStyles.map((style) => [style.key, style]));
}

function getSelectedTextField(): TextFieldPlacementSpec | null {
  const selected = state.selected;
  if (selected?.kind !== "text") {
    return null;
  }

  return state.params.textFields.find((field) => field.id === selected.id) ?? null;
}

function getSelectedLogo(): LogoPlacementSpec | null {
  if (state.selected?.kind !== "logo" || !state.params.logo) {
    return null;
  }

  return state.params.logo.id === state.selected.id ? state.params.logo : null;
}

function updateTextField(textFieldId: string, updater: (field: TextFieldPlacementSpec) => TextFieldPlacementSpec): void {
  state.params = {
    ...state.params,
    textFields: state.params.textFields.map((field) => (
      field.id === textFieldId ? updater(field) : field
    ))
  };
}

function updateTextStyle(styleKey: string, updater: (style: TextStyleSpec) => TextStyleSpec): void {
  state.params = {
    ...state.params,
    textStyles: state.params.textStyles.map((style) => (
      style.key === styleKey ? updater(style) : style
    ))
  };
}

function updateLogo(updater: (logo: LogoPlacementSpec) => LogoPlacementSpec): void {
  if (!state.params.logo) {
    return;
  }

  state.params = {
    ...state.params,
    logo: updater(state.params.logo)
  };
}

function select(selection: Selection | null): void {
  state.selected = selection;
  renderSelectionPanel();
}

function setTextSelection(textFieldId: string, focusTextEditor = false): void {
  select({ kind: "text", id: textFieldId });
  if (focusTextEditor) {
    queueMicrotask(() => {
      currentTextEditor?.focus();
      currentTextEditor?.select();
    });
  }
}

function getStageSvg(): SVGSVGElement | null {
  return document.querySelector("[data-preview-stage]");
}

function getFrameDeltaFromPointer(clientX: number, clientY: number): { deltaXPx: number; deltaYPx: number } {
  const stageSvg = getStageSvg();
  if (!stageSvg || !currentDrag) {
    return { deltaXPx: 0, deltaYPx: 0 };
  }

  const rect = stageSvg.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return { deltaXPx: 0, deltaYPx: 0 };
  }

  return {
    deltaXPx: (clientX - currentDrag.startClientX) * (state.params.frame.widthPx / rect.width),
    deltaYPx: (clientY - currentDrag.startClientY) * (state.params.frame.heightPx / rect.height)
  };
}

function formatSelectionChip(label: string, value: string): string {
  return `${label}: ${value}`;
}

function createGuideMarkup(metrics: LayoutGridMetrics): string {
  if (!state.showGuides) {
    return `<rect x="0" y="0" width="${state.params.frame.widthPx}" height="${state.params.frame.heightPx}" fill="#f9f4ed" />`;
  }

  const baselineLines: string[] = [];
  for (let yPx = metrics.contentTopPx; yPx <= metrics.contentBottomPx; yPx += metrics.baselineStepPx) {
    baselineLines.push(
      `<line x1="${metrics.contentLeftPx}" y1="${yPx}" x2="${metrics.contentRightPx}" y2="${yPx}" stroke="rgba(153, 135, 115, 0.18)" stroke-width="1" />`
    );
  }

  const keylines = metrics.columnKeylinePositionsPx.map((xPx, index) => (
    `<g>
      <line x1="${xPx}" y1="${metrics.contentTopPx}" x2="${xPx}" y2="${metrics.contentBottomPx}" stroke="rgba(232, 116, 0, 0.26)" stroke-width="2" stroke-dasharray="8 10" />
      <text x="${xPx + 8}" y="${Math.max(20, metrics.contentTopPx - 10)}" fill="rgba(84, 61, 43, 0.85)" font-size="14" font-family="IBM Plex Mono, monospace">K${index + 1}</text>
    </g>`
  ));

  return `
    <g data-guides>
      <rect x="0" y="0" width="${state.params.frame.widthPx}" height="${state.params.frame.heightPx}" fill="#f9f4ed" />
      <rect x="${metrics.layoutLeftPx}" y="${metrics.layoutTopPx}" width="${metrics.layoutRightPx - metrics.layoutLeftPx}" height="${metrics.layoutBottomPx - metrics.layoutTopPx}" fill="none" stroke="rgba(232, 116, 0, 0.24)" stroke-width="2" />
      <rect x="${metrics.contentLeftPx}" y="${metrics.contentTopPx}" width="${metrics.contentRightPx - metrics.contentLeftPx}" height="${metrics.contentBottomPx - metrics.contentTopPx}" fill="rgba(232, 116, 0, 0.04)" stroke="rgba(232, 116, 0, 0.14)" stroke-width="2" />
      ${baselineLines.join("")}
      ${keylines.join("")}
    </g>
  `;
}

function createTextMarkup(text: ResolvedTextPlacement, style: TextStyleSpec): string {
  const isSelected = state.selected?.kind === "text" && state.selected.id === text.id;
  const labelY = Math.max(18, text.bounds.top - 10);
  const lineMarkup = text.wrappedLines.map((line, index) => (
    `<tspan x="${text.anchorXPx}" y="${text.anchorBaselineYPx + index * style.lineHeightPx}">${escapeXml(line)}</tspan>`
  )).join("");

  return `
    <g data-kind="text" data-id="${escapeXml(text.id)}" style="cursor: move;">
      <rect x="${text.bounds.left - 12}" y="${text.bounds.top - 10}" width="${text.bounds.width + 24}" height="${text.bounds.height + 20}" rx="18" fill="${isSelected ? "rgba(232, 116, 0, 0.12)" : "transparent"}" stroke="${isSelected ? "rgba(232, 116, 0, 0.82)" : "rgba(99, 79, 60, 0.24)"}" stroke-width="${isSelected ? 3 : 1.5}" stroke-dasharray="${isSelected ? "none" : "10 10"}" />
      <text x="${text.bounds.left}" y="${labelY}" fill="rgba(84, 61, 43, 0.85)" font-size="14" font-family="IBM Plex Mono, monospace">${escapeXml(text.id)} / K${text.keylineIndex} / R${text.rowIndex} +${text.offsetBaselines}</text>
      <text x="${text.anchorXPx}" y="${text.anchorBaselineYPx}" fill="#23160d" font-size="${style.fontSizePx}" font-weight="${style.fontWeight ?? 400}" font-family="IBM Plex Sans, Segoe UI, sans-serif">${lineMarkup}</text>
    </g>
  `;
}

function createLogoMarkup(): string {
  if (!currentScene?.logo) {
    return "";
  }

  const logo = currentScene.logo;
  const isSelected = state.selected?.kind === "logo" && state.selected.id === logo.id;

  return `
    <g data-kind="logo" data-id="${escapeXml(logo.id)}" style="cursor: move;">
      <rect x="${logo.bounds.left}" y="${logo.bounds.top}" width="${logo.bounds.width}" height="${logo.bounds.height}" rx="14" fill="${isSelected ? "rgba(232, 116, 0, 0.16)" : "rgba(255, 255, 255, 0.4)"}" stroke="${isSelected ? "rgba(232, 116, 0, 0.88)" : "rgba(84, 61, 43, 0.55)"}" stroke-width="${isSelected ? 3 : 2}" />
      <line x1="${logo.bounds.left}" y1="${logo.bounds.top}" x2="${logo.bounds.right}" y2="${logo.bounds.bottom}" stroke="rgba(84, 61, 43, 0.45)" stroke-width="2" />
      <line x1="${logo.bounds.right}" y1="${logo.bounds.top}" x2="${logo.bounds.left}" y2="${logo.bounds.bottom}" stroke="rgba(84, 61, 43, 0.45)" stroke-width="2" />
      <text x="${logo.bounds.left + 12}" y="${logo.bounds.top - 10}" fill="rgba(84, 61, 43, 0.85)" font-size="14" font-family="IBM Plex Mono, monospace">${escapeXml(logo.id)}</text>
    </g>
  `;
}

function renderStageMarkup(scene: LayerScene): string {
  const styleByKey = getStyleByKey(state.params.textStyles);
  const textMarkup = scene.texts.map((text) => {
    const style = styleByKey.get(text.styleKey);
    return style ? createTextMarkup(text, style) : "";
  }).join("");

  return `
    <svg data-preview-stage viewBox="0 0 ${state.params.frame.widthPx} ${state.params.frame.heightPx}" role="img" aria-label="Overlay layout preview">
      ${createGuideMarkup(scene.grid)}
      ${textMarkup}
      ${createLogoMarkup()}
    </svg>
  `;
}

function renderDocumentControls(): void {
  const documentPanel = document.querySelector("[data-document-panel]");
  if (!(documentPanel instanceof HTMLElement)) {
    return;
  }

  documentPanel.replaceChildren();

  const frameSection = createSection("Frame", "The shell stays intentionally narrow, but it already exercises real graph evaluation and document-sized layout resolution.");
  const frameGrid = document.createElement("div");
  frameGrid.className = "parameter-grid";
  frameGrid.append(
    createNumberField({
      label: "Width",
      value: state.params.frame.widthPx,
      min: 320,
      step: 1,
      onInput(value) {
        state.params = {
          ...state.params,
          frame: {
            ...state.params.frame,
            widthPx: Math.max(320, Math.round(value))
          }
        };
        void renderStage();
      }
    }).root,
    createNumberField({
      label: "Height",
      value: state.params.frame.heightPx,
      min: 320,
      step: 1,
      onInput(value) {
        state.params = {
          ...state.params,
          frame: {
            ...state.params.frame,
            heightPx: Math.max(320, Math.round(value))
          }
        };
        void renderStage();
      }
    }).root,
    createCheckboxField({
      label: "Show guides",
      checked: state.showGuides,
      hint: "Shortcut: press G outside inputs.",
      onInput(checked) {
        state.showGuides = checked;
        syncGuideButton();
        void renderStage();
      }
    }).root
  );
  frameSection.body.append(frameGrid);

  const safeAreaSection = createSection("Safe Area");
  const safeAreaGrid = document.createElement("div");
  safeAreaGrid.className = "parameter-grid";
  (["top", "right", "bottom", "left"] as const).forEach((side) => {
    safeAreaGrid.append(
      createNumberField({
        label: side[0].toUpperCase() + side.slice(1),
        value: state.params.safeArea[side],
        min: 0,
        step: 1,
        onInput(value) {
          state.params = {
            ...state.params,
            safeArea: {
              ...state.params.safeArea,
              [side]: Math.max(0, Math.round(value))
            }
          };
          void renderStage();
        }
      }).root
    );
  });
  safeAreaSection.body.append(safeAreaGrid);

  const gridSection = createSection("Grid");
  const gridControls = document.createElement("div");
  gridControls.className = "parameter-grid";
  const gridFieldSpecs: Array<{ label: string; key: keyof OverlayLayoutOperatorParams["grid"]; min?: number }> = [
    { label: "Baseline step", key: "baselineStepPx", min: 1 },
    { label: "Rows", key: "rowCount", min: 1 },
    { label: "Columns", key: "columnCount", min: 1 },
    { label: "Top margin", key: "marginTopBaselines", min: 0 },
    { label: "Bottom margin", key: "marginBottomBaselines", min: 0 },
    { label: "Left margin", key: "marginLeftBaselines", min: 0 },
    { label: "Right margin", key: "marginRightBaselines", min: 0 },
    { label: "Row gutter", key: "rowGutterBaselines", min: 0 },
    { label: "Column gutter", key: "columnGutterBaselines", min: 0 }
  ];
  for (const spec of gridFieldSpecs) {
    const numberFieldOptions = {
      label: spec.label,
      value: Number(state.params.grid[spec.key]),
      step: 1,
      ...(typeof spec.min === "number" ? { min: spec.min } : {}),
      onInput(value: number) {
        state.params = {
          ...state.params,
          grid: {
            ...state.params.grid,
            [spec.key]: Math.max(spec.min ?? Number.NEGATIVE_INFINITY, Math.round(value))
          }
        };
        void renderStage();
      }
    };
    gridControls.append(
      createNumberField(numberFieldOptions).root
    );
  }
  gridControls.append(
    createCheckboxField({
      label: "Fit within safe area",
      checked: state.params.grid.fitWithinSafeArea,
      onInput(checked) {
        state.params = {
          ...state.params,
          grid: {
            ...state.params.grid,
            fitWithinSafeArea: checked
          }
        };
        void renderStage();
      }
    }).root
  );
  gridSection.body.append(gridControls);

  const stylesSection = createSection("Text Styles");
  for (const style of state.params.textStyles) {
    const styleGrid = document.createElement("div");
    styleGrid.className = "parameter-grid";
    styleGrid.append(
      createNumberField({
        label: `${style.key} size`,
        value: style.fontSizePx,
        min: 1,
        step: 1,
        onInput(value) {
          updateTextStyle(style.key, (currentStyle) => ({
            ...currentStyle,
            fontSizePx: Math.max(1, Math.round(value))
          }));
          void renderStage();
        }
      }).root,
      createNumberField({
        label: `${style.key} line height`,
        value: style.lineHeightPx,
        min: 1,
        step: 1,
        onInput(value) {
          updateTextStyle(style.key, (currentStyle) => ({
            ...currentStyle,
            lineHeightPx: Math.max(1, Math.round(value))
          }));
          void renderStage();
        }
      }).root
    );
    stylesSection.body.append(styleGrid);
  }

  documentPanel.append(frameSection.root, safeAreaSection.root, gridSection.root, stylesSection.root);
}

function renderSelectionPanel(): void {
  const selectionPanel = document.querySelector("[data-selection-panel]");
  if (!(selectionPanel instanceof HTMLElement)) {
    return;
  }

  selectionPanel.replaceChildren();
  currentTextEditor = null;

  const section = createSection("Selection", "Use the stage to pick text or the logo. Drag on-canvas to snap text back to keylines and baselines.");
  selectionPanel.append(section.root);

  if (!state.selected) {
    const empty = document.createElement("p");
    empty.className = "selection-empty";
    empty.textContent = "Nothing selected yet. Click a text block or the logo in the preview.";
    section.body.append(empty);
    return;
  }

  const chipRow = document.createElement("div");
  chipRow.className = "selection-chip-row";
  chipRow.append(
    createReadoutField({ label: "Kind", value: state.selected.kind }),
    createReadoutField({ label: "Id", value: state.selected.id })
  );
  section.body.append(chipRow);

  if (state.selected.kind === "text") {
    const field = getSelectedTextField();
    if (!field) {
      return;
    }

    const positionChipRow = document.createElement("div");
    positionChipRow.className = "selection-chip-row";
    for (const chip of [
      formatSelectionChip("keyline", String(field.keylineIndex)),
      formatSelectionChip("row", String(field.rowIndex)),
      formatSelectionChip("offset", String(field.offsetBaselines)),
      formatSelectionChip("span", String(field.columnSpan))
    ]) {
      const chipElement = document.createElement("span");
      chipElement.className = "selection-chip";
      chipElement.textContent = chip;
      positionChipRow.append(chipElement);
    }
    section.body.append(positionChipRow);

    const textArea = createTextAreaField({
      label: "Text",
      value: field.text,
      rows: 6,
      onInput(value) {
        updateTextField(field.id, (currentField) => ({
          ...currentField,
          text: value
        }));
        void renderStage();
      }
    });
    currentTextEditor = textArea.input;
    section.body.append(textArea.root);

    const textGrid = document.createElement("div");
    textGrid.className = "parameter-grid";
    textGrid.append(
      createNumberField({
        label: "Keyline",
        value: field.keylineIndex,
        min: 1,
        step: 1,
        onInput(value) {
          updateTextField(field.id, (currentField) => ({
            ...currentField,
            keylineIndex: Math.max(1, Math.round(value))
          }));
          void renderStage();
          renderSelectionPanel();
        }
      }).root,
      createNumberField({
        label: "Row",
        value: field.rowIndex,
        min: 1,
        step: 1,
        onInput(value) {
          updateTextField(field.id, (currentField) => ({
            ...currentField,
            rowIndex: Math.max(1, Math.round(value))
          }));
          void renderStage();
          renderSelectionPanel();
        }
      }).root,
      createNumberField({
        label: "Offset baselines",
        value: field.offsetBaselines,
        step: 1,
        onInput(value) {
          updateTextField(field.id, (currentField) => ({
            ...currentField,
            offsetBaselines: Math.round(value)
          }));
          void renderStage();
          renderSelectionPanel();
        }
      }).root,
      createNumberField({
        label: "Column span",
        value: field.columnSpan,
        min: 1,
        step: 1,
        onInput(value) {
          updateTextField(field.id, (currentField) => ({
            ...currentField,
            columnSpan: Math.max(1, Math.round(value))
          }));
          void renderStage();
          renderSelectionPanel();
        }
      }).root
    );
    section.body.append(textGrid);
    return;
  }

  const logo = getSelectedLogo();
  if (!logo) {
    return;
  }

  const logoGrid = document.createElement("div");
  logoGrid.className = "parameter-grid";
  const logoFieldSpecs: Array<{ label: string; key: keyof LogoPlacementSpec; min?: number }> = [
    { label: "X", key: "xPx" },
    { label: "Y", key: "yPx" },
    { label: "Width", key: "widthPx", min: 1 },
    { label: "Height", key: "heightPx", min: 1 }
  ];
  for (const spec of logoFieldSpecs) {
    const numberFieldOptions = {
      label: spec.label,
      value: Number(logo[spec.key]),
      step: 1,
      ...(typeof spec.min === "number" ? { min: spec.min } : {}),
      onInput(value: number) {
        updateLogo((currentLogo) => ({
          ...currentLogo,
          [spec.key]: spec.min ? Math.max(spec.min, Math.round(value)) : Math.round(value)
        }));
        void renderStage();
      }
    };
    logoGrid.append(
      createNumberField(numberFieldOptions).root
    );
  }
  section.body.append(logoGrid);
}

async function renderStage(): Promise<void> {
  const stageMount = document.querySelector("[data-stage-mount]");
  const stageMeta = document.querySelector("[data-stage-meta]");
  if (!(stageMount instanceof HTMLElement) || !(stageMeta instanceof HTMLElement)) {
    return;
  }

  const token = ++renderToken;
  const outputs = await evaluateGraph(buildGraph(state.params), registry);
  if (token !== renderToken) {
    return;
  }

  const scene = outputs.get(PREVIEW_NODE_ID)?.scene;
  if (!scene || typeof scene !== "object") {
    throw new Error("Overlay preview graph did not produce a scene output.");
  }

  currentScene = scene as LayerScene;
  stageMount.innerHTML = renderStageMarkup(currentScene);
  stageMeta.textContent = `${state.params.frame.widthPx} x ${state.params.frame.heightPx} frame | ${currentScene.texts.length} text blocks | ${state.showGuides ? "guides on" : "guides off"}`;
}

function syncGuideButton(): void {
  const guideButton = document.querySelector("[data-action='toggle-guides']");
  if (guideButton instanceof HTMLButtonElement) {
    guideButton.textContent = state.showGuides ? "Hide guides" : "Show guides";
  }
}

function resetPreview(): void {
  state.params = createDefaultOverlayParams();
  state.selected = { kind: "text", id: "headline" };
  state.showGuides = true;
  currentDrag = null;
  renderDocumentControls();
  renderSelectionPanel();
  syncGuideButton();
  void renderStage();
}

function buildAppShell(): void {
  const app = document.querySelector("#app");
  if (!(app instanceof HTMLElement)) {
    throw new Error("Overlay preview root element is missing.");
  }

  app.innerHTML = `
    <div class="preview-shell">
      <main class="preview-stage-pane">
        <section class="panel panel--stage">
          <div class="hero">
            <div>
              <p class="hero__eyebrow">Brand Layout Ops / Preview Shell</p>
              <h1 class="hero__title">Overlay parity now has a browser surface inside the extracted repo.</h1>
              <p class="hero__copy">This shell stays intentionally narrow: it runs the overlay operator graph, draws guides, and lets you select and drag text or logo placements without pulling layout semantics back into a renderer-specific app.</p>
            </div>
            <div class="hero__actions">
              <button type="button" data-action="reset">Reset demo</button>
              <button type="button" data-action="toggle-guides">Hide guides</button>
            </div>
          </div>
        </section>

        <section class="panel panel--stage stage-card">
          <p class="stage-meta" data-stage-meta></p>
          <div class="stage-frame">
            <div class="stage-mount" data-stage-mount></div>
          </div>
          <p class="shortcut-note">Shortcuts: press G to toggle guides. Hold Shift while dragging to axis-lock.</p>
        </section>
      </main>

      <aside class="preview-sidebar">
        <section class="panel panel--sidebar" data-document-panel></section>
        <section class="panel panel--sidebar" data-selection-panel></section>
      </aside>
    </div>
  `;

  renderDocumentControls();
  renderSelectionPanel();
  syncGuideButton();

  const resetButton = document.querySelector("[data-action='reset']");
  const guideButton = document.querySelector("[data-action='toggle-guides']");
  resetButton?.addEventListener("click", () => {
    resetPreview();
  });
  guideButton?.addEventListener("click", () => {
    state.showGuides = !state.showGuides;
    renderDocumentControls();
    syncGuideButton();
    void renderStage();
  });
}

function handleStagePointerDown(event: PointerEvent): void {
  const itemElement = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-kind][data-id]");
  if (!itemElement || !currentScene) {
    select(null);
    void renderStage();
    return;
  }

  const id = itemElement.dataset.id;
  const kind = itemElement.dataset.kind;
  if (!id || (kind !== "text" && kind !== "logo")) {
    return;
  }

  const selection: Selection = kind === "text"
    ? { kind: "text", id }
    : { kind: "logo", id };
  select(selection);
  void renderStage();

  if (selection.kind === "text") {
    const textField = state.params.textFields.find((field) => field.id === id);
    if (!textField) {
      return;
    }

    currentDrag = {
      selection,
      metrics: currentScene.grid,
      startClientX: event.clientX,
      startClientY: event.clientY,
      initialField: { ...textField }
    };
    return;
  }

  if (!state.params.logo) {
    return;
  }

  currentDrag = {
    selection,
    metrics: currentScene.grid,
    startClientX: event.clientX,
    startClientY: event.clientY,
    initialLogo: { ...state.params.logo }
  };
}

function handleStageDoubleClick(event: MouseEvent): void {
  const itemElement = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-kind='text'][data-id]");
  const id = itemElement?.dataset.id;
  if (!id) {
    return;
  }

  setTextSelection(id, true);
  void renderStage();
}

function handlePointerMove(event: PointerEvent): void {
  const drag = currentDrag;
  if (!drag) {
    return;
  }

  const { deltaXPx, deltaYPx } = getFrameDeltaFromPointer(event.clientX, event.clientY);
  const axisLock = getAxisLock(deltaXPx, deltaYPx, event.shiftKey);

  if (drag.selection.kind === "text" && drag.initialField) {
    const initialField = drag.initialField;
    const metrics = drag.metrics;
    updateTextField(drag.selection.id, () => moveTextField(initialField, metrics, {
      deltaXPx,
      deltaYPx,
      axisLock
    }));
    void renderStage();
    return;
  }

  if (drag.selection.kind === "logo" && drag.initialLogo) {
    const initialLogo = drag.initialLogo;
    updateLogo(() => moveLogo(initialLogo, {
      deltaXPx,
      deltaYPx,
      axisLock
    }));
    void renderStage();
  }
}

function handlePointerUp(): void {
  if (!currentDrag) {
    return;
  }

  currentDrag = null;
  renderSelectionPanel();
}

function handleKeyDown(event: KeyboardEvent): void {
  const activeTagName = document.activeElement?.tagName;
  const isEditingField = activeTagName === "INPUT" || activeTagName === "TEXTAREA";
  if (!isEditingField && event.key.toLowerCase() === "g") {
    state.showGuides = !state.showGuides;
    renderDocumentControls();
    syncGuideButton();
    void renderStage();
  }

  if (event.key === "Escape") {
    currentDrag = null;
  }
}

buildAppShell();
document.addEventListener("pointerdown", (event) => {
  const stageMount = document.querySelector("[data-stage-mount]");
  if (!(stageMount instanceof HTMLElement) || !stageMount.contains(event.target as Node)) {
    return;
  }

  handleStagePointerDown(event);
});
document.addEventListener("dblclick", (event) => {
  const stageMount = document.querySelector("[data-stage-mount]");
  if (!(stageMount instanceof HTMLElement) || !stageMount.contains(event.target as Node)) {
    return;
  }

  handleStageDoubleClick(event);
});
window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerup", handlePointerUp);
window.addEventListener("keydown", handleKeyDown);

void renderStage();