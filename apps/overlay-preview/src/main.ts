import "./styles.css";

import type { ColorRgba, LayerScene, LayoutGridMetrics, LogoPlacementSpec, OperatorGraph, OperatorParameterFieldSchema, OperatorParameterSchema, PointField, ResolvedTextPlacement, TextFieldPlacementSpec, TextStyleSpec } from "@brand-layout-ops/core-types";
import { OperatorRegistry, evaluateGraph } from "@brand-layout-ops/graph-runtime";
import { getColumnSpanWidthPx, getKeylineXPx } from "@brand-layout-ops/layout-grid";
import type { DragAxisLock } from "@brand-layout-ops/overlay-interaction";
import { moveLogo, moveTextField } from "@brand-layout-ops/overlay-interaction";
import {
  createOverlayLayoutOperator,
  getOverlayFieldContentKey,
  inspectOverlayCsvDraft,
  OVERLAY_LAYOUT_OPERATOR_KEY,
  resolveOverlayTextFields,
  resolveOverlayTextValue,
  setOverlayTextValue,
  type OverlayContentSource,
  type OverlayLayoutOperatorParams
} from "@brand-layout-ops/operator-overlay-layout";
import { resolveOrbitField } from "@brand-layout-ops/operator-orbits";
import { resolveSpokeField } from "@brand-layout-ops/operator-spokes";
import { createCheckboxField, createNumberField, createReadoutField, createSection, createSelectField, createTextAreaField } from "@brand-layout-ops/parameter-ui";

import { createDefaultOverlayParams } from "./sample-document.js";
import { buildPreviewOrbitParams, buildPreviewSpokesParams, createDefaultMotionState, getPreviewMotionCenter, type MotionLayerMode, type PreviewMotionState } from "./sample-motion.js";

type Selection =
  | { kind: "text"; id: string }
  | { kind: "logo"; id: string };

interface PreviewState {
  params: OverlayLayoutOperatorParams;
  selected: Selection | null;
  showGuides: boolean;
  motion: PreviewMotionState;
  stagedCsvDraft: string | null;
}

interface DragState {
  selection: Selection;
  metrics: LayoutGridMetrics;
  startClientX: number;
  startClientY: number;
  mode: "move" | "resize-text";
  resizeHandle?: "left" | "right";
  initialField?: TextFieldPlacementSpec;
  initialLogo?: LogoPlacementSpec;
}

const PREVIEW_NODE_ID = "overlay-preview";
const registry = new OperatorRegistry();
registry.register(createOverlayLayoutOperator());

const state: PreviewState = {
  params: createDefaultOverlayParams(),
  selected: { kind: "text", id: "headline" },
  showGuides: true,
  motion: createDefaultMotionState(),
  stagedCsvDraft: null
};

let currentScene: LayerScene | null = null;
let currentDrag: DragState | null = null;
let currentTextEditor: HTMLTextAreaElement | null = null;
let renderToken = 0;
let motionAnimationFrameId: number | null = null;
let previousMotionTimestampMs: number | null = null;

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

function getOverlayParameterSchema(): OperatorParameterSchema | undefined {
  return registry.get(OVERLAY_LAYOUT_OPERATOR_KEY).parameterSchema;
}

function getPathSegments(path: string): string[] {
  return path.split(".").filter(Boolean);
}

function getValueAtPath(target: unknown, path: string): unknown {
  let current: unknown = target;
  for (const segment of getPathSegments(path)) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function setValueAtPath<TValue>(target: TValue, path: string, value: unknown): TValue {
  const segments = getPathSegments(path);
  if (segments.length === 0) {
    return target;
  }

  const root = Array.isArray(target) ? [...target] as unknown[] : { ...(target as Record<string, unknown>) };
  let current: Record<string, unknown> | unknown[] = root as Record<string, unknown>;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const nextValue = current[segment as keyof typeof current];
    const clonedNextValue = Array.isArray(nextValue)
      ? [...nextValue]
      : { ...((nextValue as Record<string, unknown> | undefined) ?? {}) };
    current[segment as keyof typeof current] = clonedNextValue as never;
    current = clonedNextValue as Record<string, unknown> | unknown[];
  }

  const finalSegment = segments[segments.length - 1];
  current[finalSegment as keyof typeof current] = value as never;
  return root as TValue;
}

function updateParamAtPath(path: string, value: unknown): void {
  state.params = setValueAtPath(state.params, path, value);
}

function createSchemaFieldControl(field: OperatorParameterFieldSchema): HTMLElement | null {
  if (field.path === "csvContent.rowIndex" && getContentSource() !== "csv") {
    return null;
  }

  const currentValue = getValueAtPath(state.params, field.path);
  switch (field.kind) {
    case "number": {
      const nextValue = typeof currentValue === "number" ? currentValue : Number(currentValue ?? 0);
      return createNumberField({
        label: field.label,
        value: Number.isFinite(nextValue) ? nextValue : 0,
        ...(field.hint ? { hint: field.hint } : {}),
        ...(field.min !== undefined ? { min: field.min } : {}),
        ...(field.max !== undefined ? { max: field.max } : {}),
        ...(field.step !== undefined ? { step: field.step } : {}),
        onInput(value) {
          updateParamAtPath(field.path, field.min === undefined && field.max === undefined
            ? value
            : clamp(value, field.min ?? Number.NEGATIVE_INFINITY, field.max ?? Number.POSITIVE_INFINITY));
          if (field.path === "csvContent.rowIndex") {
            renderDocumentControls();
            renderSelectionPanel();
          }
          void renderStage();
        }
      }).root;
    }

    case "boolean":
      return createCheckboxField({
        label: field.label,
        ...(field.hint ? { hint: field.hint } : {}),
        checked: Boolean(currentValue),
        onInput(checked) {
          updateParamAtPath(field.path, checked);
          if (field.path === "grid.fitWithinSafeArea") {
            renderCurrentStage();
          } else {
            void renderStage();
          }
        }
      }).root;

    case "select":
      return createSelectField({
        label: field.label,
        ...(field.hint ? { hint: field.hint } : {}),
        value: typeof currentValue === "string" ? currentValue : String(currentValue ?? field.options[0]?.value ?? ""),
        options: field.options,
        onInput(value) {
          updateParamAtPath(field.path, value);
          renderDocumentControls();
          renderSelectionPanel();
          void renderStage();
        }
      }).root;

    default:
      return null;
  }
}

function createSchemaDrivenSections(): HTMLElement[] {
  const schema = getOverlayParameterSchema();
  if (!schema) {
    return [];
  }

  return schema.sections.map((sectionSchema) => {
    const section = createSection(sectionSchema.title, sectionSchema.description);
    const sectionGrid = document.createElement("div");
    sectionGrid.className = "parameter-grid";

    const sectionFields = schema.fields.filter((field) => field.sectionKey === sectionSchema.key);
    for (const field of sectionFields) {
      const control = createSchemaFieldControl(field);
      if (control) {
        sectionGrid.append(control);
      }
    }

    if (sectionGrid.childElementCount > 0) {
      section.body.append(sectionGrid);
    }

    if (sectionSchema.key === "content" && getContentSource() === "csv") {
      const csvSummary = getCsvDraftSummary();
      const csvStatusRow = document.createElement("div");
      csvStatusRow.className = "selection-chip-row";
      csvStatusRow.append(
        createReadoutField({ label: "Headers", value: String(csvSummary.headers.length) }),
        createReadoutField({ label: "Rows", value: String(csvSummary.rowCount) }),
        createReadoutField({ label: "Editing", value: `row ${csvSummary.selectedRowIndex}` }),
        createReadoutField({ label: "Stage", value: hasStagedCsvDraft() ? "pending" : "clean" })
      );
      section.body.append(csvStatusRow);

      const csvFieldStatusRow = document.createElement("div");
      csvFieldStatusRow.className = "selection-chip-row";
      for (const field of state.params.textFields) {
        const contentKey = getOverlayFieldContentKey(field);
        const isMissingFieldKey = csvSummary.missingFieldKeys.includes(contentKey);
        const chipElement = document.createElement("span");
        chipElement.className = `selection-chip${isMissingFieldKey ? " selection-chip--warning" : ""}`;
        chipElement.textContent = `${contentKey}: ${isMissingFieldKey ? "missing" : "mapped"}`;
        csvFieldStatusRow.append(chipElement);
      }
      section.body.append(csvFieldStatusRow);

      const csvRowActionRow = document.createElement("div");
      csvRowActionRow.className = "parameter-action-row";

      const previousRowButton = document.createElement("button");
      previousRowButton.type = "button";
      previousRowButton.textContent = "Previous row";
      previousRowButton.disabled = csvSummary.selectedRowIndex <= 1;
      previousRowButton.addEventListener("click", () => {
        setCsvRowIndex(csvSummary.selectedRowIndex - 1);
        renderDocumentControls();
        renderSelectionPanel();
        void renderStage();
      });

      const nextRowButton = document.createElement("button");
      nextRowButton.type = "button";
      nextRowButton.textContent = csvSummary.selectedRowExists ? "Next row" : "Stay on new row";
      nextRowButton.disabled = !csvSummary.selectedRowExists;
      nextRowButton.addEventListener("click", () => {
        setCsvRowIndex(csvSummary.selectedRowIndex + 1);
        renderDocumentControls();
        renderSelectionPanel();
        void renderStage();
      });

      const normalizeButton = document.createElement("button");
      normalizeButton.type = "button";
      normalizeButton.textContent = "Seed row + headers";
      normalizeButton.disabled = csvSummary.selectedRowExists && csvSummary.missingFieldKeys.length === 0;
      normalizeButton.addEventListener("click", () => {
        normalizeCsvDraftForCurrentFields();
        renderDocumentControls();
        renderSelectionPanel();
        void renderStage();
      });

      csvRowActionRow.append(previousRowButton, nextRowButton, normalizeButton);
      section.body.append(csvRowActionRow);

      if (csvSummary.headers.length > 0) {
        const headersNote = document.createElement("p");
        headersNote.className = "parameter-note";
        headersNote.textContent = `Headers: ${csvSummary.headers.join(", ")}`;
        section.body.append(headersNote);
      }

      if (!csvSummary.selectedRowExists) {
        const rowNote = document.createElement("p");
        rowNote.className = "parameter-note parameter-note--warning";
        rowNote.textContent = `Row ${csvSummary.selectedRowIndex} does not exist yet. Field edits stay live in the preview and will create that row when you seed or apply the staged CSV.`;
        section.body.append(rowNote);
      }

      if (csvSummary.missingFieldKeys.length > 0) {
        const missingColumnsNote = document.createElement("p");
        missingColumnsNote.className = "parameter-note parameter-note--warning";
        missingColumnsNote.textContent = `Missing CSV columns for current field mapping: ${csvSummary.missingFieldKeys.join(", ")}.`;
        section.body.append(missingColumnsNote);
      }

      if (csvSummary.hasUnterminatedQuote) {
        const quoteWarning = document.createElement("p");
        quoteWarning.className = "parameter-note parameter-note--warning";
        quoteWarning.textContent = "The staged CSV draft has an unmatched quote. Preview rendering may fall back to inline values until the draft is valid again.";
        section.body.append(quoteWarning);
      }

      section.body.append(
        createTextAreaField({
          label: "CSV draft",
          value: getEffectiveCsvDraft(),
          rows: 8,
          placeholder: "eyebrow,headline,body",
          hint: "Headers map to each field's content id. The selection editor stages edits into the current row until you apply them.",
          onInput(value) {
            stageCsvDraft(value);
            renderDocumentControls();
            renderSelectionPanel();
            void renderStage();
          }
        }).root
      );

      const csvActionRow = document.createElement("div");
      csvActionRow.className = "parameter-action-row";

      const applyButton = document.createElement("button");
      applyButton.type = "button";
      applyButton.textContent = "Apply staged CSV";
      applyButton.disabled = !hasStagedCsvDraft();
      applyButton.addEventListener("click", () => {
        applyStagedCsvDraft();
        renderDocumentControls();
        renderSelectionPanel();
        void renderStage();
      });

      const discardButton = document.createElement("button");
      discardButton.type = "button";
      discardButton.textContent = "Discard staged CSV";
      discardButton.disabled = !hasStagedCsvDraft();
      discardButton.addEventListener("click", () => {
        discardStagedCsvDraft();
        renderDocumentControls();
        renderSelectionPanel();
        void renderStage();
      });

      csvActionRow.append(applyButton, discardButton);
      section.body.append(csvActionRow);
    }

    return section.root;
  }).filter((sectionRoot) => sectionRoot.querySelector(".parameter-section__body")?.childElementCount);
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

function getContentSource(): OverlayContentSource {
  return state.params.contentSource === "csv" ? "csv" : "inline";
}

function getEffectiveCsvDraft(): string {
  return state.stagedCsvDraft ?? state.params.csvContent?.draft ?? "";
}

function getCsvDraftSummary() {
  return inspectOverlayCsvDraft(getEffectiveParams());
}

function hasStagedCsvDraft(): boolean {
  return state.stagedCsvDraft !== null && state.stagedCsvDraft !== (state.params.csvContent?.draft ?? "");
}

function getEffectiveParams(): OverlayLayoutOperatorParams {
  if (getContentSource() !== "csv" || state.stagedCsvDraft === null) {
    return state.params;
  }

  return {
    ...state.params,
    csvContent: {
      draft: state.stagedCsvDraft,
      rowIndex: state.params.csvContent?.rowIndex ?? 1
    }
  };
}

function getResolvedTextFieldText(field: TextFieldPlacementSpec): string {
  return resolveOverlayTextValue(getEffectiveParams(), field);
}

function setCsvRowIndex(rowIndex: number): void {
  state.params = {
    ...state.params,
    csvContent: {
      draft: state.params.csvContent?.draft ?? "",
      rowIndex: Math.max(1, Math.round(rowIndex))
    }
  };
}

function stageCsvDraft(draft: string): void {
  state.stagedCsvDraft = draft;
}

function applyStagedCsvDraft(): void {
  if (state.stagedCsvDraft === null) {
    return;
  }

  state.params = {
    ...state.params,
    csvContent: {
      draft: state.stagedCsvDraft,
      rowIndex: state.params.csvContent?.rowIndex ?? 1
    }
  };
  state.stagedCsvDraft = null;
}

function discardStagedCsvDraft(): void {
  state.stagedCsvDraft = null;
}

function normalizeCsvDraftForCurrentFields(): void {
  let nextParams = getEffectiveParams();
  for (const field of state.params.textFields) {
    nextParams = setOverlayTextValue(nextParams, field.id, resolveOverlayTextValue(nextParams, field));
  }

  stageCsvDraft(nextParams.csvContent?.draft ?? "");
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isColorRgba(value: unknown): value is ColorRgba {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ColorRgba>;
  return [candidate.r, candidate.g, candidate.b].every((channel) => typeof channel === "number" && Number.isFinite(channel));
}

function formatRgbaColor(color: ColorRgba, alphaMultiplier = 1): string {
  const alpha = clamp((color.a ?? 1) * alphaMultiplier, 0, 1);
  const red = clamp(Math.round(color.r * 255), 0, 255);
  const green = clamp(Math.round(color.g * 255), 0, 255);
  const blue = clamp(Math.round(color.b * 255), 0, 255);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getMotionLayerMode(): MotionLayerMode {
  return state.motion.mode;
}

function hasMotionLayer(mode: MotionLayerMode, layer: Exclude<MotionLayerMode, "none" | "both">): boolean {
  return mode === "both" || mode === layer;
}

function getMotionBackdropRadiusPx(): number {
  return Math.min(state.params.frame.widthPx, state.params.frame.heightPx) * 0.36;
}

function createBackdropMarkup(): string {
  return `<rect x="0" y="0" width="${state.params.frame.widthPx}" height="${state.params.frame.heightPx}" fill="#f9f4ed" />`;
}

function createGuideMarkup(metrics: LayoutGridMetrics): string {
  if (!state.showGuides) {
    return "";
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
      <rect x="${metrics.layoutLeftPx}" y="${metrics.layoutTopPx}" width="${metrics.layoutRightPx - metrics.layoutLeftPx}" height="${metrics.layoutBottomPx - metrics.layoutTopPx}" fill="none" stroke="rgba(232, 116, 0, 0.24)" stroke-width="2" />
      <rect x="${metrics.contentLeftPx}" y="${metrics.contentTopPx}" width="${metrics.contentRightPx - metrics.contentLeftPx}" height="${metrics.contentBottomPx - metrics.contentTopPx}" fill="rgba(232, 116, 0, 0.04)" stroke="rgba(232, 116, 0, 0.14)" stroke-width="2" />
      ${baselineLines.join("")}
      ${keylines.join("")}
    </g>
  `;
}

function createMotionPointMarkup(pointField: PointField, fallbackColor: ColorRgba, className: string): string {
  return pointField.points.map((point) => {
    const pointColor = isColorRgba(point.attributes.color) ? point.attributes.color : fallbackColor;
    const pscaleValue = Number(point.attributes.pscale ?? 1);
    const phaseOpacityMultiplier = getPointPhaseOpacityMultiplier(point);
    const radius = clamp(1.6 + pscaleValue * 3.6, 1.4, 9.2);
    const glowRadius = radius * 1.9;

    return `
      <g class="${className}">
        <circle cx="${point.position.x}" cy="${point.position.y}" r="${glowRadius}" fill="${formatRgbaColor(pointColor, state.motion.opacity * 0.08 * phaseOpacityMultiplier)}" />
        <circle cx="${point.position.x}" cy="${point.position.y}" r="${radius}" fill="${formatRgbaColor(pointColor, state.motion.opacity * phaseOpacityMultiplier)}" />
      </g>
    `;
  }).join("");
}

function getNumericPointAttribute(point: PointField["points"][number], key: string): number | null {
  const value = Number(point.attributes[key]);
  return Number.isFinite(value) ? value : null;
}

function getPhaseFillFromAngleDegrees(angleDeg: number): number {
  const normalized = ((angleDeg % 360) + 360) % 360;
  const displayU = normalized / 360;
  if (displayU > 0 && displayU <= 0.5) {
    return displayU / 0.5;
  }

  if (displayU > 0.5) {
    return (displayU - 0.5) / 0.5;
  }

  return 1;
}

function getPointPhaseOpacityMultiplier(point: PointField["points"][number]): number {
  const spokeAngleDeg = getNumericPointAttribute(point, "spoke_angle_deg");
  if (spokeAngleDeg !== null) {
    return 0.24 + getPhaseFillFromAngleDegrees(spokeAngleDeg) * 0.9;
  }

  const orbitAngleDeg = getNumericPointAttribute(point, "orbit_angle_deg");
  if (orbitAngleDeg !== null) {
    return 0.55 + getPhaseFillFromAngleDegrees(orbitAngleDeg) * 0.3;
  }

  return 1;
}

function createOrbitTrailMarkup(pointField: PointField, center: { x: number; y: number }, fallbackColor: ColorRgba): string {
  const rings = new Map<number, PointField["points"]>();

  for (const point of pointField.points) {
    const orbitIndex = getNumericPointAttribute(point, "orbit_index");
    if (orbitIndex === null) {
      continue;
    }

    const ringPoints = rings.get(orbitIndex) ?? [];
    ringPoints.push(point);
    rings.set(orbitIndex, ringPoints);
  }

  return Array.from(rings.entries()).map(([ringIndex, ringPoints]) => {
    const sortedPoints = [...ringPoints].sort((left, right) => {
      return (getNumericPointAttribute(left, "orbit_point_index") ?? 0) - (getNumericPointAttribute(right, "orbit_point_index") ?? 0);
    });

    const ringColor = isColorRgba(sortedPoints[0]?.attributes.color) ? sortedPoints[0].attributes.color : fallbackColor;
    const radiusPx = Math.max(0, getNumericPointAttribute(sortedPoints[0], "orbit_radius_px") ?? 0);
    const ringOutline = radiusPx > 0
      ? `<circle cx="${center.x}" cy="${center.y}" r="${radiusPx}" fill="none" stroke="${formatRgbaColor(ringColor, state.motion.opacity * 0.12)}" stroke-width="1.2" />`
      : "";

    const ringSegments = sortedPoints.map((point, index) => {
      const nextPoint = sortedPoints[(index + 1) % sortedPoints.length];
      if (!nextPoint) {
        return "";
      }

      return `<line x1="${point.position.x}" y1="${point.position.y}" x2="${nextPoint.position.x}" y2="${nextPoint.position.y}" stroke="${formatRgbaColor(ringColor, state.motion.opacity * 0.16)}" stroke-width="1.4" stroke-linecap="round" />`;
    }).join("");

    return `<g class="motion-layer motion-layer--orbit-trail" data-ring-index="${ringIndex}">${ringOutline}${ringSegments}</g>`;
  }).join("");
}

function createSpokeTrailMarkup(pointField: PointField, center: { x: number; y: number }, fallbackColor: ColorRgba): string {
  const spokeGroups = new Map<string, PointField["points"]>();

  for (const point of pointField.points) {
    const bandIndex = getNumericPointAttribute(point, "spoke_band_index");
    const spokeIndex = getNumericPointAttribute(point, "spoke_index");
    if (bandIndex === null || spokeIndex === null) {
      continue;
    }

    const groupKey = `${bandIndex}:${spokeIndex}`;
    const spokePoints = spokeGroups.get(groupKey) ?? [];
    spokePoints.push(point);
    spokeGroups.set(groupKey, spokePoints);
  }

  return Array.from(spokeGroups.values()).map((spokePoints) => {
    const sortedPoints = [...spokePoints].sort((left, right) => {
      return (getNumericPointAttribute(left, "spoke_point_index") ?? 0) - (getNumericPointAttribute(right, "spoke_point_index") ?? 0);
    });
    const spokeColor = isColorRgba(sortedPoints[0]?.attributes.color) ? sortedPoints[0].attributes.color : fallbackColor;

    return sortedPoints.map((point, index) => {
      const previousPoint = index === 0 ? null : sortedPoints[index - 1];
      const startX = previousPoint?.position.x ?? center.x;
      const startY = previousPoint?.position.y ?? center.y;
      const phaseOpacityMultiplier = getPointPhaseOpacityMultiplier(point);
      const alphaScale = (previousPoint ? 0.16 + index * 0.035 : 0.1) * phaseOpacityMultiplier;
      const widthPx = previousPoint ? 1.4 : 1.1;

      return `<line x1="${startX}" y1="${startY}" x2="${point.position.x}" y2="${point.position.y}" stroke="${formatRgbaColor(spokeColor, state.motion.opacity * alphaScale)}" stroke-width="${widthPx}" stroke-linecap="round" />`;
    }).join("");
  }).join("");
}

function createMotionPhaseLobeMarkup(center: { x: number; y: number }, backdropRadiusPx: number): string {
  const lobeOffsetPx = backdropRadiusPx * 0.18;
  const lobeRadiusPx = backdropRadiusPx * 0.54;

  return `
    <g data-motion-phase-lobes>
      <circle cx="${center.x - lobeOffsetPx}" cy="${center.y}" r="${lobeRadiusPx}" fill="rgba(255, 245, 228, 0.1)" />
      <circle cx="${center.x + lobeOffsetPx}" cy="${center.y}" r="${lobeRadiusPx}" fill="rgba(232, 244, 255, 0.08)" />
    </g>
  `;
}

function createMotionEchoMarkup(center: { x: number; y: number }, backdropRadiusPx: number): string {
  const echoScales = [0.28, 0.46, 0.68];
  return echoScales.map((scale, index) => {
    const radiusPx = backdropRadiusPx * scale;
    return `<circle cx="${center.x}" cy="${center.y}" r="${radiusPx}" fill="none" stroke="rgba(255, 248, 237, ${0.12 - index * 0.025})" stroke-width="${2 - index * 0.35}" stroke-dasharray="${index === 0 ? "none" : "10 16"}" />`;
  }).join("");
}

function createMotionMarkup(): string {
  const mode = getMotionLayerMode();
  if (mode === "none") {
    return "";
  }

  const motionLayers: string[] = [];
  const spokeField = hasMotionLayer(mode, "spokes")
    ? resolveSpokeField(buildPreviewSpokesParams(state.params.frame, state.motion.timeSeconds))
    : null;
  const orbitField = hasMotionLayer(mode, "orbits")
    ? resolveOrbitField(buildPreviewOrbitParams(state.params.frame, state.motion.timeSeconds))
    : null;

  if (hasMotionLayer(mode, "spokes")) {
    motionLayers.push(
      createSpokeTrailMarkup(
        spokeField!,
        getPreviewMotionCenter(state.params.frame),
        { r: 0.84, g: 0.92, b: 1, a: 0.45 }
      ),
      createMotionPointMarkup(
        spokeField!,
        { r: 0.84, g: 0.92, b: 1, a: 0.45 },
        "motion-layer motion-layer--spokes"
      )
    );
  }

  if (hasMotionLayer(mode, "orbits")) {
    motionLayers.push(
      createOrbitTrailMarkup(
        orbitField!,
        getPreviewMotionCenter(state.params.frame),
        { r: 1, g: 0.84, b: 0.58, a: 0.76 }
      ),
      createMotionPointMarkup(
        orbitField!,
        { r: 1, g: 0.84, b: 0.58, a: 0.76 },
        "motion-layer motion-layer--orbits"
      )
    );
  }

  const center = getPreviewMotionCenter(state.params.frame);
  const backdropRadiusPx = getMotionBackdropRadiusPx();

  return `
    <g data-motion aria-hidden="true" style="pointer-events: none;">
      <defs>
        <radialGradient id="motion-aura-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff2dc" stop-opacity="0.75" />
          <stop offset="55%" stop-color="#ffe0b6" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#ffe0b6" stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle cx="${center.x}" cy="${center.y}" r="${backdropRadiusPx}" fill="url(#motion-aura-gradient)" opacity="${clamp(state.motion.opacity, 0, 1)}" />
      ${createMotionPhaseLobeMarkup(center, backdropRadiusPx)}
      ${createMotionEchoMarkup(center, backdropRadiusPx)}
      ${motionLayers.join("")}
    </g>
  `;
}

function createSelectedBaselineGuideMarkup(scene: LayerScene): string {
  const selected = state.selected;
  if (selected?.kind !== "text") {
    return "";
  }

  const text = scene.texts.find((candidate) => candidate.id === selected.id);
  if (!text) {
    return "";
  }

  const baselineYPx = text.anchorBaselineYPx;
  const baselineStartXPx = scene.grid.contentLeftPx;
  const baselineEndXPx = scene.grid.contentRightPx;
  const labelXPx = Math.min(baselineEndXPx - 110, text.anchorXPx + 12);
  const labelYPx = Math.max(scene.grid.contentTopPx + 18, baselineYPx - 10);

  return `
    <g data-selected-baseline-guide aria-hidden="true" style="pointer-events: none;">
      <line x1="${baselineStartXPx}" y1="${baselineYPx}" x2="${baselineEndXPx}" y2="${baselineYPx}" stroke="rgba(0, 122, 255, 0.72)" stroke-width="2" stroke-dasharray="10 8" />
      <circle cx="${text.anchorXPx}" cy="${baselineYPx}" r="5" fill="rgba(0, 122, 255, 0.92)" />
      <rect x="${labelXPx - 10}" y="${labelYPx - 18}" width="118" height="22" rx="11" fill="rgba(0, 122, 255, 0.12)" stroke="rgba(0, 122, 255, 0.28)" stroke-width="1" />
      <text x="${labelXPx}" y="${labelYPx - 3}" fill="rgba(0, 72, 163, 0.95)" font-size="13" font-family="IBM Plex Mono, monospace">first baseline</text>
    </g>
  `;
}

function resolveTextFieldResize(
  field: TextFieldPlacementSpec,
  metrics: LayoutGridMetrics,
  handle: "left" | "right",
  deltaXPx: number
): TextFieldPlacementSpec {
  const safeStartKeyline = clamp(Math.round(field.keylineIndex), 1, Math.max(1, metrics.columnCount));
  const safeEndKeyline = clamp(safeStartKeyline + Math.max(1, Math.round(field.columnSpan)) - 1, safeStartKeyline, Math.max(1, metrics.columnCount));

  if (handle === "right") {
    const anchorXPx = getKeylineXPx(metrics, safeStartKeyline);
    const targetRightXPx = anchorXPx + getColumnSpanWidthPx(metrics, safeStartKeyline, safeEndKeyline - safeStartKeyline + 1) + deltaXPx;

    let bestSpan = 1;
    let bestDistance = Number.POSITIVE_INFINITY;
    const maxAvailableSpan = Math.max(1, metrics.columnCount - safeStartKeyline + 1);
    for (let span = 1; span <= maxAvailableSpan; span += 1) {
      const candidateRightXPx = anchorXPx + getColumnSpanWidthPx(metrics, safeStartKeyline, span);
      const distance = Math.abs(targetRightXPx - candidateRightXPx);
      if (distance < bestDistance) {
        bestSpan = span;
        bestDistance = distance;
      }
    }

    return {
      ...field,
      keylineIndex: safeStartKeyline,
      columnSpan: bestSpan
    };
  }

  let bestStartKeyline = safeStartKeyline;
  let bestDistance = Number.POSITIVE_INFINITY;
  const targetLeftXPx = getKeylineXPx(metrics, safeStartKeyline) + deltaXPx;
  for (let candidateStartKeyline = 1; candidateStartKeyline <= safeEndKeyline; candidateStartKeyline += 1) {
    const candidateLeftXPx = getKeylineXPx(metrics, candidateStartKeyline);
    const distance = Math.abs(targetLeftXPx - candidateLeftXPx);
    if (distance < bestDistance) {
      bestStartKeyline = candidateStartKeyline;
      bestDistance = distance;
    }
  }

  return {
    ...field,
    keylineIndex: bestStartKeyline,
    columnSpan: Math.max(1, safeEndKeyline - bestStartKeyline + 1)
  };
}

function createTextResizeHandlesMarkup(text: ResolvedTextPlacement): string {
  if (state.selected?.kind !== "text" || state.selected.id !== text.id) {
    return "";
  }

  const centerYPx = text.bounds.top + text.bounds.height * 0.5;
  const handleMarkup = (handle: "left" | "right", xPx: number) => `
    <g data-kind="text-resize-handle" data-id="${escapeXml(text.id)}" data-handle="${handle}" style="cursor: ew-resize;">
      <rect x="${xPx - 13}" y="${centerYPx - 17}" width="26" height="34" rx="13" fill="rgba(255,255,255,0.001)" />
      <circle cx="${xPx}" cy="${centerYPx}" r="8" fill="rgba(255, 255, 255, 0.95)" stroke="rgba(232, 116, 0, 0.88)" stroke-width="3" />
      <path d="M ${xPx - 3} ${centerYPx - 4} L ${xPx - 3} ${centerYPx + 4} M ${xPx + 3} ${centerYPx - 4} L ${xPx + 3} ${centerYPx + 4}" stroke="rgba(140, 77, 21, 0.95)" stroke-width="1.8" stroke-linecap="round" />
    </g>
  `;

  return `
    <g data-text-resize-handles aria-hidden="true">
      ${handleMarkup("left", text.bounds.left)}
      ${handleMarkup("right", text.bounds.right)}
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
    ${createTextResizeHandlesMarkup(text)}
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
      ${createBackdropMarkup()}
      ${createMotionMarkup()}
      ${createGuideMarkup(scene.grid)}
      ${createSelectedBaselineGuideMarkup(scene)}
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

  const motionSection = createSection("Motion", "This preview layer stays adapter-side. It uses the existing orbits and spokes operators without pulling motion semantics into the layout kernel.");
  const motionGrid = document.createElement("div");
  motionGrid.className = "parameter-grid";
  motionGrid.append(
    createSelectField({
      label: "Layer",
      value: getMotionLayerMode(),
      options: [
        { label: "Off", value: "none" },
        { label: "Orbits", value: "orbits" },
        { label: "Spokes", value: "spokes" },
        { label: "Both", value: "both" }
      ],
      onInput(value) {
        state.motion.mode = value === "none" || value === "orbits" || value === "spokes" || value === "both"
          ? value
          : "both";
        renderCurrentStage();
      }
    }).root,
    createCheckboxField({
      label: "Animate",
      checked: state.motion.animate,
      onInput(checked) {
        state.motion.animate = checked;
        syncMotionAnimation();
        renderCurrentStage();
      }
    }).root,
    createNumberField({
      label: "Speed",
      value: state.motion.speed,
      min: 0,
      step: 0.1,
      onInput(value) {
        state.motion.speed = Math.max(0, value);
      }
    }).root,
    createNumberField({
      label: "Time",
      value: state.motion.timeSeconds,
      min: 0,
      step: 0.1,
      onInput(value) {
        state.motion.timeSeconds = Math.max(0, value);
        renderCurrentStage();
      }
    }).root,
    createNumberField({
      label: "Opacity",
      value: state.motion.opacity,
      min: 0,
      max: 1,
      step: 0.05,
      onInput(value) {
        state.motion.opacity = clamp(value, 0, 1);
        renderCurrentStage();
      }
    }).root
  );
  motionSection.body.append(motionGrid);

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

  const schemaSectionRoots = createSchemaDrivenSections();

  documentPanel.append(...schemaSectionRoots.slice(0, 1), motionSection.root, ...schemaSectionRoots.slice(1), stylesSection.root);
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
      formatSelectionChip("content", getContentSource()),
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

    const contentFieldKey = getOverlayFieldContentKey(field);
    const csvSummary = getContentSource() === "csv" ? getCsvDraftSummary() : null;
    const textArea = createTextAreaField({
      label: getContentSource() === "csv" ? `CSV value (${contentFieldKey})` : "Inline text",
      value: getResolvedTextFieldText(field),
      rows: 6,
      onInput(value) {
        if (getContentSource() === "csv") {
          const nextParams = setOverlayTextValue(getEffectiveParams(), field.id, value);
          stageCsvDraft(nextParams.csvContent?.draft ?? "");
        } else {
          state.params = setOverlayTextValue(state.params, field.id, value);
        }
        renderDocumentControls();
        renderSelectionPanel();
        void renderStage();
      }
    });
    currentTextEditor = textArea.input;
    section.body.append(textArea.root);

    if (csvSummary) {
      const isMissingColumn = csvSummary.missingFieldKeys.includes(contentFieldKey);
      const stagedEditNote = document.createElement("p");
      stagedEditNote.className = `parameter-note${isMissingColumn || !csvSummary.selectedRowExists ? " parameter-note--warning" : ""}`;
      stagedEditNote.textContent = isMissingColumn || !csvSummary.selectedRowExists
        ? `This field edit is staging row ${csvSummary.selectedRowIndex}. Apply it from the Content section to write back the row${isMissingColumn ? ` and add the ${contentFieldKey} column` : ""}.`
        : `This field edit is staging row ${csvSummary.selectedRowIndex}. Apply it from the Content section when you want the CSV draft to become the live source.`;
      section.body.append(stagedEditNote);
    }

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
  const token = ++renderToken;
  const effectiveParams = getEffectiveParams();
  const outputs = await evaluateGraph(buildGraph(effectiveParams), registry);
  if (token !== renderToken) {
    return;
  }

  const scene = outputs.get(PREVIEW_NODE_ID)?.scene;
  if (!scene || typeof scene !== "object") {
    throw new Error("Overlay preview graph did not produce a scene output.");
  }

  currentScene = scene as LayerScene;
  renderCurrentStage();
}

function renderCurrentStage(): void {
  const stageMount = document.querySelector("[data-stage-mount]");
  const stageMeta = document.querySelector("[data-stage-meta]");
  if (!(stageMount instanceof HTMLElement) || !(stageMeta instanceof HTMLElement)) {
    return;
  }

  if (!currentScene) {
    stageMount.innerHTML = "";
    stageMeta.textContent = "";
    return;
  }
  stageMount.innerHTML = renderStageMarkup(currentScene);
  const csvSummary = getContentSource() === "csv" ? getCsvDraftSummary() : null;
  const motionLabel = getMotionLayerMode() === "none"
    ? "motion off"
    : `${getMotionLayerMode()} ${state.motion.animate ? `@ ${state.motion.timeSeconds.toFixed(1)}s` : "paused"}`;
  stageMeta.textContent = `${state.params.frame.widthPx} x ${state.params.frame.heightPx} frame | ${currentScene.texts.length} text blocks | ${motionLabel} | ${getContentSource()} content${csvSummary ? ` row ${csvSummary.selectedRowIndex}/${Math.max(csvSummary.rowCount, csvSummary.selectedRowIndex)}${hasStagedCsvDraft() ? " staged" : ""}` : ""} | ${state.showGuides ? "guides on" : "guides off"}`;
}

function stopMotionAnimation(): void {
  if (motionAnimationFrameId !== null) {
    window.cancelAnimationFrame(motionAnimationFrameId);
    motionAnimationFrameId = null;
  }
  previousMotionTimestampMs = null;
}

function tickMotion(timestampMs: number): void {
  if (!state.motion.animate) {
    stopMotionAnimation();
    return;
  }

  if (previousMotionTimestampMs === null) {
    previousMotionTimestampMs = timestampMs;
  }

  const deltaSeconds = clamp((timestampMs - previousMotionTimestampMs) / 1000, 0, 0.05);
  previousMotionTimestampMs = timestampMs;
  state.motion.timeSeconds = Math.max(0, state.motion.timeSeconds + deltaSeconds * state.motion.speed);
  renderCurrentStage();
  motionAnimationFrameId = window.requestAnimationFrame(tickMotion);
}

function syncMotionAnimation(): void {
  if (state.motion.animate) {
    if (motionAnimationFrameId === null) {
      motionAnimationFrameId = window.requestAnimationFrame(tickMotion);
    }
    return;
  }

  stopMotionAnimation();
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
  state.motion = createDefaultMotionState();
  state.stagedCsvDraft = null;
  currentDrag = null;
  renderDocumentControls();
  renderSelectionPanel();
  syncGuideButton();
  syncMotionAnimation();
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
              <p class="hero__copy">This shell stays intentionally narrow: it runs the overlay operator graph, layers the coarse motion operators behind it, and lets you validate text or logo interaction without pulling layout semantics back into a renderer-specific app.</p>
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
          <p class="shortcut-note">Shortcuts: press G to toggle guides. Hold Shift while dragging to axis-lock. Motion animation is preview-only and does not affect layout resolution.</p>
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
  if (!id || (kind !== "text" && kind !== "logo" && kind !== "text-resize-handle")) {
    return;
  }

  if (kind === "text-resize-handle") {
    const textField = state.params.textFields.find((field) => field.id === id);
    const handle = itemElement.dataset.handle === "left" ? "left" : "right";
    if (!textField) {
      return;
    }

    select({ kind: "text", id });
    currentDrag = {
      selection: { kind: "text", id },
      mode: "resize-text",
      resizeHandle: handle,
      metrics: currentScene.grid,
      startClientX: event.clientX,
      startClientY: event.clientY,
      initialField: { ...textField }
    };
    void renderStage();
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
      mode: "move",
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
    mode: "move",
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

  if (drag.mode === "resize-text" && drag.selection.kind === "text" && drag.initialField && drag.resizeHandle) {
    const initialField = drag.initialField;
    const metrics = drag.metrics;
    updateTextField(drag.selection.id, () => resolveTextFieldResize(initialField, metrics, drag.resizeHandle!, deltaXPx));
    void renderStage();
    return;
  }

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
syncMotionAnimation();
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