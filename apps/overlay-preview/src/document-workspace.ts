import {
  createSuggestedDocumentFileName,
  DOCUMENT_FILE_EXTENSION,
  forgetRecentDocument as forgetStoredRecentDocument,
  loadRecentDocumentRecord,
  loadRecentDocumentSummaries,
  pickDocumentFileToOpen,
  pickDocumentFileToSave,
  readDocumentFileText,
  rememberRecentDocument,
  supportsLocalDocumentFiles,
  writeDocumentFileText,
  type RecentDocumentSummary
} from "./document-storage.js";

export type DocumentStatusTone = "neutral" | "success" | "error";

export interface DocumentWorkspaceState {
  name: string;
  fileHandle: FileSystemFileHandle | null;
  fileName: string | null;
  recentDocumentId: string | null;
  recentDocuments: RecentDocumentSummary[];
  createdAt: string;
  updatedAt: string | null;
  isDirty: boolean;
  statusMessage: string;
  statusTone: DocumentStatusTone;
}

export interface DocumentWorkspaceMetadata {
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentWorkspaceUiElements {
  nameInput: HTMLInputElement | null;
  summaryEl: HTMLElement | null;
  statusEl: HTMLElement | null;
  recentListEl: HTMLElement | null;
}

export interface DocumentWorkspaceUiActions {
  reopenRecentDocument: (recentDocumentId: string) => void | Promise<void>;
  forgetRecentDocument: (recentDocumentId: string) => void | Promise<void>;
}

export interface CreateDocumentWorkspaceControllerOptions<TDocument> {
  untitledName: string;
  initialStatusMessage: string;
  parseDocument: (rawDocument: unknown) => TDocument | null;
  getDocumentMetadata: (document: TDocument) => DocumentWorkspaceMetadata;
  buildPersistedDocument: (metadata: DocumentWorkspaceMetadata) => unknown;
  applyDocument: (document: TDocument) => Promise<void>;
  applyNewDocumentState: () => Promise<void>;
  onWorkspaceChange?: () => void;
  confirmDiscardChanges?: (workspace: DocumentWorkspaceState) => boolean;
}

export interface DocumentWorkspaceController<TDocument> {
  state: DocumentWorkspaceState;
  getNormalizedName: (rawName?: string) => string;
  setStatus: (message: string, tone?: DocumentStatusTone) => void;
  markDirty: () => void;
  resetDirty: () => void;
  setName: (rawName: string) => void;
  refreshRecentDocuments: () => Promise<void>;
  forgetRecentDocument: (recentDocumentId: string) => Promise<void>;
  openRecentDocument: (recentDocumentId: string) => Promise<void>;
  createNewDocument: () => Promise<void>;
  openDocumentFromDisk: () => Promise<void>;
  saveCurrentDocument: (forceSaveAs?: boolean, nameOverride?: string) => Promise<boolean>;
  duplicateCurrentDocument: () => Promise<void>;
}

type SelectedDocumentResult<TDocument> =
  | { kind: "success"; document: TDocument; fileHandle: FileSystemFileHandle | null; fileName: string }
  | { kind: "cancelled" }
  | { kind: "invalid" };

function createInitialDocumentWorkspaceState(
  untitledName: string,
  initialStatusMessage: string
): DocumentWorkspaceState {
  return {
    name: untitledName,
    fileHandle: null,
    fileName: null,
    recentDocumentId: null,
    recentDocuments: [],
    createdAt: new Date().toISOString(),
    updatedAt: null,
    isDirty: false,
    statusMessage: initialStatusMessage,
    statusTone: "neutral"
  };
}

function normalizeDocumentName(rawName: string, untitledName: string): string {
  const trimmedName = rawName.trim();
  return trimmedName.length > 0 ? trimmedName : untitledName;
}

function confirmDiscardChanges(workspace: DocumentWorkspaceState): boolean {
  return !workspace.isDirty || window.confirm("Discard unsaved changes in the current document?");
}

function formatDocumentTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return "Unknown time";
  }

  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return timestamp;
  }

  return new Date(parsed).toLocaleString();
}

function downloadJsonFile(fileName: string, contents: string): void {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function promptForSingleDocumentFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = `application/json,.json,${DOCUMENT_FILE_EXTENSION}`;
    input.hidden = true;
    input.addEventListener("change", () => {
      const nextFile = input.files?.[0] ?? null;
      input.remove();
      resolve(nextFile);
    }, { once: true });
    document.body.append(input);
    input.click();
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function renderDocumentWorkspaceUi(args: {
  workspace: DocumentWorkspaceState;
  untitledName: string;
  elements: DocumentWorkspaceUiElements;
  actions: DocumentWorkspaceUiActions;
}): void {
  const { workspace, untitledName, elements, actions } = args;

  if (elements.summaryEl) {
    const locationLabel = workspace.fileName ? `Saved to ${workspace.fileName}` : "Not yet saved to a local file";
    const stateLabel = workspace.isDirty ? "Modified" : workspace.fileName ? "Saved" : "Unsaved";
    elements.summaryEl.textContent = `${normalizeDocumentName(workspace.name, untitledName)} • ${stateLabel} • ${locationLabel}`;
  }

  if (elements.statusEl) {
    elements.statusEl.textContent = workspace.statusMessage;
    elements.statusEl.style.color = workspace.statusTone === "success"
      ? "#9ad47d"
      : workspace.statusTone === "error"
        ? "#ff8f8f"
        : "";
  }

  if (elements.nameInput && document.activeElement !== elements.nameInput) {
    const normalizedName = normalizeDocumentName(workspace.name, untitledName);
    if (elements.nameInput.value !== normalizedName) {
      elements.nameInput.value = normalizedName;
    }
  }

  if (!elements.recentListEl) {
    return;
  }

  elements.recentListEl.replaceChildren();

  if (workspace.recentDocuments.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "bf-form-help bf-u-no-margin--bottom";
    emptyState.textContent = supportsLocalDocumentFiles()
      ? "Recent local documents appear here after you save or reopen a file-backed project."
      : "Recent documents require the browser File System Access APIs.";
    elements.recentListEl.append(emptyState);
    return;
  }

  for (const summary of workspace.recentDocuments) {
    const item = document.createElement("div");
    item.className = "bf-field";

    const meta = document.createElement("p");
    meta.className = "bf-form-help bf-u-no-margin--bottom";
    meta.textContent = `${summary.fileName} • Last opened ${formatDocumentTimestamp(summary.lastOpenedAt)}`;

    const actionsEl = document.createElement("div");
    actionsEl.className = "bf-cluster is-tight-cluster";

    const reopenButton = document.createElement("button");
    reopenButton.type = "button";
    reopenButton.className = summary.id === workspace.recentDocumentId
      ? "bf-button is-dense"
      : "bf-button is-base is-dense";
    reopenButton.textContent = summary.name;
    reopenButton.addEventListener("click", () => {
      void actions.reopenRecentDocument(summary.id);
    });

    const forgetButton = document.createElement("button");
    forgetButton.type = "button";
    forgetButton.className = "bf-button is-base is-dense";
    forgetButton.textContent = "Forget";
    forgetButton.addEventListener("click", () => {
      void actions.forgetRecentDocument(summary.id);
    });

    actionsEl.append(reopenButton, forgetButton);
    item.append(meta, actionsEl);
    elements.recentListEl.append(item);
  }
}

export function createDocumentWorkspaceController<TDocument>(
  options: CreateDocumentWorkspaceControllerOptions<TDocument>
): DocumentWorkspaceController<TDocument> {
  const workspace = createInitialDocumentWorkspaceState(options.untitledName, options.initialStatusMessage);

  const notifyWorkspaceChanged = (): void => {
    options.onWorkspaceChange?.();
  };

  const getNormalizedName = (rawName: string = workspace.name): string => {
    return normalizeDocumentName(rawName, options.untitledName);
  };

  const setStatus = (message: string, tone: DocumentStatusTone = "neutral"): void => {
    workspace.statusMessage = message;
    workspace.statusTone = tone;
    notifyWorkspaceChanged();
  };

  const markDirty = (): void => {
    workspace.isDirty = true;
    notifyWorkspaceChanged();
  };

  const resetDirty = (): void => {
    workspace.isDirty = false;
    notifyWorkspaceChanged();
  };

  const setName = (rawName: string): void => {
    workspace.name = rawName;
    markDirty();
  };

  const refreshRecentDocuments = async (): Promise<void> => {
    try {
      workspace.recentDocuments = await loadRecentDocumentSummaries();
    } catch {
      workspace.recentDocuments = [];
    }

    notifyWorkspaceChanged();
  };

  const syncRecentDocumentSummary = (summary: RecentDocumentSummary | null): void => {
    workspace.recentDocumentId = summary?.id ?? null;
    if (!summary) {
      return;
    }

    workspace.fileName = summary.fileName;
    workspace.createdAt = summary.createdAt;
    workspace.updatedAt = summary.updatedAt;
  };

  const rememberCurrentDocumentHandle = async (
    fileHandle: FileSystemFileHandle,
    updatedAt: string,
    lastOpenedAt: string = updatedAt,
    preferredId: string | null = workspace.recentDocumentId
  ): Promise<void> => {
    try {
      const summary = await rememberRecentDocument({
        preferredId,
        handle: fileHandle,
        name: getNormalizedName(),
        createdAt: workspace.createdAt,
        updatedAt,
        lastOpenedAt
      });

      syncRecentDocumentSummary(summary);
    } catch {
      workspace.recentDocumentId = null;
    }

    await refreshRecentDocuments();
  };

  const forgetRecentDocument = async (recentDocumentId: string): Promise<void> => {
    await forgetStoredRecentDocument(recentDocumentId);
    if (workspace.recentDocumentId === recentDocumentId) {
      workspace.recentDocumentId = null;
    }
    await refreshRecentDocuments();
  };

  const readDocumentFromFileHandle = async (
    fileHandle: FileSystemFileHandle
  ): Promise<TDocument | null> => {
    try {
      return options.parseDocument(JSON.parse(await readDocumentFileText(fileHandle)) as unknown);
    } catch {
      return null;
    }
  };

  const readSelectedDocumentFromDisk = async (): Promise<SelectedDocumentResult<TDocument>> => {
    if (supportsLocalDocumentFiles()) {
      let fileHandle: FileSystemFileHandle | null = null;
      try {
        fileHandle = await pickDocumentFileToOpen();
      } catch (error) {
        if (isAbortError(error)) {
          return { kind: "cancelled" };
        }

        const file = await promptForSingleDocumentFile();
        if (!file) {
          setStatus(`Open picker failed: ${getErrorMessage(error)}`, "error");
          return { kind: "cancelled" };
        }

        try {
          const document = options.parseDocument(JSON.parse(await file.text()) as unknown);
          return document
            ? { kind: "success", document, fileHandle: null, fileName: file.name }
            : { kind: "invalid" };
        } catch {
          return { kind: "invalid" };
        }
      }

      if (!fileHandle) {
        return { kind: "cancelled" };
      }

      const document = await readDocumentFromFileHandle(fileHandle);
      return document
        ? { kind: "success", document, fileHandle, fileName: fileHandle.name }
        : { kind: "invalid" };
    }

    const file = await promptForSingleDocumentFile();
    if (!file) {
      return { kind: "cancelled" };
    }

    try {
      const document = options.parseDocument(JSON.parse(await file.text()) as unknown);
      return document
        ? { kind: "success", document, fileHandle: null, fileName: file.name }
        : { kind: "invalid" };
    } catch {
      return { kind: "invalid" };
    }
  };

  const applyWorkspaceDocumentMetadata = (
    document: TDocument,
    fileHandle: FileSystemFileHandle | null,
    fileName: string | null
  ): void => {
    const metadata = options.getDocumentMetadata(document);
    workspace.name = metadata.name;
    workspace.fileHandle = fileHandle;
    workspace.fileName = fileName ?? fileHandle?.name ?? null;
    workspace.createdAt = metadata.createdAt;
    workspace.updatedAt = metadata.updatedAt;
    workspace.isDirty = false;
  };

  const shouldDiscardChanges = (): boolean => {
    return options.confirmDiscardChanges?.(workspace) ?? confirmDiscardChanges(workspace);
  };

  const openRecentDocument = async (recentDocumentId: string): Promise<void> => {
    if (!shouldDiscardChanges()) {
      return;
    }

    const record = await loadRecentDocumentRecord(recentDocumentId);
    if (!record) {
      await forgetRecentDocument(recentDocumentId);
      setStatus("That recent document entry no longer exists.", "error");
      return;
    }

    const document = await readDocumentFromFileHandle(record.handle);
    if (!document) {
      await forgetRecentDocument(recentDocumentId);
      setStatus("Could not reopen that recent document. The stale entry was removed.", "error");
      return;
    }

    await options.applyDocument(document);
    applyWorkspaceDocumentMetadata(document, record.handle, record.fileName);
    await rememberCurrentDocumentHandle(
      record.handle,
      workspace.updatedAt ?? workspace.createdAt,
      new Date().toISOString(),
      record.id
    );
    setStatus(`Reopened ${record.fileName}.`, "success");
  };

  const createNewDocument = async (): Promise<void> => {
    if (!shouldDiscardChanges()) {
      return;
    }

    await options.applyNewDocumentState();

    workspace.name = options.untitledName;
    workspace.fileHandle = null;
    workspace.fileName = null;
    workspace.recentDocumentId = null;
    workspace.createdAt = new Date().toISOString();
    workspace.updatedAt = null;
    workspace.isDirty = false;
    setStatus("Started a new local document.", "success");
  };

  const openDocumentFromDisk = async (): Promise<void> => {
    if (!shouldDiscardChanges()) {
      return;
    }

    const selectedDocument = await readSelectedDocumentFromDisk();
    if (selectedDocument.kind === "cancelled") {
      return;
    }

    if (selectedDocument.kind === "invalid") {
      setStatus("Selected file is not a valid Brand Layout Ops document.", "error");
      return;
    }

    await options.applyDocument(selectedDocument.document);
    applyWorkspaceDocumentMetadata(selectedDocument.document, selectedDocument.fileHandle, selectedDocument.fileName);

    if (selectedDocument.fileHandle) {
      await rememberCurrentDocumentHandle(
        selectedDocument.fileHandle,
        workspace.updatedAt ?? workspace.createdAt,
        new Date().toISOString(),
        null
      );
    } else {
      workspace.recentDocumentId = null;
      notifyWorkspaceChanged();
    }

    setStatus(`Opened ${selectedDocument.fileName}.`, "success");
  };

  const saveCurrentDocument = async (forceSaveAs: boolean = false, nameOverride?: string): Promise<boolean> => {
    const nextDocumentName = getNormalizedName(nameOverride ?? workspace.name);
    const savedAt = new Date().toISOString();
    const persistedDocument = options.buildPersistedDocument({
      name: nextDocumentName,
      createdAt: workspace.createdAt || savedAt,
      updatedAt: savedAt
    });
    const serializedDocument = `${JSON.stringify(persistedDocument, null, 2)}\n`;

    let fileHandle = forceSaveAs ? null : workspace.fileHandle;
    let fileName = forceSaveAs ? null : workspace.fileName;
    let usedDownloadFallback = false;
    let pickerFallbackReason: string | null = null;

    if (!fileHandle && supportsLocalDocumentFiles()) {
      try {
        fileHandle = await pickDocumentFileToSave(createSuggestedDocumentFileName(nextDocumentName));
      } catch (error) {
        if (isAbortError(error)) {
          return false;
        }

        pickerFallbackReason = getErrorMessage(error);
      }
    }

    try {
      if (fileHandle) {
        await writeDocumentFileText(fileHandle, serializedDocument);
        fileName = fileHandle.name;
      } else {
        fileName = createSuggestedDocumentFileName(nextDocumentName);
        downloadJsonFile(fileName, serializedDocument);
        usedDownloadFallback = true;
      }
    } catch (error) {
      setStatus(`Document save failed: ${getErrorMessage(error)}`, "error");
      return false;
    }

    workspace.name = nextDocumentName;
    workspace.fileHandle = fileHandle;
    workspace.fileName = fileName;
    workspace.createdAt = workspace.createdAt || savedAt;
    workspace.updatedAt = savedAt;
    workspace.isDirty = false;

    if (fileHandle) {
      await rememberCurrentDocumentHandle(
        fileHandle,
        savedAt,
        savedAt,
        forceSaveAs ? null : workspace.recentDocumentId
      );
    } else {
      workspace.recentDocumentId = null;
      notifyWorkspaceChanged();
    }

    if (usedDownloadFallback && pickerFallbackReason) {
      setStatus(
        `Saved ${fileName ?? nextDocumentName} via browser download because the local file picker failed: ${pickerFallbackReason}`,
        "success"
      );
    } else {
      setStatus(`Saved ${fileName ?? nextDocumentName}.`, "success");
    }
    return true;
  };

  const duplicateCurrentDocument = async (): Promise<void> => {
    const normalizedBaseName = getNormalizedName(workspace.name);
    const duplicateName = normalizedBaseName.endsWith(" Copy")
      ? `${normalizedBaseName} 2`
      : `${normalizedBaseName} Copy`;
    const saved = await saveCurrentDocument(true, duplicateName);
    if (saved) {
      setStatus(`Duplicated as ${workspace.fileName ?? duplicateName}.`, "success");
    }
  };

  return {
    state: workspace,
    getNormalizedName,
    setStatus,
    markDirty,
    resetDirty,
    setName,
    refreshRecentDocuments,
    forgetRecentDocument,
    openRecentDocument,
    createNewDocument,
    openDocumentFromDisk,
    saveCurrentDocument,
    duplicateCurrentDocument
  };
}