/**
 * document-section.ts — Document accordion section builder.
 */
import { buildAccordionSectionEl, createFormGroup } from "@brand-layout-ops/parameter-ui";
import type { PreviewAppContext } from "./preview-app-context.js";
import { UNTITLED_DOCUMENT_NAME } from "./preview-app-context.js";

export function buildDocumentSection(ctx: PreviewAppContext): HTMLElement {
  const { root, body } = buildAccordionSectionEl("Document");

  const helpText = document.createElement("p");
  helpText.className = "bf-form-help bf-u-no-margin--bottom";
  body.append(helpText);

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "bf-input is-dense";
  nameInput.value = ctx.getNormalizedDocumentName(ctx.documentWorkspace.state.name);
  nameInput.setAttribute("data-document-name-input", "");
  body.append(createFormGroup("Name", nameInput));

  const toolbar = document.createElement("div");
  toolbar.className = "bf-cluster preview-cluster--tight";

  const dw = ctx.documentWorkspace;
  const buttonSpecs: Array<{ label: string; className: string; onClick: () => void | Promise<void> }> = [
    { label: "New", className: "bf-button--base is-dense", onClick: () => void dw.createNewDocument() },
    { label: "Open", className: "bf-button--base is-dense", onClick: () => void dw.openDocumentFromDisk() },
    { label: "Save", className: "bf-button is-dense", onClick: () => void dw.saveCurrentDocument(false) },
    { label: "Save As", className: "bf-button--base is-dense", onClick: () => void dw.saveCurrentDocument(true) },
    { label: "Duplicate", className: "bf-button--base is-dense", onClick: () => void dw.duplicateCurrentDocument() }
  ];

  for (const buttonSpec of buttonSpecs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = buttonSpec.className;
    button.textContent = buttonSpec.label;
    button.addEventListener("click", () => {
      void buttonSpec.onClick();
    });
    toolbar.append(button);
  }

  body.append(toolbar);

  const summary = document.createElement("p");
  summary.className = "bf-form-help bf-u-no-margin--bottom";
  body.append(summary);

  const status = document.createElement("p");
  status.className = "bf-form-help bf-u-no-margin--bottom";
  body.append(status);

  const recentHeading = document.createElement("p");
  recentHeading.className = "bf-form-help bf-u-no-margin--bottom";
  recentHeading.textContent = "Recent";
  body.append(recentHeading);

  const recentList = document.createElement("div");
  recentList.setAttribute("data-document-recent-list", "");
  body.append(recentList);

  return root;
}
