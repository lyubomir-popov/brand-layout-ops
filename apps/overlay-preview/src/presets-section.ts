/**
 * presets-section.ts — Presets accordion section builder.
 */
import { buildAccordionSectionEl, createFormGroup } from "@brand-layout-ops/parameter-ui";
import type { PreviewAppContext } from "./preview-app-context.js";

export function buildPresetsSection(ctx: PreviewAppContext): HTMLElement {
  const { root, body } = buildAccordionSectionEl("Presets");
  const { state } = ctx;

  const helpText = document.createElement("p");
  helpText.className = "bf-form-help bf-u-no-margin--bottom";
  helpText.textContent = "Presets travel with the current document when you save it. Browser storage still mirrors the working set locally.";
  body.append(helpText);

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "bf-input is-dense";
  nameInput.placeholder = "Preset name";
  nameInput.setAttribute("data-preset-name-input", "");
  body.append(createFormGroup("Name", nameInput));

  const toolbar = document.createElement("div");
  toolbar.className = "preset-toolbar";

  const btnSpec: Array<{ label: string; attr: string; className: string }> = [
    { label: "Save", attr: "data-preset-save", className: "bf-button is-dense" },
    { label: "Update", attr: "data-preset-update", className: "bf-button--base is-dense" },
    { label: "Import", attr: "data-preset-import", className: "bf-button--base is-dense" },
    { label: "Export", attr: "data-preset-export", className: "bf-button--base is-dense" },
    { label: "Delete", attr: "data-preset-delete", className: "bf-button--base is-dense" }
  ];
  for (const spec of btnSpec) {
    const btn = document.createElement("button");
    btn.className = spec.className;
    btn.type = "button";
    btn.setAttribute(spec.attr, "");
    btn.textContent = spec.label;
    toolbar.append(btn);
  }
  body.append(toolbar);

  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.setAttribute("data-preset-import-input", "");
  importInput.accept = "application/json,.json";
  importInput.hidden = true;
  body.append(importInput);

  const tabsContainer = document.createElement("div");
  tabsContainer.setAttribute("data-preset-tabs", "");
  body.append(tabsContainer);

  // Inline event listeners for preset buttons
  toolbar.querySelector("[data-preset-save]")?.addEventListener("click", () => {
    const name = nameInput.value.trim() || undefined;
    ctx.saveCurrentAsPreset(name);
    ctx.markDocumentDirty();
    nameInput.value = "";
    ctx.buildPresetTabs();
  });
  toolbar.querySelector("[data-preset-update]")?.addEventListener("click", () => {
    ctx.updateActivePreset();
    ctx.markDocumentDirty();
    ctx.buildPresetTabs();
  });
  toolbar.querySelector("[data-preset-export]")?.addEventListener("click", () => {
    const activePreset = ctx.getActivePreset();
    if (activePreset) ctx.exportPreset(activePreset);
  });
  toolbar.querySelector("[data-preset-import]")?.addEventListener("click", () => {
    importInput.click();
  });
  importInput.addEventListener("change", async () => {
    const didImport = await ctx.importPresetsFromFiles(importInput.files);
    importInput.value = "";
    if (!didImport) {
      return;
    }

    ctx.markDocumentDirty();
    ctx.buildOutputProfileOptions();
    ctx.buildPresetTabs();
    ctx.buildConfigEditor();
    ctx.resizeRenderer();
    void ctx.renderStage();
  });
  toolbar.querySelector("[data-preset-delete]")?.addEventListener("click", () => {
    if (state.activePresetId) {
      ctx.deletePreset(state.activePresetId);
      ctx.markDocumentDirty();
      ctx.buildPresetTabs();
    }
  });

  return root;
}
