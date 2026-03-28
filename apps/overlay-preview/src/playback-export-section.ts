/**
 * playback-export-section.ts — Playback & Export accordion section builder.
 */
import {
  buildAccordionSectionEl,
  createCheckboxFormGroup,
  wrapCol
} from "@brand-layout-ops/parameter-ui";
import type { PreviewAppContext } from "./preview-app-context.js";

export function buildPlaybackExportSection(ctx: PreviewAppContext): HTMLElement {
  const { root, body } = buildAccordionSectionEl("Playback & Export");
  const { state } = ctx;

  const row = document.createElement("div");
  row.className = "row";

  const playBtn = document.createElement("button");
  playBtn.className = "bf-button is-dense";
  playBtn.type = "button";
  playBtn.setAttribute("data-playback-toggle", "");
  playBtn.textContent = state.isPlaying ? "Pause Motion" : "Play Motion";
  playBtn.addEventListener("click", () => { ctx.togglePlayback(); });
  row.append(wrapCol(2, playBtn));

  const exportBtn = document.createElement("button");
  exportBtn.className = "bf-button--base is-dense";
  exportBtn.type = "button";
  exportBtn.textContent = "Export PNG";
  exportBtn.addEventListener("click", () => { void ctx.exportComposedFramePng(); });
  row.append(wrapCol(2, exportBtn));

  const seqBtn = document.createElement("button");
  seqBtn.className = "bf-button--base is-dense";
  seqBtn.type = "button";
  seqBtn.textContent = "Export Sequence";
  seqBtn.addEventListener("click", () => { void ctx.exportPngSequence(); });
  row.append(wrapCol(2, seqBtn));

  const resetBtn = document.createElement("button");
  resetBtn.className = "bf-button--base is-dense";
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
  row.append(wrapCol(2, resetBtn));

  const writeBtn = document.createElement("button");
  writeBtn.className = "bf-button--base is-dense";
  writeBtn.type = "button";
  writeBtn.textContent = "Save as Default";
  writeBtn.addEventListener("click", () => {
    void (async () => {
      writeBtn.disabled = true;
      ctx.setSourceDefaultStatus("Saving source default...");
      try {
        await ctx.writeCurrentAsSourceDefault();
        ctx.setSourceDefaultStatus("Source default saved.", "success");
      } catch {
        ctx.setSourceDefaultStatus("Source default save failed.", "error");
      } finally {
        writeBtn.disabled = false;
      }
    })();
  });
  row.append(wrapCol(2, writeBtn));

  body.append(row);

  const status = document.createElement("p");
  status.className = "bf-form-help bf-u-no-margin--bottom";
  status.setAttribute("data-source-default-status", "");
  status.textContent = "Source defaults are using the built-in preview snapshot.";
  body.append(status);

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
