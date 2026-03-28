/**
 * scatter-section.ts — Scatter accordion section builder.
 *
 * Operator panel for the scatter scene family.
 */

import {
  buildAccordionSectionEl,
  createFormGroup,
  createNumberInput,
  createSelectInput,
  createSliderInput,
  wrapCol
} from "@brand-layout-ops/parameter-ui";
import type { PreviewAppContext } from "./preview-app-context.js";
import type { ScatterPreviewConfig } from "./scene-family-preview.js";

export function buildScatterSection(ctx: PreviewAppContext): HTMLElement {
  const { root, body } = buildAccordionSectionEl("Scatter");
  const sc = ctx.state.documentProject.sceneFamilyConfigs.scatter;

  function update(patch: Partial<ScatterPreviewConfig>, rebuildEditor = false) {
    ctx.state.documentProject = {
      ...ctx.state.documentProject,
      sceneFamilyConfigs: {
        ...ctx.state.documentProject.sceneFamilyConfigs,
        scatter: {
          ...ctx.state.documentProject.sceneFamilyConfigs.scatter,
          ...patch
        }
      }
    };
    ctx.syncDocumentBackgroundGraph();
    ctx.markDocumentDirty();
    if (rebuildEditor) {
      ctx.buildConfigEditor();
    }
    void ctx.renderStage();
  }

  const pointFields = document.createElement("div");
  pointFields.className = "grid-row";

  pointFields.append(wrapCol(1, createFormGroup("Point Count",
    createNumberInput(sc.pointCount, { min: 1, max: 4000, step: 1 }, (value) => {
      update({ pointCount: Math.round(value) });
    })
  )));

  pointFields.append(wrapCol(1, createFormGroup("Seed",
    createNumberInput(sc.seed, { min: 0, max: 9999, step: 1 }, (value) => {
      update({ seed: Math.round(value) });
    })
  )));

  pointFields.append(wrapCol(1, createFormGroup("Distribution",
    createSelectInput(sc.distributionMode, [
      { label: "Uniform", value: "uniform" },
      { label: "Density Weighted", value: "density-weighted" }
    ], (value) => {
      update({ distributionMode: value as ScatterPreviewConfig["distributionMode"] });
    })
  )));

  pointFields.append(wrapCol(1, createFormGroup("Margin",
    createSliderInput(sc.marginPx, { min: 0, max: 120, step: 1 }, (value) => {
      update({ marginPx: value });
    })
  )));

  body.append(pointFields);

  const shapeFields = document.createElement("div");
  shapeFields.className = "grid-row";

  shapeFields.append(wrapCol(1, createFormGroup("Shape",
    createSelectInput(sc.shapeKind, [
      { label: "Ellipse", value: "ellipse" },
      { label: "Rectangle", value: "rect" },
      { label: "Rounded Rect", value: "rounded-rect" },
      { label: "SVG Path", value: "svg-path" }
    ], (value) => {
      update({ shapeKind: value as ScatterPreviewConfig["shapeKind"] }, true);
    })
  )));

  if (sc.shapeKind !== "svg-path") {
    shapeFields.append(wrapCol(1, createFormGroup("Width",
      createSliderInput(sc.widthPx, { min: 40, max: 1200, step: 1 }, (value) => {
        update({ widthPx: value });
      })
    )));

    shapeFields.append(wrapCol(1, createFormGroup("Height",
      createSliderInput(sc.heightPx, { min: 40, max: 1200, step: 1 }, (value) => {
        update({ heightPx: value });
      })
    )));
  }

  if (sc.shapeKind === "rounded-rect") {
    shapeFields.append(wrapCol(1, createFormGroup("Corner Radius",
      createSliderInput(sc.cornerRadiusPx, { min: 0, max: 240, step: 1 }, (value) => {
        update({ cornerRadiusPx: value });
      })
    )));
  }

  body.append(shapeFields);

  if (sc.shapeKind === "svg-path") {
    const help = document.createElement("p");
    help.className = "bf-form-help bf-u-no-margin--bottom";
    help.textContent = "Path input currently supports polygon-style SVG commands: M, L, H, V, and Z in local coordinates around the scene center.";
    body.append(help);

    const pathInput = document.createElement("textarea");
    pathInput.className = "bf-input is-dense";
    pathInput.rows = 5;
    pathInput.value = sc.svgPath;
    pathInput.addEventListener("input", () => {
      update({ svgPath: pathInput.value });
    });

    body.append(createFormGroup("SVG Path", pathInput));
  }

  return root;
}