/**
 * halo-config-section.ts — Halo Field accordion section builder.
 *
 * Schema-driven: the panel is generated from HALO_FIELD_CONFIG_SCHEMA
 * rather than hardcoded DOM builders.
 */

import type { PreviewAppContext } from "./preview-app-context.js";
import { getOutputProfileMetrics } from "@brand-layout-ops/core-types";
import { HALO_FIELD_CONFIG_SCHEMA, type HaloFieldConfig } from "@brand-layout-ops/operator-halo-field";
import { buildAccordionSectionEl, renderSchemaPanel, setupAccordion } from "@brand-layout-ops/parameter-ui";

/**
 * Set a value at a dotted path on the halo config, returning a new config.
 * Intermediate objects are shallow-cloned.
 */
function setNestedValue(config: HaloFieldConfig, path: string, value: unknown): HaloFieldConfig {
  const keys = path.split(".");
  const rec = config as unknown as Record<string, unknown>;
  if (keys.length === 1) {
    return { ...rec, [keys[0]]: value } as unknown as HaloFieldConfig;
  }
  const [head, ...rest] = keys;
  const child = rec[head];
  const childObj = (child != null && typeof child === "object") ? child as Record<string, unknown> : {};
  const updated = setNestedValue(childObj as unknown as HaloFieldConfig, rest.join("."), value);
  return { ...rec, [head]: updated } as unknown as HaloFieldConfig;
}

export function buildHaloConfigSection(ctx: PreviewAppContext): HTMLElement {
  const { state } = ctx;

  if (state.documentProject.sceneFamilyKey !== "halo") {
    const { root, body } = buildAccordionSectionEl(`${ctx.getSceneFamilyLabel(state.documentProject.sceneFamilyKey)} Preview`);
    const helpText = document.createElement("p");
    helpText.className = "bf-form-help bf-u-no-margin--bottom";
    helpText.textContent = `You are editing the Halo node while Rendered Output is set to ${ctx.getSceneFamilyLabel(state.documentProject.sceneFamilyKey)}. These settings are still saved; switch Rendered Output to Halo to preview them live.`;
    body.append(helpText);
    return root;
  }

  const container = document.createElement("div");
  const nestedAccordion = document.createElement("aside");
  nestedAccordion.className = "bf-accordion";

  const nestedList = document.createElement("ul");
  nestedList.className = "bf-accordion-list";

  const result = renderSchemaPanel(
    HALO_FIELD_CONFIG_SCHEMA,
    state.haloConfig,
    (path, value) => {
      let nextConfig = setNestedValue(state.haloConfig, path, value);

      // Special: center_offset_y_px drives center_y_px via profile metrics
      if (path === "composition.center_offset_y_px") {
        const metrics = getOutputProfileMetrics(state.outputProfileKey);
        nextConfig = {
          ...nextConfig,
          composition: {
            ...nextConfig.composition,
            center_y_px: metrics.centerYPx + Number(value)
          }
        };
      }

      state.haloConfig = nextConfig;
      ctx.markDocumentDirty();
      void ctx.renderStage();
    }
  );

  for (const section of result.sections) {
    nestedList.append(section.root);
  }

  nestedAccordion.append(nestedList);
  container.append(nestedAccordion);
  setupAccordion(nestedAccordion);

  return container;
}
