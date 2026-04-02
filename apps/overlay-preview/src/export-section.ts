/**
 * export-section.ts — Export controls and settings.
 */
import {
  buildAccordionSectionEl,
  createCheckboxFormGroup
} from "@brand-layout-ops/parameter-ui";
import type { PreviewAppContext } from "./preview-app-context.js";

export function buildExportSection(ctx: PreviewAppContext): HTMLElement {
  const { root, body } = buildAccordionSectionEl("Export");
  const { state } = ctx;

  const help = document.createElement("p");
  help.className = "bf-form-help is-tight bf-u-no-margin--bottom";
  help.textContent = "Export actions now live in the top shell chrome. Keep export-specific settings here.";
  body.append(help);

  body.append(createCheckboxFormGroup(
    "Transparent PNG background",
    state.exportSettings.transparentBackground,
    (checked) => {
      ctx.updateExportSettings((settings) => ({ ...settings, transparentBackground: checked }));
    },
    (input) => {
      input.setAttribute("data-export-transparent-background", "");
    }
  ));

  return root;
}
