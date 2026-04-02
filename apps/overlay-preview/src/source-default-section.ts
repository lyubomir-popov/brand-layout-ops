/**
 * source-default-section.ts — Source-default authoring controls.
 */
import { buildAccordionSectionEl } from "@brand-layout-ops/parameter-ui";
import type { PreviewAppContext } from "./preview-app-context.js";

export function buildSourceDefaultSection(ctx: PreviewAppContext): HTMLElement {
  const { root, body } = buildAccordionSectionEl("Source Defaults");

  const help = document.createElement("p");
  help.className = "bf-form-help is-tight bf-u-no-margin--bottom";
  help.textContent = "Reset and save actions now live in the top shell chrome. This panel keeps the latest source-default status.";
  body.append(help);

  const status = document.createElement("p");
  status.className = "bf-form-help bf-u-no-margin--bottom";
  status.setAttribute("data-source-default-status", "");
  status.textContent = "Source defaults are using the built-in preview snapshot.";
  body.append(status);

  return root;
}
