import {
  createDefaultOverlayBackgroundGraph,
  extractOverlaySceneFamilyConfigsFromGraph,
  getOverlaySceneFamilyKeyForBackgroundOperator,
  type OverlayBackgroundNode,
  type OverlaySceneFamilyKey
} from "@brand-layout-ops/operator-overlay-layout";

import type { PreviewState } from "./preview-app-context.js";

export interface BackgroundGraphControllerOptions {
  readonly state: PreviewState;
}

export interface BackgroundGraphController {
  normalizeSelectedBackgroundNodeId(preferredNodeId?: string | null): string | null;
  setSelectedBackgroundNode(nodeId: string | null): boolean;
  getSelectedBackgroundNode(): OverlayBackgroundNode | null;
  getSelectedBackgroundNodeGroup(): OverlaySceneFamilyKey;
  updateSelectedBackgroundNode(updater: (node: OverlayBackgroundNode) => OverlayBackgroundNode): boolean;
  syncDocumentBackgroundGraph(): void;
  getSceneFamilyLabel(sceneFamilyKey: OverlaySceneFamilyKey): string;
}

export function createBackgroundGraphController(
  options: BackgroundGraphControllerOptions
): BackgroundGraphController {
  const { state } = options;

  function normalizeSelectedBackgroundNodeId(
    preferredNodeId: string | null = state.selectedBackgroundNodeId
  ): string | null {
    const activeNode = state.documentProject.backgroundGraph.nodes.find(
      (node) => node.id === state.documentProject.backgroundGraph.activeNodeId
    );
    const preferredNode = preferredNodeId
      ? state.documentProject.backgroundGraph.nodes.find((node) => node.id === preferredNodeId)
      : null;
    const nextSelectedNodeId = preferredNode?.id ?? activeNode?.id ?? state.documentProject.backgroundGraph.nodes[0]?.id ?? null;
    state.selectedBackgroundNodeId = nextSelectedNodeId;
    return nextSelectedNodeId;
  }

  function setSelectedBackgroundNode(nodeId: string | null): boolean {
    const previousNodeId = state.selectedBackgroundNodeId;
    normalizeSelectedBackgroundNodeId(nodeId);
    return state.selectedBackgroundNodeId !== previousNodeId;
  }

  function getSelectedBackgroundNode(): OverlayBackgroundNode | null {
    const selectedNodeId = normalizeSelectedBackgroundNodeId();
    if (!selectedNodeId) {
      return null;
    }

    return state.documentProject.backgroundGraph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  }

  function getSelectedBackgroundNodeGroup(): OverlaySceneFamilyKey {
    const selectedNode = getSelectedBackgroundNode();
    return selectedNode
      ? getOverlaySceneFamilyKeyForBackgroundOperator(selectedNode.operatorKey)
      : state.documentProject.sceneFamilyKey;
  }

  function updateSelectedBackgroundNode(
    updater: (node: OverlayBackgroundNode) => OverlayBackgroundNode
  ): boolean {
    const selectedNodeId = normalizeSelectedBackgroundNodeId();
    if (!selectedNodeId) {
      return false;
    }

    let didUpdate = false;
    const nextNodes = state.documentProject.backgroundGraph.nodes.map((node) => {
      if (node.id !== selectedNodeId) {
        return node;
      }

      const nextNode = updater(node);
      didUpdate = nextNode !== node;
      return nextNode;
    });

    if (!didUpdate) {
      return false;
    }

    state.documentProject = {
      ...state.documentProject,
      backgroundGraph: {
        ...state.documentProject.backgroundGraph,
        nodes: nextNodes
      }
    };
    normalizeSelectedBackgroundNodeId(selectedNodeId);
    return true;
  }

  function syncDocumentBackgroundGraph(): void {
    const snapshotConfigs = extractOverlaySceneFamilyConfigsFromGraph(
      state.documentProject.backgroundGraph,
      state.documentProject.sceneFamilyConfigs
    );
    state.documentProject = {
      ...state.documentProject,
      sceneFamilyConfigs: snapshotConfigs,
      backgroundGraph: createDefaultOverlayBackgroundGraph(
        state.documentProject.sceneFamilyKey,
        snapshotConfigs
      )
    };
    normalizeSelectedBackgroundNodeId(state.selectedBackgroundNodeId);
  }

  function getSceneFamilyLabel(sceneFamilyKey: OverlaySceneFamilyKey): string {
    return sceneFamilyKey
      .split("-")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  }

  return {
    normalizeSelectedBackgroundNodeId,
    setSelectedBackgroundNode,
    getSelectedBackgroundNode,
    getSelectedBackgroundNodeGroup,
    updateSelectedBackgroundNode,
    syncDocumentBackgroundGraph,
    getSceneFamilyLabel
  };
}