/**
 * output-format-section.ts — Output Format accordion section builder.
 */
import { buildAccordionSectionEl } from "@brand-layout-ops/parameter-ui";

export function buildOutputFormatSection(): HTMLElement {
  const { root, body } = buildAccordionSectionEl("Output Format");

  const helpText = document.createElement("p");
  helpText.className = "bf-form-help bf-u-no-margin--bottom";
  helpText.textContent = "Document sizes now live here. Switching the active size rebuilds the stage at that screen size and loads the per-size layout or export state stored in the document.";
  body.append(helpText);

  const optionsContainer = document.createElement("div");
  optionsContainer.setAttribute("data-output-profile-options", "");
  body.append(optionsContainer);

  return root;
}
