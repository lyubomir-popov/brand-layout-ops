/**
 * output-format-section.ts — Output Format accordion section builder.
 */
import { buildAccordionSectionEl } from "@brand-layout-ops/parameter-ui";

export function buildOutputFormatSection(): HTMLElement {
  const { root, body } = buildAccordionSectionEl("Output Format");

  const helpText = document.createElement("p");
  helpText.className = "bf-form-help bf-u-no-margin--bottom";
  helpText.textContent = "Document size details live here. Add or remove sizes from the top shell chrome, then use this panel to manage the saved size list and the active size settings.";
  body.append(helpText);

  const optionsContainer = document.createElement("div");
  optionsContainer.setAttribute("data-output-profile-options", "");
  body.append(optionsContainer);

  return root;
}
