/**
 * paragraph-styles-section.ts — Paragraph Styles accordion section builder.
 */
import {
  getOverlayFieldDisplayLabel,
  getOverlayStyleDisplayLabel
} from "@brand-layout-ops/operator-overlay-layout";
import { buildAccordionSectionEl } from "@brand-layout-ops/parameter-ui";
import type { PreviewAppContext } from "./preview-app-context.js";

export function buildParagraphStylesSection(ctx: PreviewAppContext): HTMLElement {
  const { root, body } = buildAccordionSectionEl("Paragraph Styles");
  const { state } = ctx;
  const selectedField = ctx.getSelectedTextField();

  if (!selectedField) {
    const help = document.createElement("p");
    help.className = "bf-form-help";
    help.textContent = state.selected?.kind === "logo"
      ? "Select a text block to assign a paragraph style."
      : "Select a text block on the stage to apply a paragraph style.";
    body.append(help);
    return root;
  }

  const helper = document.createElement("p");
  helper.className = "bf-form-help control-help";
  helper.textContent = `Apply a paragraph style to ${getOverlayFieldDisplayLabel(state.params, selectedField.id)}.`;
  body.append(helper);

  const palette = document.createElement("div");
  palette.className = "style-palette";

  for (const style of state.params.textStyles) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "style-palette__button";
    button.disabled = selectedField.styleKey === style.key;
    if (selectedField.styleKey === style.key) {
      button.classList.add("is-active");
    }
    button.addEventListener("click", () => {
      ctx.applySelectedTextStyle(style.key);
    });

    const label = document.createElement("span");
    label.className = "style-palette__label";
    label.textContent = getOverlayStyleDisplayLabel(style.key);

    const meta = document.createElement("span");
    meta.className = "style-palette__meta";
    meta.textContent = `${style.fontSizePx}px / ${style.lineHeightPx}px / ${style.fontWeight ?? 400}`;

    button.append(label, meta);
    palette.append(button);
  }

  body.append(palette);
  return root;
}
