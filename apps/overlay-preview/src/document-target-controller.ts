/**
 * document-target-controller.ts - Document-size target state and UI rebuilds.
 *
 * Owns saved document-target CRUD plus the Output Format subpanel so main.ts
 * can delegate target-specific mutations and DOM assembly.
 */

import {
  OUTPUT_PROFILE_ORDER,
  OUTPUT_PROFILES
} from "@brand-layout-ops/core-types";
import type { OverlayDocumentTarget } from "@brand-layout-ops/operator-overlay-layout";
import {
  createFormGroup,
  createReadonlySpan,
  createSelectInput,
  wrapCol
} from "@brand-layout-ops/parameter-ui";

import type { PreviewState } from "./preview-app-context.js";

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

  function getDefaultDocumentTargetLabel(profileKey: string): string {
    return OUTPUT_PROFILES[profileKey]?.label ?? profileKey;
  }

  function createDocumentTarget(profileKey: string): OverlayDocumentTarget {
    return {
      id: profileKey,
      label: getDefaultDocumentTargetLabel(profileKey),
      outputProfileKey: profileKey
    };
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
      targets: state.documentProject.targets.map((target) => (
        target.id === activeTarget.id
          ? {
            ...target,
            outputProfileKey: nextProfileKey,
            label: shouldResetLabel ? getDefaultDocumentTargetLabel(nextProfileKey) : target.label
          }
          : target
      ))
    };

    setActiveDocumentTarget(activeTarget.id);
    pruneDocumentTargetProfileState(oldProfileKey);
  }

  function removeActiveDocumentTarget(): boolean {
    const activeTarget = getDocumentTargetById();
    if (!activeTarget || state.documentProject.targets.length <= 1) {
      return false;
    }

    const activeIndex = state.documentProject.targets.findIndex((target) => target.id === activeTarget.id);
    const remainingTargets = state.documentProject.targets.filter((target) => target.id !== activeTarget.id);
    const fallbackTarget = remainingTargets[Math.min(activeIndex, remainingTargets.length - 1)] ?? remainingTargets[0];
    if (!fallbackTarget) {
      return false;
    }

    state.documentProject = {
      ...state.documentProject,
      activeTargetId: fallbackTarget.id,
      targets: remainingTargets
    };

    deps.switchOutputProfile(fallbackTarget.outputProfileKey);
    pruneDocumentTargetProfileState(activeTarget.outputProfileKey);
    return true;
  }

  function buildOutputProfileOptions(): void {
    const container = deps.getOutputProfileOptions();
    if (!container) {
      return;
    }

    const activeTarget = syncDocumentProjectToCurrentOutputProfile();
    container.innerHTML = "";

    const sceneFields = document.createElement("div");
    sceneFields.className = "bf-grid";

    sceneFields.append(wrapCol(2, createFormGroup(
      "Document Sizes",
      createReadonlySpan(`${state.documentProject.targets.length} saved size${state.documentProject.targets.length === 1 ? "" : "s"}`)
    )));

    container.append(sceneFields);

    const help = document.createElement("p");
    help.className = "bf-form-help is-tight bf-u-no-margin--bottom";
    container.append(help);

    const toolbar = document.createElement("div");
    toolbar.className = "bf-cluster preview-cluster--tight";

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "bf-button is-dense";
    addButton.textContent = "Add Size";
    addButton.disabled = getUnusedDocumentTargetProfileKeys().length === 0;
    addButton.addEventListener("click", () => {
      if (!addDocumentTarget()) {
        return;
      }

      deps.markDocumentDirty();
      deps.buildConfigEditor();
      void deps.renderStage();
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "bf-button is-base is-dense";
    removeButton.textContent = "Remove Size";
    removeButton.disabled = state.documentProject.targets.length <= 1;
    removeButton.addEventListener("click", () => {
      if (!removeActiveDocumentTarget()) {
        return;
      }

      deps.markDocumentDirty();
      deps.buildConfigEditor();
      void deps.renderStage();
    });

    toolbar.append(addButton, removeButton);
    container.append(toolbar);

    const list = document.createElement("div");
    list.className = "bf-choice-list bf-stack preview-stack--compact";

    for (const target of state.documentProject.targets) {
      const profile = OUTPUT_PROFILES[target.outputProfileKey];
      const row = document.createElement("label");
      row.className = "bf-choice-row";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "document-target";
      radio.value = target.id;
      radio.checked = target.id === activeTarget.id;
      radio.addEventListener("change", () => {
        setActiveDocumentTarget(target.id);
        deps.markDocumentDirty();
        deps.buildConfigEditor();
        void deps.renderStage();
      });

      const nameSpan = document.createElement("span");
      nameSpan.className = "bf-choice-row-name";
      nameSpan.textContent = target.label;

      const metaSpan = document.createElement("span");
      metaSpan.className = "bf-choice-row-meta";
      const profileMeta = profile
        ? `${profile.label} \u2022 ${profile.widthPx}x${profile.heightPx}`
        : target.outputProfileKey;
      metaSpan.textContent = radio.checked ? `${profileMeta} \u2022 Active` : profileMeta;

      row.append(radio, nameSpan, metaSpan);
      list.append(row);
    }

    container.append(list);

    const details = document.createElement("div");
    details.className = "bf-grid";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "bf-input is-dense";
    labelInput.value = activeTarget.label;
    labelInput.placeholder = getDefaultDocumentTargetLabel(activeTarget.outputProfileKey);
    labelInput.addEventListener("change", () => {
      updateActiveDocumentTargetLabel(labelInput.value);
      deps.markDocumentDirty();
      buildOutputProfileOptions();
    });

    details.append(wrapCol(2, createFormGroup("Active Size Label", labelInput)));

    details.append(wrapCol(2, createFormGroup(
      "Active Size",
      createSelectInput(
        activeTarget.outputProfileKey,
        getUnusedDocumentTargetProfileKeys(activeTarget.outputProfileKey).map((profileKey) => {
          const profile = OUTPUT_PROFILES[profileKey];
          return {
            label: profile ? `${profile.label} \u2022 ${profile.widthPx}x${profile.heightPx}` : profileKey,
            value: profileKey
          };
        }),
        (value) => {
          updateActiveDocumentTargetProfile(value);
          deps.markDocumentDirty();
          deps.buildConfigEditor();
          void deps.renderStage();
        }
      )
    )));

    container.append(details);
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