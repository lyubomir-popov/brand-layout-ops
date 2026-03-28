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
  flockFields.className = "grid-row";

  flockFields.append(wrapCol(1, createFormGroup("Boid Count",
    createNumberInput(bc.numBoids, { min: 1, max: 2000, step: 1 }, v => update({ numBoids: Math.round(v) }))
  )));

  flockFields.append(wrapCol(1, createFormGroup("Seed",
    createNumberInput(bc.seed, { min: 0, max: 9999, step: 1 }, v => update({ seed: Math.round(v) }))
  )));

  flockFields.append(wrapCol(1, createFormGroup("Spawn Radius",
    createSliderInput(bc.spawnRadiusPx, { min: 0, max: 600, step: 1 }, v => update({ spawnRadiusPx: v }))
  )));

  flockFields.append(wrapCol(1, createFormGroup("Stagger Start",
    createSliderInput(bc.staggerStartSeconds, { min: 0, max: 10, step: 0.1 }, v => update({ staggerStartSeconds: v }))
  )));

  body.append(flockFields);

  /* --- Speed --- */
  const speedFields = document.createElement("div");
  speedFields.className = "grid-row";

  speedFields.append(wrapCol(1, createFormGroup("Initial Speed",
    createSliderInput(bc.initialSpeedPxPerSecond, { min: 0, max: 400, step: 1 }, v => update({ initialSpeedPxPerSecond: v }))
  )));

  speedFields.append(wrapCol(1, createFormGroup("Speed Jitter",
    createSliderInput(bc.initialSpeedJitter, { min: 0, max: 1, step: 0.01 }, v => update({ initialSpeedJitter: v }))
  )));

  speedFields.append(wrapCol(1, createFormGroup("Min Speed",
    createSliderInput(bc.minSpeedPxPerSecond, { min: 0, max: 400, step: 1 }, v => update({ minSpeedPxPerSecond: v }))
  )));

  speedFields.append(wrapCol(1, createFormGroup("Max Speed",
    createSliderInput(bc.maxSpeedPxPerSecond, { min: 0, max: 600, step: 1 }, v => update({ maxSpeedPxPerSecond: v }))
  )));

  speedFields.append(wrapCol(1, createFormGroup("Max Accel.",
    createSliderInput(bc.maxAccelerationPxPerSecond2, { min: 0, max: 600, step: 1 }, v => update({ maxAccelerationPxPerSecond2: v }))
  )));

  body.append(speedFields);

  /* --- Flocking forces --- */
  const forceFields = document.createElement("div");
  forceFields.className = "grid-row";

  forceFields.append(wrapCol(1, createFormGroup("Sep. Radius",
    createSliderInput(bc.separationRadiusPx, { min: 0, max: 300, step: 1 }, v => update({ separationRadiusPx: v }))
  )));

  forceFields.append(wrapCol(1, createFormGroup("Sep. Strength",
    createSliderInput(bc.separationStrength, { min: 0, max: 3, step: 0.01 }, v => update({ separationStrength: v }))
  )));

  forceFields.append(wrapCol(1, createFormGroup("Align Radius",
    createSliderInput(bc.alignmentRadiusPx, { min: 0, max: 500, step: 1 }, v => update({ alignmentRadiusPx: v }))
  )));

  forceFields.append(wrapCol(1, createFormGroup("Align Strength",
    createSliderInput(bc.alignmentStrength, { min: 0, max: 3, step: 0.01 }, v => update({ alignmentStrength: v }))
  )));

  forceFields.append(wrapCol(1, createFormGroup("Cohesion Radius",
    createSliderInput(bc.cohesionRadiusPx, { min: 0, max: 500, step: 1 }, v => update({ cohesionRadiusPx: v }))
  )));

  forceFields.append(wrapCol(1, createFormGroup("Cohesion Str.",
    createSliderInput(bc.cohesionStrength, { min: 0, max: 3, step: 0.01 }, v => update({ cohesionStrength: v }))
  )));

  forceFields.append(wrapCol(1, createFormGroup("Center Pull",
    createSliderInput(bc.centerPullStrength, { min: 0, max: 3, step: 0.01 }, v => update({ centerPullStrength: v }))
  )));

  forceFields.append(wrapCol(1, createFormGroup("Max Neighbors",
    createNumberInput(bc.maxNeighbors, { min: 1, max: 100, step: 1 }, v => update({ maxNeighbors: Math.round(v) }))
  )));

  body.append(forceFields);

  /* --- Particle scale + mass --- */
  const scaleFields = document.createElement("div");
  scaleFields.className = "grid-row";

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
  boundsFields.className = "grid-row";

  boundsFields.append(wrapCol(1, createFormGroup("Bounds",
    createSelectInput(bc.boundsKind, [
      { value: "none", label: "None" },
      { value: "radial", label: "Radial" },
      { value: "box", label: "Box" }
    ], v => update({ boundsKind: v as FuzzyBoidsPreviewConfig["boundsKind"] }))
  )));

  boundsFields.append(wrapCol(1, createFormGroup("Bounds Radius",
    createSliderInput(bc.boundsRadiusPx, { min: 0, max: 1000, step: 1 }, v => update({ boundsRadiusPx: v }))
  )));

  boundsFields.append(wrapCol(1, createFormGroup("Bounds Margin",
    createSliderInput(bc.boundsMarginPx, { min: 0, max: 300, step: 1 }, v => update({ boundsMarginPx: v }))
  )));

  boundsFields.append(wrapCol(1, createFormGroup("Bounds Force",
    createSliderInput(bc.boundsForcePxPerSecond2, { min: 0, max: 1000, step: 1 }, v => update({ boundsForcePxPerSecond2: v }))
  )));

  body.append(boundsFields);

  return root;
}
