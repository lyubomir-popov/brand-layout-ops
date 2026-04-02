import { initPanelDrawers, initResizableAsides } from "baseline-foundry";

import {
  renderDocumentWorkspaceUi,
  type DocumentWorkspaceController
} from "./document-workspace.js";
import type {
  GuideMode,
  OverlayPreviewDocument,
  PreviewState
} from "./preview-app-context.js";
import type { SourceDefaultController } from "./source-default-controller.js";

const GUIDE_MODES: readonly GuideMode[] = ["off", "composition", "baseline"];

export interface PreviewShellControllerDeps {
  readonly state: PreviewState;
  readonly untitledName: string;
  readonly guideModeStorageKey: string;
  readonly documentWorkspace: DocumentWorkspaceController<OverlayPreviewDocument>;
  readonly sourceDefaultController: SourceDefaultController;
  markDocumentDirty(): void;
  loadLogoIntrinsicDimensions(assetPath: string): Promise<void>;
  buildConfigEditor(): void;
  buildOutputProfileOptions(): void;
  renderStage(): Promise<void>;
  resizeRenderer(): void;
  togglePlayback(): void;
  ensurePlaybackLoop(): void;
  addDocumentTarget(): boolean;
  removeActiveDocumentTarget(): boolean;
  exportComposedFramePng(): Promise<void>;
  exportPngSequence(): Promise<void>;
  initHaloRenderer(): void;
  initAuthoring(): void;
  handleAuthoringEditingKeyDown(event: KeyboardEvent): boolean;
  handleAuthoringInteractionKeyDown(event: KeyboardEvent): boolean;
}

export interface PreviewShellController {
  updateDocumentUi(): void;
  init(): Promise<void>;
}

export function createPreviewShellController(
  deps: PreviewShellControllerDeps
): PreviewShellController {
  let destroyResizableAsides: (() => void) | null = null;
  let hasBoundDocumentInputs = false;
  let hasBoundResize = false;
  let isInitialized = false;

  const $ = <T extends Element>(selector: string): T | null => document.querySelector<T>(selector);

  function getConfigEditor(): HTMLElement | null {
    return $("[data-config-editor]");
  }

  function getAppShellEl(): HTMLElement | null {
    return document.querySelector<HTMLElement>(".bf-application");
  }

  function getControlPanelEl(): HTMLElement | null {
    return $("[data-control-panel]");
  }

  function getControlPanelToggleEl(): HTMLElement | null {
    return $("[data-control-panel-toggle]");
  }

  function getControlPanelOverlayEl(): HTMLElement | null {
    return document.querySelector<HTMLElement>(".bf-application-overlay");
  }

  function getDocumentNameInput(): HTMLInputElement | null {
    return $("[data-document-name-input]");
  }

  function getDocumentSummaryEl(): HTMLElement | null {
    return $("[data-document-summary]");
  }

  function getDocumentStatusEl(): HTMLElement | null {
    return $("[data-document-status]");
  }

  function getDocumentRecentListEl(): HTMLElement | null {
    return $("[data-document-recent-list]");
  }

  function getFileToolbarEl(): HTMLElement | null {
    return $("[data-file-toolbar]");
  }

  function getDocumentToolbarEl(): HTMLElement | null {
    return $("[data-document-toolbar]");
  }

  function getSourceDefaultToolbarEl(): HTMLElement | null {
    return $("[data-source-default-toolbar]");
  }

  function getExportToolbarEl(): HTMLElement | null {
    return $("[data-export-toolbar]");
  }

  function getPlaybackToolbarEl(): HTMLElement | null {
    return $("[data-playback-toolbar]");
  }

  function createToolbarButton(
    label: string,
    options: {
      primary?: boolean;
      dataAttribute?: string;
      onClick: (button: HTMLButtonElement) => void | Promise<void>;
      onError?: (error: unknown) => void;
    }
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = options.primary ? "bf-button is-dense" : "bf-button is-base is-dense";
    button.textContent = label;
    if (options.dataAttribute) {
      button.setAttribute(options.dataAttribute, "");
    }
    button.addEventListener("click", () => {
      Promise.resolve(options.onClick(button)).catch((error: unknown) => {
        options.onError?.(error);
      });
    });
    return button;
  }

  function refreshResizableAsidesRuntime(): void {
    destroyResizableAsides?.();
    destroyResizableAsides = initResizableAsides();
  }

  function isDockedViewport(): boolean {
    return window.innerWidth >= 1200;
  }

  function updateDocumentUi(): void {
    renderDocumentWorkspaceUi({
      workspace: deps.documentWorkspace.state,
      untitledName: deps.untitledName,
      elements: {
        nameInput: getDocumentNameInput(),
        summaryEl: getDocumentSummaryEl(),
        statusEl: getDocumentStatusEl(),
        recentListEl: getDocumentRecentListEl()
      },
      actions: {
        reopenRecentDocument: (recentDocumentId) => deps.documentWorkspace.openRecentDocument(recentDocumentId),
        forgetRecentDocument: (recentDocumentId) => deps.documentWorkspace.forgetRecentDocument(recentDocumentId)
      }
    });
  }

  function buildFileToolbar(): void {
    const toolbar = getFileToolbarEl();
    if (!toolbar) {
      return;
    }

    toolbar.innerHTML = "";

    const specs: Array<{ label: string; primary?: boolean; onClick: () => void | Promise<void> }> = [
      { label: "New", onClick: () => deps.documentWorkspace.createNewDocument() },
      { label: "Open", onClick: () => deps.documentWorkspace.openDocumentFromDisk() },
      { label: "Save", primary: true, onClick: async () => { await deps.documentWorkspace.saveCurrentDocument(false); } },
      { label: "Save As", onClick: async () => { await deps.documentWorkspace.saveCurrentDocument(true); } },
      { label: "Duplicate", onClick: () => deps.documentWorkspace.duplicateCurrentDocument() }
    ];

    for (const spec of specs) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = spec.primary ? "bf-button is-dense" : "bf-button is-base is-dense";
      button.textContent = spec.label;
      button.addEventListener("click", () => {
        Promise.resolve(spec.onClick()).catch((error: unknown) => {
          console.error(`[file-toolbar] ${spec.label} failed:`, error);
          deps.documentWorkspace.setStatus(
            `${spec.label} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            "error"
          );
        });
      });
      toolbar.append(button);
    }
  }

  function buildDocumentToolbar(): void {
    const toolbar = getDocumentToolbarEl();
    if (!toolbar) {
      return;
    }

    toolbar.innerHTML = "";
    toolbar.append(
      createToolbarButton("Add Size", {
        primary: true,
        onClick: () => {
          if (!deps.addDocumentTarget()) {
            return;
          }

          deps.markDocumentDirty();
          deps.buildOutputProfileOptions();
          deps.buildConfigEditor();
          void deps.renderStage();
        }
      }),
      createToolbarButton("Remove Size", {
        onClick: () => {
          if (!deps.removeActiveDocumentTarget()) {
            return;
          }

          deps.markDocumentDirty();
          deps.buildOutputProfileOptions();
          deps.buildConfigEditor();
          void deps.renderStage();
        }
      })
    );
  }

  function buildSourceDefaultToolbar(): void {
    const toolbar = getSourceDefaultToolbarEl();
    if (!toolbar) {
      return;
    }

    toolbar.innerHTML = "";
    toolbar.append(
      createToolbarButton("Reset", {
        onClick: () => {
          deps.sourceDefaultController.applySourceDefaultSnapshot(deps.state.sourceDefaults);
          deps.markDocumentDirty();
          deps.state.playbackTimeSec = 0;
          deps.resizeRenderer();
          deps.buildOutputProfileOptions();
          deps.buildConfigEditor();
          deps.sourceDefaultController.setSourceDefaultStatus("Reset to source default.");
          void deps.renderStage();
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Source default reset failed.";
          deps.sourceDefaultController.setSourceDefaultStatus(`Source default reset failed: ${message}`, "error");
        }
      }),
      createToolbarButton("Save as Default", {
        onClick: async (button) => {
          button.disabled = true;
          deps.sourceDefaultController.setSourceDefaultStatus("Saving source default...");
          try {
            const result = await deps.sourceDefaultController.writeCurrentAsSourceDefault();
            deps.sourceDefaultController.setSourceDefaultStatus(result.message, "success");
          } finally {
            button.disabled = false;
          }
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Source default save failed.";
          deps.sourceDefaultController.setSourceDefaultStatus(`Source default save failed: ${message}`, "error");
        }
      })
    );
  }

  function buildExportToolbar(): void {
    const toolbar = getExportToolbarEl();
    if (!toolbar) {
      return;
    }

    toolbar.innerHTML = "";
    toolbar.append(
      createToolbarButton("Export PNG", {
        onClick: () => deps.exportComposedFramePng(),
        onError: (error) => {
          console.error("[export-toolbar] Export PNG failed:", error);
        }
      }),
      createToolbarButton("Export Sequence", {
        onClick: () => deps.exportPngSequence(),
        onError: (error) => {
          console.error("[export-toolbar] Export Sequence failed:", error);
        }
      })
    );
  }

  function buildPlaybackToolbar(): void {
    const toolbar = getPlaybackToolbarEl();
    if (!toolbar) {
      return;
    }

    toolbar.innerHTML = "";
    toolbar.append(
      createToolbarButton(deps.state.isPlaying ? "Pause Motion" : "Play Motion", {
        primary: true,
        dataAttribute: "data-playback-toggle",
        onClick: () => {
          deps.togglePlayback();
        }
      })
    );
  }

  function buildShellChrome(): void {
    buildFileToolbar();
    buildDocumentToolbar();
    buildSourceDefaultToolbar();
    buildExportToolbar();
    buildPlaybackToolbar();
  }

  function isControlPanelOpen(): boolean {
    const aside = getControlPanelEl();
    if (!aside) {
      return false;
    }

    if (isDockedViewport()) {
      return aside.classList.contains("is-pinned") && !aside.classList.contains("is-collapsed");
    }

    return aside.classList.contains("is-open") && aside.getAttribute("aria-hidden") !== "true";
  }

  function setDrawerOpen(isOpen: boolean): void {
    const appShell = getAppShellEl();
    const aside = getControlPanelEl();
    const overlay = getControlPanelOverlayEl();
    const toggle = getControlPanelToggleEl();
    if (!aside) {
      return;
    }

    const isDocked = isDockedViewport();
    toggle?.setAttribute("aria-expanded", String(!isDocked && isOpen));

    if (isDocked) {
      appShell?.classList.remove("is-drawer-expanded");
      appShell?.classList.toggle("has-pinned-aside", isOpen);
      overlay?.setAttribute("aria-hidden", "true");
      aside.classList.remove("is-overlay", "is-drawer", "is-medium", "is-open");
      aside.classList.toggle("is-pinned", isOpen);
      aside.classList.toggle("is-collapsed", !isOpen);
      aside.setAttribute("aria-hidden", String(!isOpen));
      refreshResizableAsidesRuntime();
      return;
    }

    appShell?.classList.remove("has-pinned-aside");
    aside.classList.remove("is-collapsed", "is-pinned");
    aside.classList.add("is-overlay", "is-medium");
    aside.classList.toggle("is-open", isOpen);
    aside.setAttribute("aria-hidden", String(!isOpen));
    appShell?.classList.toggle("is-drawer-expanded", isOpen);
    overlay?.setAttribute("aria-hidden", String(!isOpen));
    refreshResizableAsidesRuntime();
  }

  function cycleGuideMode(): void {
    const idx = GUIDE_MODES.indexOf(deps.state.guideMode);
    deps.state.guideMode = GUIDE_MODES[(idx + 1) % GUIDE_MODES.length];
    try {
      localStorage.setItem(deps.guideModeStorageKey, deps.state.guideMode);
    } catch {
      // Ignore storage quota errors.
    }
    deps.buildConfigEditor();
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (deps.handleAuthoringEditingKeyDown(event)) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.altKey && (event.key === "s" || event.key === "S")) {
      event.preventDefault();
      void (async () => {
        try {
          const result = await deps.sourceDefaultController.writeCurrentAsSourceDefault();
          deps.sourceDefaultController.setSourceDefaultStatus(result.message, "success");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Source default save failed.";
          deps.sourceDefaultController.setSourceDefaultStatus(`Source default save failed: ${message}`, "error");
        }
      })();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && !event.altKey && (event.key === "n" || event.key === "N")) {
      event.preventDefault();
      deps.documentWorkspace.createNewDocument();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && !event.altKey && (event.key === "o" || event.key === "O")) {
      event.preventDefault();
      void deps.documentWorkspace.openDocumentFromDisk();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && (event.key === "s" || event.key === "S")) {
      event.preventDefault();
      if (event.shiftKey) {
        void deps.documentWorkspace.saveCurrentDocument(true);
        return;
      }

      void deps.documentWorkspace.saveCurrentDocument(false);
      return;
    }

    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      if (event.key === "Escape") {
        (event.target as HTMLElement).blur();
        event.preventDefault();
      }
      return;
    }

    if (!event.ctrlKey && !event.metaKey && !event.altKey && (event.key === "p" || event.key === "P")) {
      setDrawerOpen(!isControlPanelOpen());
      event.preventDefault();
      return;
    }

    if (event.key === "g" || event.key === "G" || event.key === "w" || event.key === "W") {
      cycleGuideMode();
      void deps.renderStage();
      return;
    }

    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      deps.togglePlayback();
      return;
    }

    if (event.key === "Escape") {
      if (!isDockedViewport() && isControlPanelOpen()) {
        setDrawerOpen(false);
        event.preventDefault();
        return;
      }

      if (deps.handleAuthoringInteractionKeyDown(event)) {
        return;
      }
    }
  }

  function setupButtons(): void {
    if (hasBoundDocumentInputs) {
      return;
    }

    const configEditor = getConfigEditor();
    if (!configEditor) {
      return;
    }

    const trackDocumentInput = (event: Event): void => {
      const target = event.target;
      if (
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLTextAreaElement) &&
        !(target instanceof HTMLSelectElement)
      ) {
        return;
      }

      if (target instanceof HTMLInputElement && target.type === "file") {
        return;
      }

      if (target instanceof HTMLInputElement && target.hasAttribute("data-document-name-input")) {
        deps.documentWorkspace.setName(target.value);
        return;
      }

      deps.markDocumentDirty();
    };

    configEditor.addEventListener("input", trackDocumentInput);
    configEditor.addEventListener("change", trackDocumentInput);
    hasBoundDocumentInputs = true;
  }

  function setupResize(): void {
    if (hasBoundResize) {
      return;
    }

    let hasInitializedDockMode = false;
    let lastDockedState: boolean | null = null;

    function checkDock(): void {
      const isDocked = isDockedViewport();
      if (hasInitializedDockMode && lastDockedState === isDocked) {
        return;
      }

      const desiredOpen = hasInitializedDockMode
        ? (isDocked ? true : isControlPanelOpen())
        : isDocked;
      setDrawerOpen(desiredOpen);
      lastDockedState = isDocked;
      hasInitializedDockMode = true;
    }

    checkDock();
    window.addEventListener("resize", checkDock);
    hasBoundResize = true;
  }

  async function init(): Promise<void> {
    if (isInitialized) {
      return;
    }

    isInitialized = true;

    deps.sourceDefaultController.setSourceDefaultStatus("Loading source default...");
    {
      const sourceDefaultDocument = await deps.sourceDefaultController.readSourceDefaultSnapshot();
      deps.sourceDefaultController.applySourceDefaultSnapshot(
        sourceDefaultDocument.snapshot,
        sourceDefaultDocument.project
      );
    }

    deps.state.playbackTimeSec = 0;
    deps.initHaloRenderer();
    await deps.documentWorkspace.refreshRecentDocuments();

    const logoPath = deps.state.params.logo?.assetPath;
    if (logoPath) {
      await deps.loadLogoIntrinsicDimensions(logoPath);
    }

    buildShellChrome();
    deps.buildConfigEditor();

    initPanelDrawers();
    setupButtons();
    setupResize();
    deps.initAuthoring();

    window.addEventListener("keydown", handleKeyDown);

    void deps.renderStage();
    deps.ensurePlaybackLoop();
    deps.sourceDefaultController.setSourceDefaultStatus("Source default ready.");
  }

  return {
    updateDocumentUi,
    init
  };
}