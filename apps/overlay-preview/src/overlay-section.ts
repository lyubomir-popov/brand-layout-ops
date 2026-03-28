/**
 * overlay-section.ts — Selected Element accordion section builder.
 */
import {
  getOverlayFieldDisplayLabel,
  getOverlayStyleDisplayLabel,
  resolveOverlayTextValue
} from "@brand-layout-ops/operator-overlay-layout";
import {
  buildAccordionSectionEl,
  createCheckboxFormGroup,
  createFormGroup,
  createNumberInput,
  createReadonlySpan,
  createSelectInput,
  wrapCol
} from "@brand-layout-ops/parameter-ui";
import type { PreviewAppContext } from "./preview-app-context.js";

export function buildOverlaySection(ctx: PreviewAppContext): HTMLElement {
  const { root, body } = buildAccordionSectionEl(ctx.getSelectedOverlaySectionTitle());
  const { state } = ctx;

  body.append(ctx.createOverlayItemActionRow());

  if (!state.selected) {
    const p = document.createElement("p");
    p.className = "p-form-help-text";
    p.textContent = "Click a text block or logo in the stage to select it.";
    body.append(p);
    return root;
  }

  if (state.selected.kind === "text") {
    const field = ctx.getSelectedTextField();
    if (!field) return root;
    const selectedStyle = state.params.textStyles.find((style) => style.key === field.styleKey);

    const metadataFields = document.createElement("div");
    metadataFields.className = "grid-row";

    metadataFields.append(wrapCol(1, createFormGroup("Label", createReadonlySpan(getOverlayFieldDisplayLabel(state.params, field.id)))));
    metadataFields.append(wrapCol(1, createFormGroup("ID", createReadonlySpan(field.id))));
    metadataFields.append(wrapCol(2, createFormGroup("Style",
      createSelectInput(
        field.styleKey,
        state.params.textStyles.map((style) => ({
          label: getOverlayStyleDisplayLabel(style.key),
          value: style.key
        })),
        (value) => {
          ctx.applySelectedTextStyle(value);
        }
      )
    )));

    body.append(metadataFields);

    if (selectedStyle) {
      const styleGrid = document.createElement("div");
      styleGrid.className = "grid-row";

      styleGrid.append(wrapCol(1, createFormGroup("Font Size",
        createNumberInput(selectedStyle.fontSizePx, { min: 1, max: 512, step: 1 }, (value) => {
          ctx.updateTextStyle(selectedStyle.key, (style) => ({ ...style, fontSizePx: value }));
          if (selectedStyle.key === "title" && state.params.logo?.linkTitleSizeToHeight !== false) {
            ctx.syncLogoToTitleFontSize(value);
          }
          ctx.buildConfigEditor();
          void ctx.renderStage();
        })
      )));

      styleGrid.append(wrapCol(1, createFormGroup("Line Height",
        createNumberInput(selectedStyle.lineHeightPx, { min: 1, max: 512, step: 1 }, (value) => {
          ctx.updateTextStyle(selectedStyle.key, (style) => ({ ...style, lineHeightPx: value }));
          ctx.buildConfigEditor();
          void ctx.renderStage();
        })
      )));

      styleGrid.append(wrapCol(1, createFormGroup("Weight",
        createNumberInput(selectedStyle.fontWeight ?? 400, { min: 100, max: 900, step: 100 }, (value) => {
          ctx.updateTextStyle(selectedStyle.key, (style) => ({ ...style, fontWeight: value }));
          ctx.buildConfigEditor();
          void ctx.renderStage();
        })
      )));

      body.append(styleGrid);
    }

    if (ctx.getContentSource() === "inline") {
      const textarea = document.createElement("textarea");
      textarea.className = "p-form-validation__input is-dense control-inline-text";
      textarea.rows = 3;
      textarea.value = ctx.getResolvedTextFieldText(field);
      textarea.addEventListener("input", () => {
        ctx.updateSelectedTextValue(field.id, textarea.value);
        void ctx.renderStage();
      });
      body.append(createFormGroup(`${getOverlayFieldDisplayLabel(state.params, field.id)} Text`, textarea));
    }

    const grid = document.createElement("div");
    grid.className = "grid-row";

    grid.append(wrapCol(1, createFormGroup("Keyline",
      createNumberInput(field.keylineIndex, { min: 1, max: 24, step: 1 }, v => {
        ctx.updateTextField(field.id, f => ({ ...f, keylineIndex: v })); void ctx.renderStage();
      })
    )));

    grid.append(wrapCol(1, createFormGroup("Row",
      createNumberInput(field.rowIndex, { min: 1, max: 24, step: 1 }, v => {
        ctx.updateTextField(field.id, f => ({ ...f, rowIndex: v })); void ctx.renderStage();
      })
    )));

    grid.append(wrapCol(1, createFormGroup("Y Offset",
      createNumberInput(ctx.getDisplayedTextFieldOffsetBaselines(field), { min: -200, max: 500, step: 1 }, v => {
        ctx.updateTextField(field.id, f => ({ ...f, offsetBaselines: v })); void ctx.renderStage();
      })
    )));

    grid.append(wrapCol(1, createFormGroup("Span",
      createNumberInput(field.columnSpan, { min: 1, max: 24, step: 1 }, v => {
        ctx.updateTextField(field.id, f => ({ ...f, columnSpan: v })); void ctx.renderStage();
      })
    )));

    body.append(grid);
  }

  if (state.selected.kind === "logo") {
    const logo = state.params.logo;
    if (!logo) return root;

    const assetInput = document.createElement("input");
    assetInput.className = "p-form-validation__input is-dense";
    assetInput.type = "text";
    assetInput.value = logo.assetPath ?? "";
    assetInput.placeholder = "/assets/UbuntuTagLogo.svg";
    assetInput.addEventListener("change", () => {
      const nextAssetPath = assetInput.value.trim();
      ctx.updateLogo((currentLogo) => {
        const nextLogo = { ...currentLogo };
        if (nextAssetPath) {
          nextLogo.assetPath = nextAssetPath;
        } else {
          delete nextLogo.assetPath;
        }
        return nextLogo;
      });
      void ctx.loadLogoIntrinsicDimensions(nextAssetPath);
      ctx.buildConfigEditor();
      void ctx.renderStage();
    });
    const logoMetaFields = document.createElement("div");
    logoMetaFields.className = "grid-row";

    logoMetaFields.append(wrapCol(3, createFormGroup("Asset Path", assetInput)));
    logoMetaFields.append(wrapCol(1, createCheckboxFormGroup(
      "Lock A Head to Logo",
      logo.linkTitleSizeToHeight !== false,
      (checked) => {
        ctx.updateLogo((currentLogo) => ({
          ...currentLogo,
          linkTitleSizeToHeight: checked
        }));
        if (checked) {
          const titleStyle = state.params.textStyles.find((style) => style.key === "title");
          if (titleStyle) {
            ctx.syncLogoToTitleFontSize(titleStyle.fontSizePx);
          }
        }
        ctx.buildConfigEditor();
        void ctx.renderStage();
      }
    )));

    body.append(logoMetaFields);

    const grid = document.createElement("div");
    grid.className = "grid-row";

    grid.append(wrapCol(1, createFormGroup("X",
      createNumberInput(logo.xPx, { step: 1 }, v => { ctx.updateLogo(l => ({ ...l, xPx: v })); void ctx.renderStage(); })
    )));

    grid.append(wrapCol(1, createFormGroup("Y",
      createNumberInput(logo.yPx, { step: 1 }, v => { ctx.updateLogo(l => ({ ...l, yPx: v })); void ctx.renderStage(); })
    )));

    const widthInput = createNumberInput(logo.widthPx, { min: 1, step: 1 }, v => {
      const aspectRatio = logo.widthPx > 0 && logo.heightPx > 0 ? logo.widthPx / logo.heightPx : ctx.getCurrentLogoAspectRatio();
      const nextHeightPx = Math.max(1, Math.round(v / Math.max(0.0001, aspectRatio)));
      if (logo.linkTitleSizeToHeight === false) {
        ctx.updateLogoSizeWithAspectRatio(nextHeightPx);
      } else {
        ctx.syncTitleToLogoHeight(nextHeightPx);
      }
      void ctx.renderStage();
    });
    widthInput.title = logo.linkTitleSizeToHeight === false
      ? "Width preserves the logo aspect ratio."
      : "Derived from the locked A Head to logo scale.";

    grid.append(wrapCol(1, createFormGroup("Width",
      widthInput
    )));

    grid.append(wrapCol(1, createFormGroup("Height",
      createNumberInput(logo.heightPx, { min: 1, step: 1 }, v => {
        if (logo.linkTitleSizeToHeight === false) {
          ctx.updateLogoSizeWithAspectRatio(v);
        } else {
          ctx.syncTitleToLogoHeight(v);
        }
        void ctx.renderStage();
      })
    )));

    body.append(grid);
  }

  return root;
}
