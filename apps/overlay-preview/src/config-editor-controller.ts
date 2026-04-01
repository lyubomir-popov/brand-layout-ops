/**
 * config-editor-controller.ts — Inspector pane registration and rebuild.
 *
 * Owns the accordion section registry, the background-graph selector UI, and
 * the policy for rebuilding the split workspace/parameter rails.
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

import type { PreviewState } from "./preview-app-context.js";

export interface ConfigEditorControllerDeps {
  readonly state: PreviewState;
  readonly sectionDefinitions: ParameterSectionDefinition[];
  getConfigEditor(): HTMLElement | null;
  getSelectedBackgroundNodeGroup(): OverlaySceneFamilyKey;
  getSceneFamilyLabel(key: OverlaySceneFamilyKey): string;
  normalizeSelectedBackgroundNodeId(): string | null;
  setSelectedBackgroundNode(nodeId: string | null): boolean;
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
    section.className = "bf-accordion-group operator-selector";

    const heading = document.createElement("div");
    heading.className = "operator-selector__heading";

    const label = document.createElement("span");
    label.className = "bf-form-label";
    label.textContent = "Background Graph";
    heading.append(label);

    const help = document.createElement("p");
    help.className = "bf-form-help is-tight bf-u-no-margin--bottom operator-selector__help";
  help.textContent = "Output selects the rendered family. Saved nodes select which operator pane the inspector edits.";

    const outputSection = document.createElement("div");
    outputSection.className = "operator-selector__section";

    const outputLabel = document.createElement("div");
    outputLabel.className = "operator-selector__subheading";
    outputLabel.textContent = "Rendered Output";
    outputSection.append(outputLabel);

    const radioGroup = document.createElement("div");
    radioGroup.className = "operator-selector__options";

    for (const sceneFamilyKey of OVERLAY_SCENE_FAMILY_ORDER) {
      const radioLabel = document.createElement("label");
      radioLabel.className = "operator-selector__option";

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
    nodesSection.className = "operator-selector__section";

    const nodesLabel = document.createElement("div");
    nodesLabel.className = "operator-selector__subheading";
    nodesLabel.textContent = "Saved Nodes";
    nodesSection.append(nodesLabel);

    const nodeList = document.createElement("div");
    nodeList.className = "bf-choice-list bf-stack preview-stack--compact";
    const selectedBackgroundNodeId = deps.normalizeSelectedBackgroundNodeId();

    for (const node of state.documentProject.backgroundGraph.nodes) {
      const row = document.createElement("label");
      row.className = "bf-choice-row operator-selector__node";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "background-node-selector";
      radio.value = node.id;
      radio.checked = node.id === selectedBackgroundNodeId;
      radio.addEventListener("change", () => {
        if (!radio.checked || !deps.setSelectedBackgroundNode(node.id)) {
          return;
        }

        shouldAutoOpenNextOperatorSection = true;
        buildConfigEditor();
      });

      const copy = document.createElement("span");
      copy.className = "operator-selector__node-copy";

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
    const activeGroup = deps.getSelectedBackgroundNodeGroup();

    const shellSections = sections.filter((section) => section.scope === "shell");
    const operatorSections = sections.filter((section) => section.scope !== "shell");
    const overlayLayoutSections = operatorSections.filter((section) => !section.group);
    const backgroundSections = operatorSections.filter((section) => section.group === activeGroup);
    const renderedSections: RenderedSection[] = [];

    const accordion = document.createElement("aside");
    accordion.className = "bf-accordion";

    const list = document.createElement("ul");
    list.className = "bf-accordion-list";

    for (const section of shellSections) {
      const element = section.factory();
      element.dataset.sectionKey = section.key;
      list.append(element);
      renderedSections.push({ section, element });
    }

    if (overlayLayoutSections.length > 0 || backgroundSections.length > 0) {
      list.append(buildOperatorSelectorEl());
    }

    for (const section of overlayLayoutSections) {
      const element = section.factory();
      element.dataset.sectionKey = section.key;
      list.append(element);
      renderedSections.push({ section, element });
    }

    for (const section of backgroundSections) {
      const element = section.factory();
      element.dataset.sectionKey = section.key;
      list.append(element);
      renderedSections.push({ section, element });
    }

    accordion.append(list);
    container.append(accordion);
    setupAccordion(accordion);
    initRangeControls({ root: container });

    let restoredSection = false;
    if (shouldAutoOpenNextOperatorSection) {
      if (previouslyOpenKey && backgroundSections.some((section) => section.key === previouslyOpenKey)) {
        const targetGroup = findRenderedSection(renderedSections, previouslyOpenKey);
        restoredSection = openAccordionSection(targetGroup);
      }

      if (!restoredSection) {
        const firstOperatorSection = findRenderedSection(renderedSections, backgroundSections[0]?.key ?? null);
        restoredSection = openAccordionSection(firstOperatorSection);
      }
    } else if (previouslyOpenKey) {
      const targetGroup = findRenderedSection(renderedSections, previouslyOpenKey);
      restoredSection = openAccordionSection(targetGroup);
    }

    shouldAutoOpenNextOperatorSection = false;

    const activeSections = [...shellSections, ...overlayLayoutSections, ...backgroundSections];
    for (const section of activeSections) {
      section.afterRender?.();
    }
  }

  return {
    buildConfigEditor
  };
}