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

  const row = document.createElement("div");
  row.className = "bf-actions is-nowrap";

  const exportBtn = document.createElement("button");
  exportBtn.className = "bf-button is-base is-dense";
  exportBtn.type = "button";
  exportBtn.textContent = "Export PNG";
  exportBtn.addEventListener("click", () => { void ctx.exportComposedFramePng(); });
  row.append(exportBtn);

  const seqBtn = document.createElement("button");
  seqBtn.className = "bf-button is-base is-dense";
  seqBtn.type = "button";
  seqBtn.textContent = "Export Sequence";
  seqBtn.addEventListener("click", () => { void ctx.exportPngSequence(); });
  row.append(seqBtn);

  body.append(row);

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
