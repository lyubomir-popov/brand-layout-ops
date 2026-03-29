/**
 * phyllotaxis-section.ts — Phyllotaxis accordion section builder.
 *
 * Extracted operator panel for the phyllotaxis scene family.
 * Exposes user-tunable field parameters and optional animation.
 */

import {
  buildAccordionSectionEl,
  createCheckboxFormGroup,
  createFormGroup,
  createNumberInput,
  createSliderInput,
  wrapCol
} from "@brand-layout-ops/parameter-ui";
import { OVERLAY_BACKGROUND_PHYLLOTAXIS_OPERATOR_KEY } from "@brand-layout-ops/operator-overlay-layout";
import type { PreviewAppContext } from "./preview-app-context.js";
import type { PhyllotaxisPreviewConfig } from "./scene-family-preview.js";

export function buildPhyllotaxisSection(ctx: PreviewAppContext): HTMLElement {
  const { root, body } = buildAccordionSectionEl("Phyllotaxis");
  const selectedNode = ctx.getSelectedBackgroundNode();
  const pc = selectedNode?.operatorKey === OVERLAY_BACKGROUND_PHYLLOTAXIS_OPERATOR_KEY
    ? selectedNode.params
    : ctx.state.documentProject.sceneFamilyConfigs.phyllotaxis;

  function update(patch: Partial<PhyllotaxisPreviewConfig>) {
    const didUpdate = ctx.updateSelectedBackgroundNode((node) => {
      if (node.operatorKey !== OVERLAY_BACKGROUND_PHYLLOTAXIS_OPERATOR_KEY) {
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

  const geometryFields = document.createElement("div");
  geometryFields.className = "bf-grid";

  geometryFields.append(wrapCol(1, createFormGroup("Point Count",
    createNumberInput(pc.numPoints, { min: 1, max: 4000, step: 1 }, (value) => {
      update({ numPoints: Math.round(value) });
    })
  )));

  geometryFields.append(wrapCol(1, createFormGroup("Radius",
    createSliderInput(pc.radiusPx, { min: 1, max: 1200, step: 1 }, (value) => {
      update({ radiusPx: value });
    })
  )));

  geometryFields.append(wrapCol(1, createFormGroup("Radius Falloff",
    createSliderInput(pc.radiusFalloff, { min: 0.05, max: 2, step: 0.01 }, (value) => {
      update({ radiusFalloff: value });
    })
  )));

  body.append(geometryFields);

  const angleFields = document.createElement("div");
  angleFields.className = "bf-grid";

  angleFields.append(wrapCol(1, createFormGroup("Angle Offset",
    createSliderInput(pc.angleOffsetDeg, { min: -180, max: 180, step: 0.1 }, (value) => {
      update({ angleOffsetDeg: value });
    })
  )));

  angleFields.append(wrapCol(1, createCheckboxFormGroup(
    "Animate",
    pc.animationEnabled,
    (checked) => {
      update({ animationEnabled: checked });
    }
  )));

  angleFields.append(wrapCol(2, createFormGroup("Animation Speed",
    createSliderInput(pc.animationSpeedDegPerSecond, { min: -90, max: 90, step: 0.1 }, (value) => {
      update({ animationSpeedDegPerSecond: value });
    })
  )));

  body.append(angleFields);
  return root;
}