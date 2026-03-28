/**
 * grid-section.ts — Layout Grid accordion section builder.
 *
 * Extracted from main.ts. Builds the grid parameter panel
 * (baseline, columns, margins, safe area, guide mode).
 * Receives all dependencies via PreviewAppContext.
 */

import type { PreviewAppContext, GuideMode } from "./preview-app-context.js";
import {
  buildAccordionSectionEl,
  createCheckboxFormGroup,
  createFormGroup,
  createNumberInput,
  createSelectInput,
  wrapCol
} from "@brand-layout-ops/parameter-ui";

export function buildGridSection(ctx: PreviewAppContext): HTMLElement {
  const { state } = ctx;
  const { root, body } = buildAccordionSectionEl("Layout Grid");
  const grid = state.params.grid;

  const displayFields = document.createElement("div");
  displayFields.className = "grid-row";

  displayFields.append(wrapCol(1, createCheckboxFormGroup(
    "Show Overlay",
    state.overlayVisible,
    (visible) => {
      ctx.setOverlayVisible(visible);
      void ctx.renderStage();
    },
    (input) => {
      input.setAttribute("data-overlay-visibility", "");
    }
  )));

  displayFields.append(wrapCol(1, createCheckboxFormGroup(
    "Fit Safe Area",
    grid.fitWithinSafeArea ?? true,
    (fitWithinSafeArea) => {
      state.params = { ...state.params, grid: { ...state.params.grid, fitWithinSafeArea } };
      ctx.buildConfigEditor();
      void ctx.renderStage();
    }
  )));

  displayFields.append(wrapCol(2, createFormGroup(
    "Guides",
    createSelectInput(state.guideMode,
      [{ label: "Off", value: "off" }, { label: "Composition Grid", value: "composition" }, { label: "Baseline Grid", value: "baseline" }],
      (v) => { state.guideMode = v as GuideMode; try { localStorage.setItem("brand-layout-ops-guide-mode-v1", v); } catch { /* quota */ } ctx.buildConfigEditor(); void ctx.renderStage(); }
    )
  )));

  body.append(displayFields);

  const fields = document.createElement("div");
  fields.className = "grid-row";

  fields.append(wrapCol(1, createFormGroup("Baseline (px)",
    createNumberInput(grid.baselineStepPx, { min: 1, max: 48, step: 1 }, v => {
      state.params = ctx.normalizeParamsTextFieldOffsets({
        ...state.params,
        grid: { ...state.params.grid, baselineStepPx: v }
      });
      ctx.buildConfigEditor();
      void ctx.renderStage();
    })
  )));

  fields.append(wrapCol(1, createFormGroup("Rows",
    createNumberInput(grid.rowCount, { min: 1, max: 24, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, rowCount: v } }; void ctx.renderStage();
    })
  )));

  fields.append(wrapCol(1, createFormGroup("Columns",
    createNumberInput(grid.columnCount, { min: 1, max: 24, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, columnCount: v } }; void ctx.renderStage();
    })
  )));

  fields.append(wrapCol(1, createFormGroup("Row Gutter",
    createNumberInput(grid.rowGutterBaselines, { min: 0, max: 48, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, rowGutterBaselines: v } }; void ctx.renderStage();
    })
  )));

  fields.append(wrapCol(1, createFormGroup("Col Gutter",
    createNumberInput(grid.columnGutterBaselines, { min: 0, max: 24, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, columnGutterBaselines: v } }; void ctx.renderStage();
    })
  )));

  body.append(fields);

  const margins = document.createElement("div");
  margins.className = "grid-row";

  margins.append(wrapCol(1, createFormGroup("Top Margin",
    createNumberInput(grid.marginTopBaselines, { min: 0, max: 48, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, marginTopBaselines: v } }; void ctx.renderStage();
    })
  )));

  margins.append(wrapCol(1, createFormGroup("Bottom Margin",
    createNumberInput(grid.marginBottomBaselines, { min: 0, max: 48, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, marginBottomBaselines: v } }; void ctx.renderStage();
    })
  )));

  margins.append(wrapCol(1, createFormGroup("Left Margin",
    createNumberInput(grid.marginLeftBaselines, { min: 0, max: 48, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, marginLeftBaselines: v } }; void ctx.renderStage();
    })
  )));

  margins.append(wrapCol(1, createFormGroup("Right Margin",
    createNumberInput(grid.marginRightBaselines, { min: 0, max: 48, step: 1 }, v => {
      state.params = { ...state.params, grid: { ...state.params.grid, marginRightBaselines: v } }; void ctx.renderStage();
    })
  )));

  body.append(margins);

  if (grid.fitWithinSafeArea !== false) {
    const safeArea = state.params.safeArea;
    const safeFields = document.createElement("div");
    safeFields.className = "grid-row";

    safeFields.append(wrapCol(1, createFormGroup("Safe Top",
      createNumberInput(safeArea.top, { min: 0, step: 1 }, v => {
        state.params = { ...state.params, safeArea: { ...safeArea, top: v } }; void ctx.renderStage();
      })
    )));

    safeFields.append(wrapCol(1, createFormGroup("Safe Right",
      createNumberInput(safeArea.right, { min: 0, step: 1 }, v => {
        state.params = { ...state.params, safeArea: { ...safeArea, right: v } }; void ctx.renderStage();
      })
    )));

    safeFields.append(wrapCol(1, createFormGroup("Safe Bottom",
      createNumberInput(safeArea.bottom, { min: 0, step: 1 }, v => {
        state.params = { ...state.params, safeArea: { ...safeArea, bottom: v } }; void ctx.renderStage();
      })
    )));

    safeFields.append(wrapCol(1, createFormGroup("Safe Left",
      createNumberInput(safeArea.left, { min: 0, step: 1 }, v => {
        state.params = { ...state.params, safeArea: { ...safeArea, left: v } }; void ctx.renderStage();
      })
    )));

    body.append(safeFields);
  }

  return root;
}
