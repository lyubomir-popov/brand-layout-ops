/**
 * source-default-section.ts — Source-default authoring controls.
 */
import { buildAccordionSectionEl } from "@brand-layout-ops/parameter-ui";
import type { PreviewAppContext } from "./preview-app-context.js";

export function buildSourceDefaultSection(ctx: PreviewAppContext): HTMLElement {
  const { root, body } = buildAccordionSectionEl("Source Defaults");
  const { state } = ctx;

  const row = document.createElement("div");
  row.className = "bf-actions is-nowrap";

  const resetBtn = document.createElement("button");
  resetBtn.className = "bf-button is-base is-dense";
  resetBtn.type = "button";
  resetBtn.textContent = "Reset to Default";
  resetBtn.addEventListener("click", () => {
    ctx.applySourceDefaultSnapshot(state.sourceDefaults);
    ctx.markDocumentDirty();
    state.playbackTimeSec = 0;
    ctx.resizeRenderer();
    ctx.buildOutputProfileOptions();
    ctx.buildPresetTabs();
    ctx.buildConfigEditor();
    ctx.setSourceDefaultStatus("Reset to source default.");
    void ctx.renderStage();
  });
  row.append(resetBtn);

  const writeBtn = document.createElement("button");
  writeBtn.className = "bf-button is-base is-dense";
  writeBtn.type = "button";
  writeBtn.textContent = "Save as Default";
  writeBtn.addEventListener("click", () => {
    void (async () => {
      writeBtn.disabled = true;
      ctx.setSourceDefaultStatus("Saving source default...");
      try {
        const result = await ctx.writeCurrentAsSourceDefault();
        ctx.setSourceDefaultStatus(result.message, "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Source default save failed.";
        ctx.setSourceDefaultStatus(`Source default save failed: ${message}`, "error");
      } finally {
        writeBtn.disabled = false;
      }
    })();
  });
  row.append(writeBtn);

  body.append(row);

  const status = document.createElement("p");
  status.className = "bf-form-help bf-u-no-margin--bottom";
  status.setAttribute("data-source-default-status", "");
  status.textContent = "Source defaults are using the built-in preview snapshot.";
  body.append(status);

  return root;
}
