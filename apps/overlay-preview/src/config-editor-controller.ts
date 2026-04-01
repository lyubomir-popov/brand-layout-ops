/**
 * config-editor-controller.ts — Inspector pane registration and rebuild.
 *
 * Owns the accordion section registry, the operator selector UI, and the
 * policy for rebuilding the split workspace/parameter rails.
 */

import { initRangeControls } from "baseline-foundry";

import {
  getOverlaySceneFamilyKeyForBackgroundOperator,
  OVERLAY_BACKGROUND_FUZZY_SEED_NODE_ID,
  OVERLAY_BACKGROUND_HALO_OPERATOR_KEY,
  OVERLAY_BACKGROUND_PHYLLOTAXIS_OPERATOR_KEY,
  OVERLAY_SCENE_FAMILY_ORDER,
  type OverlayBackgroundNode,
  type OverlaySceneFamilyKey
} from "@brand-layout-ops/operator-overlay-layout";
import {
  createParameterSectionRegistry,
  setupAccordion,
  type ParameterSectionDefinition
} from "@brand-layout-ops/parameter-ui";

import {
  OVERLAY_LAYOUT_OPERATOR_SELECTION_ID,
  type PreviewState
} from "./preview-app-context.js";

export interface ConfigEditorControllerDeps {
  readonly state: PreviewState;
  readonly sectionDefinitions: ParameterSectionDefinition[];
  getConfigEditor(): HTMLElement | null;
  getSelectedOperatorId(): string;
  getSelectedOperatorGroup(): string;
  getSceneFamilyLabel(key: OverlaySceneFamilyKey): string;
  setSelectedOperator(operatorId: string | null): boolean;
  syncDocumentBackgroundGraph(): void;
  markDocumentDirty(): void;
  syncBackgroundRendererVisibility(): void;
  renderStage(): Promise<void>;
}

export interface ConfigEditorController {
  buildConfigEditor(): void;
}

interface RenderedSection {
  section: ParameterSectionDefinition;
  element: HTMLElement;
}

export function createConfigEditorController(deps: ConfigEditorControllerDeps): ConfigEditorController {
  const { state } = deps;
  const configSectionRegistry = createParameterSectionRegistry(deps.sectionDefinitions);
  let shouldAutoOpenNextOperatorSection = false;

  function getConfigSections(): ParameterSectionDefinition[] {
    return configSectionRegistry.getSections();
  }

  function getBackgroundNodeLabel(node: OverlayBackgroundNode): string {
    if (node.operatorKey === OVERLAY_BACKGROUND_HALO_OPERATOR_KEY) {
      return "Halo Field";
    }

    if (node.operatorKey === OVERLAY_BACKGROUND_PHYLLOTAXIS_OPERATOR_KEY && node.id === OVERLAY_BACKGROUND_FUZZY_SEED_NODE_ID) {
      return "Phyllotaxis Seed";
    }

    return deps.getSceneFamilyLabel(getOverlaySceneFamilyKeyForBackgroundOperator(node.operatorKey));
  }

  function getBackgroundNodeStatus(node: OverlayBackgroundNode): string {
    const nodesById = new Map(state.documentProject.backgroundGraph.nodes.map((entry) => [entry.id, entry]));
    const incomingLabels = state.documentProject.backgroundGraph.edges
      .filter((edge) => edge.toNodeId === node.id)
      .map((edge) => nodesById.get(edge.fromNodeId))
      .filter((entry): entry is OverlayBackgroundNode => entry !== undefined)
      .map((entry) => getBackgroundNodeLabel(entry));
    const outgoingLabels = state.documentProject.backgroundGraph.edges
      .filter((edge) => edge.fromNodeId === node.id)
      .map((edge) => nodesById.get(edge.toNodeId))
      .filter((entry): entry is OverlayBackgroundNode => entry !== undefined)
      .map((entry) => getBackgroundNodeLabel(entry));

    const statusParts = [
      node.id === state.documentProject.backgroundGraph.activeNodeId ? "Output" : "Upstream"
    ];

    if (incomingLabels.length > 0) {
      statusParts.push(`Receives ${incomingLabels.join(", ")}`);
    }

    if (outgoingLabels.length > 0) {
      statusParts.push(`Feeds ${outgoingLabels.join(", ")}`);
    }

    if (incomingLabels.length === 0 && outgoingLabels.length === 0) {
      statusParts.push("No saved connections");
    }

    return statusParts.join(" | ");
  }

  function findRenderedSection(renderedSections: RenderedSection[], key: string | null): HTMLElement | null {
    if (!key) {
      return null;
    }

    return renderedSections.find((entry) => entry.section.key === key)?.element ?? null;
  }

  function buildOperatorSelectorEl(): HTMLElement {
    const section = document.createElement("li");
    section.className = "bf-accordion-group is-operator-selector";

    const heading = document.createElement("div");
    heading.className = "is-operator-selector-heading";

    const label = document.createElement("span");
    label.className = "bf-form-label";
    label.textContent = "Operators";
    heading.append(label);

    const help = document.createElement("p");
    help.className = "bf-form-help is-tight bf-u-no-margin--bottom is-operator-selector-help";
    help.textContent = "Select one operator surface to edit. Rendered output chooses which saved background node feeds the preview.";

    const outputSection = document.createElement("div");
    outputSection.className = "is-operator-selector-section";

    const outputLabel = document.createElement("div");
    outputLabel.className = "is-operator-selector-subheading";
    outputLabel.textContent = "Rendered Output";
    outputSection.append(outputLabel);

    const radioGroup = document.createElement("div");
    radioGroup.className = "is-operator-selector-options";

    for (const sceneFamilyKey of OVERLAY_SCENE_FAMILY_ORDER) {
      const radioLabel = document.createElement("label");
      radioLabel.className = "is-operator-selector-option";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "background-family-selector";
      radio.value = sceneFamilyKey;
      radio.checked = sceneFamilyKey === state.documentProject.sceneFamilyKey;
      radio.addEventListener("change", () => {
        if (!radio.checked) {
          return;
        }

        state.documentProject = {
          ...state.documentProject,
          sceneFamilyKey: sceneFamilyKey as OverlaySceneFamilyKey
        };
        shouldAutoOpenNextOperatorSection = true;
        deps.syncDocumentBackgroundGraph();
        deps.setSelectedOperator(state.documentProject.backgroundGraph.activeNodeId);
        deps.markDocumentDirty();
        buildConfigEditor();
        deps.syncBackgroundRendererVisibility();
        void deps.renderStage();
      });

      const text = document.createElement("span");
      text.textContent = deps.getSceneFamilyLabel(sceneFamilyKey);

      radioLabel.append(radio, text);
      radioGroup.append(radioLabel);
    }

    outputSection.append(radioGroup);

    const nodesSection = document.createElement("div");
  nodesSection.className = "is-operator-selector-section";

    const nodesLabel = document.createElement("div");
  nodesLabel.className = "is-operator-selector-subheading";
    nodesLabel.textContent = "Parameter Surface";
    nodesSection.append(nodesLabel);

    const nodeList = document.createElement("div");
    nodeList.className = "bf-choice-list bf-stack is-compact-stack";
    const selectedOperatorId = deps.getSelectedOperatorId();

    const overlayRow = document.createElement("label");
    overlayRow.className = "bf-choice-row is-operator-selector-node";

    const overlayRadio = document.createElement("input");
    overlayRadio.type = "radio";
    overlayRadio.name = "parameter-operator-selector";
    overlayRadio.value = OVERLAY_LAYOUT_OPERATOR_SELECTION_ID;
    overlayRadio.checked = selectedOperatorId === OVERLAY_LAYOUT_OPERATOR_SELECTION_ID;
    overlayRadio.addEventListener("change", () => {
      if (!overlayRadio.checked || !deps.setSelectedOperator(OVERLAY_LAYOUT_OPERATOR_SELECTION_ID)) {
        return;
      }

      shouldAutoOpenNextOperatorSection = true;
      buildConfigEditor();
    });

    const overlayCopy = document.createElement("span");
    overlayCopy.className = "is-operator-selector-node-copy";

    const overlayName = document.createElement("span");
    overlayName.className = "bf-choice-row-name";
    overlayName.textContent = "Overlay Layout";

    const overlayMeta = document.createElement("span");
    overlayMeta.className = "bf-choice-row-meta";
    overlayMeta.textContent = "Text, logo, guides, and selected element controls.";

    overlayCopy.append(overlayName, overlayMeta);
    overlayRow.append(overlayRadio, overlayCopy);
    nodeList.append(overlayRow);

    for (const node of state.documentProject.backgroundGraph.nodes) {
      const row = document.createElement("label");
      row.className = "bf-choice-row is-operator-selector-node";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "parameter-operator-selector";
      radio.value = node.id;
      radio.checked = node.id === selectedOperatorId;
      radio.addEventListener("change", () => {
        if (!radio.checked || !deps.setSelectedOperator(node.id)) {
          return;
        }

        shouldAutoOpenNextOperatorSection = true;
        buildConfigEditor();
      });

      const copy = document.createElement("span");
      copy.className = "is-operator-selector-node-copy";

      const nameSpan = document.createElement("span");
      nameSpan.className = "bf-choice-row-name";
      nameSpan.textContent = getBackgroundNodeLabel(node);

      const metaSpan = document.createElement("span");
      metaSpan.className = "bf-choice-row-meta";
      metaSpan.textContent = getBackgroundNodeStatus(node);

      copy.append(nameSpan, metaSpan);
      row.append(radio, copy);
      nodeList.append(row);
    }

    nodesSection.append(nodeList);
    section.append(heading, help, outputSection, nodesSection);
    return section;
  }

  function openAccordionSection(group: HTMLElement | null): boolean {
    const tab = group?.querySelector<HTMLElement>(".bf-accordion-tab");
    const panelId = tab?.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!tab || !panel) {
      return false;
    }

    tab.setAttribute("aria-expanded", "true");
    panel.setAttribute("aria-hidden", "false");
    return true;
  }

  function buildSectionAccordion(
    sections: ParameterSectionDefinition[],
    renderedSections: RenderedSection[]
  ): HTMLElement {
    const accordion = document.createElement("aside");
    accordion.className = "bf-accordion";

    const list = document.createElement("ul");
    list.className = "bf-accordion-list";

    for (const section of sections) {
      const element = section.factory();
      element.dataset.sectionKey = section.key;
      list.append(element);
      renderedSections.push({ section, element });
    }

    accordion.append(list);
    return accordion;
  }

  function buildInspectorRail(title: string, description: string, accordion: HTMLElement): HTMLElement {
    const rail = document.createElement("section");
    rail.className = "bf-stack is-compact-stack is-inspector-rail";

    const heading = document.createElement("div");
    heading.className = "is-inspector-rail-heading";

    const label = document.createElement("span");
    label.className = "bf-form-label is-inspector-rail-label";
    label.textContent = title;

    const help = document.createElement("p");
    help.className = "bf-form-help is-tight bf-u-no-margin--bottom";
    help.textContent = description;

    heading.append(label, help);
    rail.append(heading, accordion);
    return rail;
  }

  function buildConfigEditor(): void {
    const container = deps.getConfigEditor();
    if (!container) {
      return;
    }

    const expandedTab = container.querySelector<HTMLElement>('.bf-accordion-tab[aria-expanded="true"]');
    const expandedGroup = expandedTab?.closest<HTMLElement>("[data-section-key]");
    const previouslyOpenKey = expandedGroup?.dataset.sectionKey ?? null;

    container.innerHTML = "";

    const sections = getConfigSections();
    const activeGroup = deps.getSelectedOperatorGroup();

    const shellSections = sections.filter((section) => section.scope === "shell");
    const operatorSections = sections.filter((section) => section.scope !== "shell");
    const selectedOperatorSections = operatorSections.filter((section) => section.group === activeGroup);
    const renderedSections: RenderedSection[] = [];

    if (shellSections.length > 0) {
      const shellAccordion = buildSectionAccordion(shellSections, renderedSections);
      container.append(
        buildInspectorRail(
          "Workspace",
          "Document, export, playback, and source-default actions stay shell-level.",
          shellAccordion
        )
      );
      setupAccordion(shellAccordion);
    }

    if (operatorSections.length > 0) {
      const operatorAccordion = buildSectionAccordion([], renderedSections);
      const operatorList = operatorAccordion.querySelector(".bf-accordion-list");
      operatorList?.append(buildOperatorSelectorEl());

      for (const section of selectedOperatorSections) {
        const element = section.factory();
        element.dataset.sectionKey = section.key;
        operatorList?.append(element);
        renderedSections.push({ section, element });
      }

      container.append(
        buildInspectorRail(
          "Parameters",
          activeGroup === OVERLAY_LAYOUT_OPERATOR_SELECTION_ID
            ? "Overlay Layout is selected. Only the overlay-layout parameter surface is shown here."
            : "Only the selected saved background operator surface is shown here.",
          operatorAccordion
        )
      );
      setupAccordion(operatorAccordion);
    }

    initRangeControls({ root: container });

    let restoredSection = false;
    if (shouldAutoOpenNextOperatorSection) {
      if (previouslyOpenKey && selectedOperatorSections.some((section) => section.key === previouslyOpenKey)) {
        const targetGroup = findRenderedSection(renderedSections, previouslyOpenKey);
        restoredSection = openAccordionSection(targetGroup);
      }

      if (!restoredSection) {
        const firstOperatorSection = findRenderedSection(renderedSections, selectedOperatorSections[0]?.key ?? null);
        restoredSection = openAccordionSection(firstOperatorSection);
      }
    } else if (previouslyOpenKey) {
      const targetGroup = findRenderedSection(renderedSections, previouslyOpenKey);
      restoredSection = openAccordionSection(targetGroup);
    }

    shouldAutoOpenNextOperatorSection = false;

    const activeSections = [...shellSections, ...selectedOperatorSections];
    for (const section of activeSections) {
      section.afterRender?.();
    }
  }

  return {
    buildConfigEditor
  };
}