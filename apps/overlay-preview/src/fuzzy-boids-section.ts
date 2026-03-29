/**
 * fuzzy-boids-section.ts — Fuzzy Boids accordion section builder.
 *
 * Extracted operator panel for the fuzzy-boids scene family.
 * Exposes all user-tunable simulation parameters as sliders and number inputs.
 * Receives all dependencies via PreviewAppContext instead of closure capture.
 */

import type { PreviewAppContext } from "./preview-app-context.js";
import type { FuzzyBoidsPreviewConfig } from "./scene-family-preview.js";
import { OVERLAY_BACKGROUND_FUZZY_BOIDS_OPERATOR_KEY } from "@brand-layout-ops/operator-overlay-layout";
import {
  buildAccordionSectionEl,
  createFormGroup,
  createNumberInput,
  createSelectInput,
  createSliderInput,
  wrapCol
} from "@brand-layout-ops/parameter-ui";

export function buildFuzzyBoidsSection(ctx: PreviewAppContext): HTMLElement {
  const { state } = ctx;
  const { root, body } = buildAccordionSectionEl("Fuzzy Boids");
  const selectedNode = ctx.getSelectedBackgroundNode();
  const bc = selectedNode?.operatorKey === OVERLAY_BACKGROUND_FUZZY_BOIDS_OPERATOR_KEY
    ? selectedNode.params
    : state.documentProject.sceneFamilyConfigs.fuzzyBoids;

  function update(patch: Partial<FuzzyBoidsPreviewConfig>) {
    const didUpdate = ctx.updateSelectedBackgroundNode((node) => {
      if (node.operatorKey !== OVERLAY_BACKGROUND_FUZZY_BOIDS_OPERATOR_KEY) {
        return node;
      }

      return {
        ...node,
        params: {
          ...node.params,
          ...patch
        }
      };
    });
    if (!didUpdate) {
      return;
    }

    ctx.markDocumentDirty();
    void ctx.renderStage();
  }

  /* --- Flock --- */
  const flockFields = document.createElement("div");
  flockFields.className = "bf-grid";

  flockFields.append(wrapCol(1, createFormGroup("Boid Count",
    createNumberInput(bc.numBoids, { min: 1, max: 2000, step: 1 }, v => update({ numBoids: Math.round(v) }))
  )));

  flockFields.append(wrapCol(1, createFormGroup("Seed",
    createNumberInput(bc.seed, { min: 0, max: 9999, step: 1 }, v => update({ seed: Math.round(v) }))
  )));

  flockFields.append(wrapCol(1, createFormGroup("Sub Steps",
    createNumberInput(bc.subSteps, { min: 1, max: 20, step: 1 }, v => update({ subSteps: Math.round(v) }))
  )));

  flockFields.append(wrapCol(1, createFormGroup("Spawn Radius",
    createSliderInput(bc.spawnRadiusPx, { min: 0, max: 600, step: 1 }, v => update({ spawnRadiusPx: v }))
  )));

  flockFields.append(wrapCol(1, createFormGroup("Stagger Start",
    createSliderInput(bc.staggerStartSeconds, { min: 0, max: 10, step: 0.1 }, v => update({ staggerStartSeconds: v }))
  )));

  flockFields.append(wrapCol(1, createFormGroup("Max Neighbors",
    createNumberInput(bc.maxNeighbors, { min: 0, max: 100, step: 1 }, v => update({ maxNeighbors: Math.round(v) }))
  )));

  flockFields.append(wrapCol(1, createFormGroup("Dot Size (px)",
    createSliderInput(bc.dotSizePx, { min: 0.5, max: 12, step: 0.25 }, v => update({ dotSizePx: v }))
  )));

  body.append(flockFields);

  /* --- Initial + Integration (VEX: INITIAL + INTEGRATE) --- */
  const speedFields = document.createElement("div");
  speedFields.className = "bf-grid";

  speedFields.append(wrapCol(1, createFormGroup("Initial Speed",
    createSliderInput(bc.initialSpeed, { min: 0, max: 20, step: 0.5 }, v => update({ initialSpeed: v }))
  )));

  speedFields.append(wrapCol(1, createFormGroup("Speed Jitter",
    createSliderInput(bc.initialSpeedJitter, { min: 0, max: 1, step: 0.01 }, v => update({ initialSpeedJitter: v }))
  )));

  speedFields.append(wrapCol(1, createFormGroup("Min Speed",
    createSliderInput(bc.minSpeedLimit, { min: 0, max: 50, step: 0.5 }, v => update({ minSpeedLimit: v }))
  )));

  speedFields.append(wrapCol(1, createFormGroup("Max Speed",
    createSliderInput(bc.maxSpeedLimit, { min: 0, max: 100, step: 0.5 }, v => update({ maxSpeedLimit: v }))
  )));

  speedFields.append(wrapCol(1, createFormGroup("Min Accel",
    createSliderInput(bc.minAccelLimit, { min: 0, max: 100, step: 0.5 }, v => update({ minAccelLimit: v }))
  )));

  speedFields.append(wrapCol(1, createFormGroup("Max Accel",
    createSliderInput(bc.maxAccelLimit, { min: 0, max: 200, step: 0.5 }, v => update({ maxAccelLimit: v }))
  )));

  body.append(speedFields);

  /* --- Separation (VEX: separation by n) --- */
  const sepFields = document.createElement("div");
  sepFields.className = "bf-grid";

  sepFields.append(wrapCol(1, createFormGroup("Sep. Min Dist",
    createSliderInput(bc.separationMinDist, { min: 0, max: 20, step: 0.1 }, v => update({ separationMinDist: v }))
  )));

  sepFields.append(wrapCol(1, createFormGroup("Sep. Max Dist",
    createSliderInput(bc.separationMaxDist, { min: 0.1, max: 50, step: 0.1 }, v => update({ separationMaxDist: v }))
  )));

  sepFields.append(wrapCol(1, createFormGroup("Sep. Strength",
    createSliderInput(bc.separationMaxStrength, { min: 0, max: 5, step: 0.01 }, v => update({ separationMaxStrength: v }))
  )));

  body.append(sepFields);

  /* --- Fuzzy Alignment (VEX: fuzzy alignment wrangle) --- */
  const alignFields = document.createElement("div");
  alignFields.className = "bf-grid";

  alignFields.append(wrapCol(1, createFormGroup("Align Near",
    createSliderInput(bc.alignNearThreshold, { min: 0, max: 20, step: 0.1 }, v => update({ alignNearThreshold: v }))
  )));

  alignFields.append(wrapCol(1, createFormGroup("Align Far",
    createSliderInput(bc.alignFarThreshold, { min: 0.1, max: 50, step: 0.1 }, v => update({ alignFarThreshold: v }))
  )));

  alignFields.append(wrapCol(1, createFormGroup("Align Speed",
    createSliderInput(bc.alignSpeedThreshold, { min: 0, max: 200, step: 1 }, v => update({ alignSpeedThreshold: v }))
  )));

  body.append(alignFields);

  /* --- Cohesion (VEX: cohesion wrangle) --- */
  const cohFields = document.createElement("div");
  cohFields.className = "bf-grid";

  cohFields.append(wrapCol(1, createFormGroup("Coh. Min Dist",
    createSliderInput(bc.cohesionMinDist, { min: 0, max: 100, step: 0.5 }, v => update({ cohesionMinDist: v }))
  )));

  cohFields.append(wrapCol(1, createFormGroup("Coh. Max Dist",
    createSliderInput(bc.cohesionMaxDist, { min: 1, max: 500, step: 1 }, v => update({ cohesionMaxDist: v }))
  )));

  cohFields.append(wrapCol(1, createFormGroup("Coh. Max Accel",
    createSliderInput(bc.cohesionMaxAccel, { min: 0, max: 20, step: 0.1 }, v => update({ cohesionMaxAccel: v }))
  )));

  body.append(cohFields);

  /* --- Particle scale + mass --- */
  const scaleFields = document.createElement("div");
  scaleFields.className = "bf-grid";

  scaleFields.append(wrapCol(1, createFormGroup("P-Scale Min",
    createSliderInput(bc.pscaleMin, { min: 0.05, max: 5, step: 0.05 }, v => update({ pscaleMin: v }))
  )));

  scaleFields.append(wrapCol(1, createFormGroup("P-Scale Max",
    createSliderInput(bc.pscaleMax, { min: 0.05, max: 5, step: 0.05 }, v => update({ pscaleMax: v }))
  )));

  scaleFields.append(wrapCol(1, createFormGroup("Mass Min",
    createSliderInput(bc.massMin, { min: 0.01, max: 5, step: 0.01 }, v => update({ massMin: v }))
  )));

  scaleFields.append(wrapCol(1, createFormGroup("Mass Max",
    createSliderInput(bc.massMax, { min: 0.01, max: 5, step: 0.01 }, v => update({ massMax: v }))
  )));

  body.append(scaleFields);

  /* --- Bounds --- */
  const boundsFields = document.createElement("div");
  boundsFields.className = "bf-grid";

  boundsFields.append(wrapCol(1, createFormGroup("Bounds",
    createSelectInput(bc.boundsKind, [
      { value: "none", label: "None" },
      { value: "box", label: "Box" },
      { value: "radial", label: "Radial" }
    ], v => update({ boundsKind: v as FuzzyBoidsPreviewConfig["boundsKind"] }))
  )));

  if (bc.boundsKind === "radial") {
    boundsFields.append(wrapCol(1, createFormGroup("Bounds Radius",
      createSliderInput(bc.boundsRadiusPx, { min: 0, max: 1000, step: 1 }, v => update({ boundsRadiusPx: v }))
    )));
  }

  boundsFields.append(wrapCol(1, createFormGroup("Bounds Margin",
    createSliderInput(bc.boundsMarginPx, { min: 0, max: 300, step: 1 }, v => update({ boundsMarginPx: v }))
  )));

  boundsFields.append(wrapCol(1, createFormGroup("Bounds Force",
    createSliderInput(bc.boundsForcePxPerSecond2, { min: 0, max: 200000, step: 1000 }, v => update({ boundsForcePxPerSecond2: v }))
  )));

  body.append(boundsFields);

  if (bc.boundsKind === "box") {
    const help = document.createElement("p");
    help.className = "bf-form-help bf-u-no-margin--bottom";
    help.textContent = "Box bounds follow the current frame size so the flock can occupy the whole canvas without a separate width or height control.";
    body.append(help);
  }

  return root;
}
