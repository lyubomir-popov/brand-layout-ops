/**
 * playback-section.ts — Playback transport controls.
 */
import { buildAccordionSectionEl } from "@brand-layout-ops/parameter-ui";
import type { PreviewAppContext } from "./preview-app-context.js";

export function buildPlaybackSection(ctx: PreviewAppContext): HTMLElement {
  const { root, body } = buildAccordionSectionEl("Playback");
  const { state } = ctx;

  const row = document.createElement("div");
  row.className = "bf-actions is-nowrap";

  const playBtn = document.createElement("button");
  playBtn.className = "bf-button is-dense";
  playBtn.type = "button";
  playBtn.setAttribute("data-playback-toggle", "");
  playBtn.textContent = state.isPlaying ? "Pause Motion" : "Play Motion";
  playBtn.addEventListener("click", () => { ctx.togglePlayback(); });
  row.append(playBtn);

  body.append(row);
  return root;
}
