/**
 * document-section.ts — Document accordion section builder.
 */
import { buildAccordionSectionEl, createFormGroup } from "@brand-layout-ops/parameter-ui";
import type { PreviewAppContext } from "./preview-app-context.js";
import { UNTITLED_DOCUMENT_NAME } from "./preview-app-context.js";

export function buildDocumentSection(ctx: PreviewAppContext): HTMLElement {
  const { root, body } = buildAccordionSectionEl("Document");

  const helpText = document.createElement("p");
  helpText.className = "p-form-help-text u-no-margin--bottom";
  helpText.textContent = "Open, save, save as, or duplicate the full working state as a local project file.";
  body.append(helpText);

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "p-form-validation__input is-dense";
  nameInput.placeholder = UNTITLED_DOCUMENT_NAME;
  nameInput.value = ctx.getNormalizedDocumentName(ctx.documentWorkspace.state.name);
  nameInput.setAttribute("data-document-name-input", "");
  body.append(createFormGroup("Name", nameInput));

  const toolbar = document.createElement("div");
  toolbar.className = "preset-toolbar";

  const dw = ctx.documentWorkspace;
  const buttonSpecs: Array<{ label: string; className: string; onClick: () => void | Promise<void> }> = [
    { label: "New", className: "p-button--base is-dense", onClick: () => void dw.createNewDocument() },
    { label: "Open", className: "p-button--base is-dense", onClick: () => void dw.openDocumentFromDisk() },
    { label: "Save", className: "p-button is-dense", onClick: () => void dw.saveCurrentDocument(false) },
    { label: "Save As", className: "p-button--base is-dense", onClick: () => void dw.saveCurrentDocument(true) },
    { label: "Duplicate", className: "p-button--base is-dense", onClick: () => void dw.duplicateCurrentDocument() }
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
  summary.className = "p-form-help-text u-no-margin--bottom";
  summary.setAttribute("data-document-summary", "");
  body.append(summary);

  const status = document.createElement("p");
  status.className = "p-form-help-text u-no-margin--bottom";
  status.setAttribute("data-document-status", "");
  body.append(status);

  const recentHeading = document.createElement("p");
  recentHeading.className = "p-form-help-text u-no-margin--bottom";
  recentHeading.textContent = "Recent";
  body.append(recentHeading);

  const recentList = document.createElement("div");
  recentList.setAttribute("data-document-recent-list", "");
  body.append(recentList);

  return root;
}
