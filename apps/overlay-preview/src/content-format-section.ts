/**
 * content-format-section.ts — Content Format accordion section builder.
 */
import {
  OVERLAY_CONTENT_FORMAT_ORDER,
  OVERLAY_CONTENT_FORMATS
} from "@brand-layout-ops/core-types";
import {
  resolveOverlayTextValue
} from "@brand-layout-ops/operator-overlay-layout";
import type { OverlayContentSource } from "@brand-layout-ops/operator-overlay-layout";
import { inspectOverlayCsvDraft } from "@brand-layout-ops/operator-overlay-layout";
import {
  buildAccordionSectionEl,
  createFormGroup,
  createNumberInput,
  createSelectInput,
  wrapCol
} from "@brand-layout-ops/parameter-ui";
import type { PreviewAppContext } from "./preview-app-context.js";

export function buildContentFormatSection(ctx: PreviewAppContext): HTMLElement {
  const { root, body } = buildAccordionSectionEl("Content Format");
  const { state } = ctx;

  const formatFields = document.createElement("div");
  formatFields.className = "grid-row";

  formatFields.append(wrapCol(2, createFormGroup("Format",
    createSelectInput(
      state.contentFormatKey,
      OVERLAY_CONTENT_FORMAT_ORDER.map(k => ({
        label: OVERLAY_CONTENT_FORMATS[k].label,
        value: k
      })),
      (v) => {
        ctx.switchContentFormat(v);
        ctx.buildConfigEditor();
        void ctx.renderStage();
      }
    )
  )));

  formatFields.append(wrapCol(2, createFormGroup("Content Source",
    createSelectInput(
      ctx.getContentSource(),
      [{ label: "Inline text", value: "inline" }, { label: "CSV", value: "csv" }],
      (v) => {
        state.params = { ...state.params, contentSource: v as OverlayContentSource };
        ctx.buildConfigEditor();
        void ctx.renderStage();
      }
    )
  )));

  body.append(formatFields);

  if (ctx.getContentSource() === "csv") {
    const effectiveParams = ctx.getEffectiveParams();
    const csvSummary = inspectOverlayCsvDraft(effectiveParams);
    const appliedCsvSummary = inspectOverlayCsvDraft(state.params);
    const formatSpec = OVERLAY_CONTENT_FORMATS[state.contentFormatKey];

    const textarea = document.createElement("textarea");
    textarea.className = "bf-input is-dense control-inline-text";
    textarea.rows = 5;
    textarea.value = ctx.getStagedCsvDraft() ?? state.params.csvContent?.draft ?? "";
    body.append(createFormGroup("CSV Data", textarea));

    const actions = document.createElement("div");
    actions.className = "bf-cluster preview-cluster--tight";

    const applyBtn = document.createElement("button");
    applyBtn.className = "bf-button is-dense";
    applyBtn.textContent = "Apply CSV";
    applyBtn.disabled = !ctx.hasStagedCsvDraft();
    applyBtn.addEventListener("click", () => { ctx.applyStagedCsvDraft(); ctx.buildConfigEditor(); void ctx.renderStage(); });

    const discardBtn = document.createElement("button");
    discardBtn.className = "bf-button--base is-dense";
    discardBtn.textContent = "Discard";
    discardBtn.disabled = !ctx.hasStagedCsvDraft();
    discardBtn.addEventListener("click", () => { ctx.discardStagedCsvDraft(); ctx.buildConfigEditor(); void ctx.renderStage(); });

    function syncCsvActionButtons() {
      const hasStagedDraft = ctx.hasStagedCsvDraft();
      applyBtn.disabled = !hasStagedDraft;
      discardBtn.disabled = !hasStagedDraft;
    }

    textarea.addEventListener("input", () => {
      ctx.setStagedCsvDraft(textarea.value);
      ctx.markDocumentDirty();
      syncCsvActionButtons();
    });

    syncCsvActionButtons();

    actions.append(applyBtn, discardBtn);
    body.append(actions);

    body.append(createFormGroup("CSV Row",
      createNumberInput(
        state.params.csvContent?.rowIndex ?? 1,
        { min: 1, step: 1 },
        (v) => {
          state.params = {
            ...state.params,
            csvContent: { draft: state.params.csvContent?.draft ?? "", rowIndex: Math.max(1, Math.round(v)) }
          };
          ctx.markDocumentDirty();
          void ctx.renderStage();
        }
      )
    ));

    const csvStatus = document.createElement("p");
    csvStatus.className = "bf-form-help control-help";
    csvStatus.textContent = csvSummary.selectedRowExists
      ? `${csvSummary.rowCount} row(s) loaded. Editing row ${csvSummary.selectedRowIndex}.`
      : `No CSV row ${csvSummary.selectedRowIndex} exists yet. ${csvSummary.rowCount} row(s) loaded.`;
    body.append(csvStatus);

    if (csvSummary.hasUnterminatedQuote) {
      const warning = document.createElement("p");
      warning.className = "bf-form-help control-help";
      warning.textContent = "CSV draft has an unterminated quoted field.";
      body.append(warning);
    }

    if (ctx.hasStagedCsvDraft()) {
      const pending = document.createElement("p");
      pending.className = "bf-form-help control-help";
      pending.textContent = "Staged CSV changes are pending for this profile and format until you apply them.";
      body.append(pending);
    }

    const fieldStatusList = document.createElement("div");
    fieldStatusList.className = "style-palette";

    for (const fieldSpec of formatSpec.fields) {
      const field = state.params.textFields.find((candidate) => {
        const contentFieldId = candidate.contentFieldId?.trim();
        return candidate.id === fieldSpec.id || contentFieldId === fieldSpec.id;
      });

      const statusCard = document.createElement("div");
      statusCard.className = "style-palette__button";

      const label = document.createElement("span");
      label.className = "style-palette__label";
      label.textContent = fieldSpec.label;

      const isMapped = !csvSummary.missingFieldKeys.includes(fieldSpec.id);
      const appliedValue = field ? resolveOverlayTextValue(state.params, field) : "";
      const effectiveValue = field ? resolveOverlayTextValue(effectiveParams, field) : "";
      const isPending = ctx.hasStagedCsvDraft() && effectiveValue !== appliedValue;

      const meta = document.createElement("span");
      meta.className = "style-palette__meta";
      meta.textContent = isMapped
        ? (isPending ? "Mapped via CSV alias, staged changes pending" : "Mapped via CSV alias")
        : "No matching CSV header found";

      const value = document.createElement("span");
      value.className = "style-palette__meta";
      value.textContent = isPending
        ? `Pending: ${effectiveValue || "(empty)"} | Applied: ${appliedValue || "(empty)"}`
        : `Value: ${effectiveValue || "(empty)"}`;

      statusCard.append(label, meta, value);
      fieldStatusList.append(statusCard);
    }

    body.append(fieldStatusList);
  }

  return root;
}
