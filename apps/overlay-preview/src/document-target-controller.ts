/**
 * document-target-controller.ts - Document-size target state and UI rebuilds.
 *
 * Owns saved document-target CRUD plus the document setup modal table so main.ts
 * can delegate target-specific mutations and DOM assembly.
 */

import {
  OUTPUT_PROFILE_ORDER,
  createCustomOutputProfileKey,
  findBuiltInOutputProfileKeyByDimensions,
  getOutputProfile,
  type FrameSize
} from "@brand-layout-ops/core-types";
import type { OverlayDocumentTarget } from "@brand-layout-ops/operator-overlay-layout";

import type { PreviewState } from "./preview-app-context.js";

type DocumentSetupStatusTone = "neutral" | "success" | "error";

interface PendingDocumentTargetDraft {
  label: string;
  width: string;
  height: string;
}

interface RemoveDocumentTargetResult {
  removed: boolean;
  activeChanged: boolean;
}

export interface DocumentTargetControllerDeps {
  readonly state: PreviewState;
  getOutputProfileOptions(): HTMLElement | null;
  switchOutputProfile(profileKey: string): void;
  markDocumentDirty(): void;
  buildConfigEditor(): void;
  renderStage(): Promise<void>;
}

export interface DocumentTargetController {
  getDefaultDocumentTargetLabel(profileKey: string): string;
  syncDocumentProjectToCurrentOutputProfile(): OverlayDocumentTarget;
  getUnusedDocumentTargetProfileKeys(currentProfileKey?: string): string[];
  setActiveDocumentTarget(targetId: string): void;
  addDocumentTarget(profileKey?: string): boolean;
  updateActiveDocumentTargetLabel(rawLabel: string): void;
  updateActiveDocumentTargetProfile(nextProfileKey: string): void;
  removeActiveDocumentTarget(): boolean;
  buildOutputProfileOptions(): void;
}

export function createDocumentTargetController(
  deps: DocumentTargetControllerDeps
): DocumentTargetController {
  const { state } = deps;

  let pendingDraft: PendingDocumentTargetDraft = {
    label: "",
    width: "",
    height: ""
  };

  let statusMessage = "";
  let statusTone: DocumentSetupStatusTone = "neutral";

  function setStatus(message: string, tone: DocumentSetupStatusTone = "neutral"): void {
    statusMessage = message;
    statusTone = tone;
  }

  function clearStatus(): void {
    statusMessage = "";
    statusTone = "neutral";
  }

  function getDefaultDocumentTargetLabel(profileKey: string): string {
    return getOutputProfile(profileKey).label;
  }

  function getDocumentTargetFrame(target: OverlayDocumentTarget): FrameSize {
    const profile = getOutputProfile(target.outputProfileKey);
    return {
      widthPx: profile.widthPx,
      heightPx: profile.heightPx
    };
  }

  function createDocumentTarget(profileKey: string, labelOverride?: string): OverlayDocumentTarget {
    return {
      id: profileKey,
      label: labelOverride?.trim() || getDefaultDocumentTargetLabel(profileKey),
      outputProfileKey: profileKey
    };
  }

  function createCell(tagName: "th" | "td", textContent?: string): HTMLTableCellElement {
    const cell = document.createElement(tagName);
    if (typeof textContent === "string") {
      cell.textContent = textContent;
    }
    return cell;
  }

  function getDocumentTargetById(
    targetId: string | null | undefined = state.documentProject.activeTargetId
  ): OverlayDocumentTarget | null {
    if (!targetId) {
      return null;
    }

    return state.documentProject.targets.find((target) => target.id === targetId) ?? null;
  }

  function getDocumentTargetByProfileKey(profileKey: string): OverlayDocumentTarget | null {
    return state.documentProject.targets.find((target) => target.outputProfileKey === profileKey) ?? null;
  }

  function getDocumentTargetByDimensions(widthPx: number, heightPx: number): OverlayDocumentTarget | null {
    const safeWidthPx = Math.max(1, Math.round(widthPx));
    const safeHeightPx = Math.max(1, Math.round(heightPx));

    return state.documentProject.targets.find((target) => {
      const frame = getDocumentTargetFrame(target);
      return frame.widthPx === safeWidthPx && frame.heightPx === safeHeightPx;
    }) ?? null;
  }

  function syncDocumentProjectToCurrentOutputProfile(): OverlayDocumentTarget {
    const existingTarget = getDocumentTargetByProfileKey(state.outputProfileKey);
    if (existingTarget) {
      if (state.documentProject.activeTargetId !== existingTarget.id) {
        state.documentProject = {
          ...state.documentProject,
          activeTargetId: existingTarget.id
        };
      }

      return existingTarget;
    }

    const nextTarget = createDocumentTarget(state.outputProfileKey);
    state.documentProject = {
      ...state.documentProject,
      activeTargetId: nextTarget.id,
      targets: [...state.documentProject.targets, nextTarget]
    };
    return nextTarget;
  }

  function getUnusedDocumentTargetProfileKeys(currentProfileKey?: string): string[] {
    return OUTPUT_PROFILE_ORDER.filter((profileKey) => (
      profileKey === currentProfileKey || !state.documentProject.targets.some((target) => target.outputProfileKey === profileKey)
    ));
  }

  function pruneDocumentTargetProfileState(profileKey: string): void {
    if (state.documentProject.targets.some((target) => target.outputProfileKey === profileKey)) {
      return;
    }

    delete state.profileFormatBuckets[profileKey];
    delete state.contentFormatKeyByProfile[profileKey];
    delete state.exportSettingsByProfile[profileKey];
    delete state.haloConfigByProfile[profileKey];
  }

  function setActiveDocumentTarget(targetId: string): void {
    const nextTarget = getDocumentTargetById(targetId);
    if (!nextTarget) {
      return;
    }

    state.documentProject = {
      ...state.documentProject,
      activeTargetId: nextTarget.id
    };

    if (nextTarget.outputProfileKey !== state.outputProfileKey) {
      deps.switchOutputProfile(nextTarget.outputProfileKey);
    } else {
      syncDocumentProjectToCurrentOutputProfile();
    }
  }

  function resolveDocumentTargetProfileKey(widthPx: number, heightPx: number): string {
    return findBuiltInOutputProfileKeyByDimensions(widthPx, heightPx)
      ?? createCustomOutputProfileKey(widthPx, heightPx);
  }

  function addDocumentTarget(profileKey?: string): boolean {
    const nextProfileKey = profileKey ?? getUnusedDocumentTargetProfileKeys()[0];
    if (!nextProfileKey) {
      return false;
    }

    const existingTarget = getDocumentTargetByProfileKey(nextProfileKey);
    if (!existingTarget) {
      state.documentProject = {
        ...state.documentProject,
        targets: [...state.documentProject.targets, createDocumentTarget(nextProfileKey)]
      };
    }

    setActiveDocumentTarget(existingTarget?.id ?? nextProfileKey);
    return true;
  }

  function addDocumentTargetFromDraft(): boolean {
    const widthPx = Number.parseInt(pendingDraft.width.trim(), 10);
    const heightPx = Number.parseInt(pendingDraft.height.trim(), 10);

    if (!Number.isFinite(widthPx) || widthPx <= 0) {
      setStatus("Enter a width greater than 0.", "error");
      return false;
    }

    if (!Number.isFinite(heightPx) || heightPx <= 0) {
      setStatus("Enter a height greater than 0.", "error");
      return false;
    }

    const safeWidthPx = Math.max(1, Math.round(widthPx));
    const safeHeightPx = Math.max(1, Math.round(heightPx));
    const nextProfileKey = resolveDocumentTargetProfileKey(safeWidthPx, safeHeightPx);
    const existingTarget = getDocumentTargetByProfileKey(nextProfileKey)
      ?? getDocumentTargetByDimensions(safeWidthPx, safeHeightPx);

    if (existingTarget) {
      const existingFrame = getDocumentTargetFrame(existingTarget);
      setStatus(
        `${existingTarget.label} already covers ${existingFrame.widthPx}×${existingFrame.heightPx}.`,
        "error"
      );
      return false;
    }

    const nextTarget = createDocumentTarget(nextProfileKey, pendingDraft.label);
    state.documentProject = {
      ...state.documentProject,
      targets: [...state.documentProject.targets, nextTarget]
    };

    pendingDraft = {
      label: "",
      width: "",
      height: ""
    };
    setStatus(`Added ${nextTarget.label}.`, "success");
    return true;
  }

  function updateActiveDocumentTargetLabel(rawLabel: string): void {
    const activeTarget = getDocumentTargetById();
    if (!activeTarget) {
      return;
    }

    const nextLabel = rawLabel.trim() || getDefaultDocumentTargetLabel(activeTarget.outputProfileKey);
    if (nextLabel === activeTarget.label) {
      return;
    }

    state.documentProject = {
      ...state.documentProject,
      targets: state.documentProject.targets.map((target) => (
        target.id === activeTarget.id
          ? { ...target, label: nextLabel }
          : target
      ))
    };
  }

  function updateActiveDocumentTargetProfile(nextProfileKey: string): void {
    const activeTarget = getDocumentTargetById();
    if (!activeTarget || activeTarget.outputProfileKey === nextProfileKey) {
      return;
    }

    const existingTarget = getDocumentTargetByProfileKey(nextProfileKey);
    if (existingTarget && existingTarget.id !== activeTarget.id) {
      setActiveDocumentTarget(existingTarget.id);
      return;
    }

    const oldProfileKey = activeTarget.outputProfileKey;
    const shouldResetLabel = activeTarget.label.trim() === getDefaultDocumentTargetLabel(oldProfileKey);

    state.documentProject = {
      ...state.documentProject,
      activeTargetId: nextProfileKey,
      targets: state.documentProject.targets.map((target) => (
        target.id === activeTarget.id
          ? {
            ...target,
            id: nextProfileKey,
            outputProfileKey: nextProfileKey,
            label: shouldResetLabel ? getDefaultDocumentTargetLabel(nextProfileKey) : target.label
          }
          : target
      ))
    };

    setActiveDocumentTarget(nextProfileKey);
    pruneDocumentTargetProfileState(oldProfileKey);
  }

  function removeDocumentTarget(targetId: string): RemoveDocumentTargetResult {
    const target = getDocumentTargetById(targetId);
    if (!target || state.documentProject.targets.length <= 1) {
      setStatus("A document needs at least one size.", "error");
      return { removed: false, activeChanged: false };
    }

    const activeIndex = state.documentProject.targets.findIndex((candidate) => candidate.id === target.id);
    const remainingTargets = state.documentProject.targets.filter((candidate) => candidate.id !== target.id);
    const removedActiveTarget = target.id === state.documentProject.activeTargetId;

    if (!removedActiveTarget) {
      state.documentProject = {
        ...state.documentProject,
        targets: remainingTargets
      };
      pruneDocumentTargetProfileState(target.outputProfileKey);
      setStatus(`Removed ${target.label}.`, "success");
      return { removed: true, activeChanged: false };
    }

    const fallbackTarget = remainingTargets[Math.min(activeIndex, remainingTargets.length - 1)] ?? remainingTargets[0];
    if (!fallbackTarget) {
      setStatus("Could not choose a fallback size.", "error");
      return { removed: false, activeChanged: false };
    }

    state.documentProject = {
      ...state.documentProject,
      activeTargetId: fallbackTarget.id,
      targets: remainingTargets
    };

    deps.switchOutputProfile(fallbackTarget.outputProfileKey);
    pruneDocumentTargetProfileState(target.outputProfileKey);
    setStatus(`Removed ${target.label}.`, "success");
    return { removed: true, activeChanged: true };
  }

  function removeActiveDocumentTarget(): boolean {
    return removeDocumentTarget(state.documentProject.activeTargetId).removed;
  }

  function createDraftInput(
    type: "text" | "number",
    value: string,
    placeholder: string,
    onInput: (nextValue: string) => void,
    onSubmit: () => void
  ): HTMLInputElement {
    const input = document.createElement("input");
    input.type = type;
    input.className = "bf-input is-dense";
    input.value = value;
    input.placeholder = placeholder;

    if (type === "number") {
      input.min = "1";
      input.step = "1";
      input.inputMode = "numeric";
    }

    input.addEventListener("input", () => {
      onInput(input.value);
      if (statusTone === "error") {
        clearStatus();
      }
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      onSubmit();
    });

    return input;
  }

  function buildOutputProfileOptions(): void {
    const container = deps.getOutputProfileOptions();
    if (!container) {
      return;
    }

    const activeTarget = syncDocumentProjectToCurrentOutputProfile();
    const activeFrame = getDocumentTargetFrame(activeTarget);
    container.innerHTML = "";

    const help = document.createElement("p");
    help.className = "bf-form-help bf-u-no-margin--bottom";
    help.textContent = "Choose the active size, add custom dimensions, or remove sizes you no longer need. Changes stay in the current document until you save the file.";
    container.append(help);

    const status = document.createElement("p");
    status.className = "bf-form-help bf-u-no-margin--bottom";
    status.textContent = statusMessage || `${state.documentProject.targets.length} saved size${state.documentProject.targets.length === 1 ? "" : "s"}.`;
    status.style.color = statusTone === "success"
      ? "#9ad47d"
      : statusTone === "error"
        ? "#ff8f8f"
        : "";
    container.append(status);

    const table = document.createElement("table");
    table.className = "bf-table";
    table.setAttribute("data-document-setup-table", "");
    table.setAttribute("aria-label", "Document setup sizes");

    const thead = document.createElement("thead");
    const headingRow = document.createElement("tr");
    headingRow.append(
      createCell("th", "Use"),
      createCell("th", "Title"),
      createCell("th", "Width"),
      createCell("th", "Height"),
      createCell("th", "")
    );
    thead.append(headingRow);
    table.append(thead);

    const tbody = document.createElement("tbody");
    for (const target of state.documentProject.targets) {
      const frame = getDocumentTargetFrame(target);
      const row = document.createElement("tr");
      if (target.id === activeTarget.id) {
        row.setAttribute("data-active-document-target", "true");
      }

      const activeCell = createCell("td");
      activeCell.className = "is-radio-cell";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "document-setup-target";
      radio.value = target.id;
      radio.checked = target.id === activeTarget.id;
      radio.setAttribute("aria-label", `Activate ${target.label}`);
      radio.addEventListener("change", () => {
        clearStatus();
        setActiveDocumentTarget(target.id);
        deps.markDocumentDirty();
        deps.buildConfigEditor();
        void deps.renderStage();
        buildOutputProfileOptions();
      });
      activeCell.append(radio);

      const titleCell = createCell("td", target.label);
      const widthCell = createCell("td", String(frame.widthPx));
      const heightCell = createCell("td", String(frame.heightPx));

      const actionCell = createCell("td");
      actionCell.className = "is-action-cell";
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "bf-button is-base is-dense";
      removeButton.textContent = "×";
      removeButton.disabled = state.documentProject.targets.length <= 1;
      removeButton.setAttribute("data-remove-target-button", "");
      removeButton.setAttribute("aria-label", `Remove ${target.label}`);
      removeButton.addEventListener("click", () => {
        const result = removeDocumentTarget(target.id);
        if (!result.removed) {
          buildOutputProfileOptions();
          return;
        }

        deps.markDocumentDirty();
        if (result.activeChanged) {
          deps.buildConfigEditor();
          void deps.renderStage();
        }
        buildOutputProfileOptions();
      });
      actionCell.append(removeButton);

      row.append(activeCell, titleCell, widthCell, heightCell, actionCell);
      tbody.append(row);
    }
    table.append(tbody);

    const tfoot = document.createElement("tfoot");
    const addRow = document.createElement("tr");
    addRow.setAttribute("data-document-setup-add-row", "");

    const addLeadCell = createCell("td", "+");
    addLeadCell.className = "is-radio-cell";

    const submitDraft = (): void => {
      if (!addDocumentTargetFromDraft()) {
        buildOutputProfileOptions();
        return;
      }

      deps.markDocumentDirty();
      buildOutputProfileOptions();
    };

    const titleInput = createDraftInput(
      "text",
      pendingDraft.label,
      "Title",
      (nextValue) => {
        pendingDraft = { ...pendingDraft, label: nextValue };
      },
      submitDraft
    );

    const widthInput = createDraftInput(
      "number",
      pendingDraft.width,
      String(activeFrame.widthPx),
      (nextValue) => {
        pendingDraft = { ...pendingDraft, width: nextValue };
      },
      submitDraft
    );

    const heightInput = createDraftInput(
      "number",
      pendingDraft.height,
      String(activeFrame.heightPx),
      (nextValue) => {
        pendingDraft = { ...pendingDraft, height: nextValue };
      },
      submitDraft
    );

    const titleInputCell = createCell("td");
    titleInputCell.append(titleInput);
    const widthInputCell = createCell("td");
    widthInputCell.append(widthInput);
    const heightInputCell = createCell("td");
    heightInputCell.append(heightInput);

    const addActionCell = createCell("td");
    addActionCell.className = "is-action-cell";
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "bf-button is-dense";
    addButton.textContent = "Add";
    addButton.setAttribute("data-add-target-button", "");
    addButton.addEventListener("click", submitDraft);
    addActionCell.append(addButton);

    addRow.append(addLeadCell, titleInputCell, widthInputCell, heightInputCell, addActionCell);
    tfoot.append(addRow);
    table.append(tfoot);

    container.append(table);
  }

  return {
    getDefaultDocumentTargetLabel,
    syncDocumentProjectToCurrentOutputProfile,
    getUnusedDocumentTargetProfileKeys,
    setActiveDocumentTarget,
    addDocumentTarget,
    updateActiveDocumentTargetLabel,
    updateActiveDocumentTargetProfile,
    removeActiveDocumentTarget,
    buildOutputProfileOptions
  };
}