import {
  DEFAULT_OUTPUT_PROFILE_KEY,
  getOutputProfile,
  OVERLAY_CONTENT_FORMATS,
  OVERLAY_CONTENT_FORMAT_ORDER,
  type OverlayContentFormatSpec,
  type FrameSize,
  type GridSettings,
  type LayerScene,
  type LayoutGridMetrics,
  type LogoPlacement,
  type LogoPlacementSpec,
  type OperatorDefinition,
  type OperatorParameterSchema,
  type SafeAreaInsets,
  type TextFieldPlacementSpec,
  type TextMeasurer,
  type TextStyleSpec
} from "@brand-layout-ops/core-types";
import { getLinkedLogoDimensionsPx, resolveLayerScene } from "@brand-layout-ops/layout-engine";
import {
  createApproximateTextMeasurer,
  getMinimumFirstBaselineInsetBaselines,
  type ApproximateTextMeasureOptions
} from "@brand-layout-ops/layout-text";

export const OVERLAY_LAYOUT_OPERATOR_KEY = "overlay.layout";

export type OverlayContentSource = "inline" | "csv";

export interface OverlayCsvContent {
  draft: string;
  rowIndex: number;
}

export interface OverlayCsvDraftTable {
  headers: string[];
  rows: string[][];
  hasUnterminatedQuote: boolean;
}

export interface OverlayCsvDraftSummary {
  headers: string[];
  rowCount: number;
  selectedRowIndex: number;
  selectedRowExists: boolean;
  selectedRowValues: Record<string, string>;
  missingFieldKeys: string[];
  hasUnterminatedQuote: boolean;
}

export interface OverlayLayoutOperatorParams {
  frame: FrameSize;
  safeArea: SafeAreaInsets;
  grid: GridSettings;
  textFields: TextFieldPlacementSpec[];
  textStyles: TextStyleSpec[];
  logo?: LogoPlacementSpec;
  contentSource?: OverlayContentSource;
  inlineTextByFieldId?: Record<string, string>;
  csvContent?: OverlayCsvContent;
}

export interface OverlayLayoutOperatorOutputs {
  scene: LayerScene;
  grid: LayoutGridMetrics;
  texts: LayerScene["texts"];
  logo?: LogoPlacement;
}

export interface CreateOverlayLayoutOperatorOptions {
  operatorKey?: string;
  textMeasureOptions?: ApproximateTextMeasureOptions;
}

export interface OverlayProfileTextStyleOverrides {
  title: { fontSizePx: number; lineHeightPx: number };
  b_head: { fontSizePx: number; lineHeightPx: number };
  paragraph: { fontSizePx: number; lineHeightPx: number };
}

export interface ContentFormatFieldOverride {
  style: string;
  keylineIndex: number;
  columnSpan: number;
  rowIndex: number;
  offsetBaselines: number;
  label: string;
}

export interface ContentFormatOverrides {
  csvPath: string;
  fields: Record<string, ContentFormatFieldOverride>;
}

export const DEFAULT_OVERLAY_TEXT_STYLES: TextStyleSpec[] = [
  {
    key: "title",
    fontSizePx: 42,
    lineHeightPx: 48,
    fontWeight: 200
  },
  {
    key: "b_head",
    fontSizePx: 24,
    lineHeightPx: 32,
    fontWeight: 400
  },
  {
    key: "paragraph",
    fontSizePx: 24,
    lineHeightPx: 32,
    fontWeight: 400
  }
];

export const OVERLAY_PROFILE_GRID_DEFAULTS: Record<string, GridSettings> = {
  landscape_1280x720: {
    baselineStepPx: 8,
    rowCount: 4,
    columnCount: 4,
    marginTopBaselines: 4,
    marginBottomBaselines: 4,
    marginLeftBaselines: 5,
    marginRightBaselines: 5,
    rowGutterBaselines: 4,
    columnGutterBaselines: 0,
    fitWithinSafeArea: true
  },
  instagram_1080x1350: {
    baselineStepPx: 8,
    rowCount: 8,
    columnCount: 4,
    marginTopBaselines: 5,
    marginBottomBaselines: 6,
    marginLeftBaselines: 6,
    marginRightBaselines: 6,
    rowGutterBaselines: 0,
    columnGutterBaselines: 0,
    fitWithinSafeArea: true
  },
  story_1080x1920: {
    baselineStepPx: 8,
    rowCount: 4,
    columnCount: 4,
    marginTopBaselines: 6,
    marginBottomBaselines: 9,
    marginLeftBaselines: 0,
    marginRightBaselines: 0,
    rowGutterBaselines: 0,
    columnGutterBaselines: 0,
    fitWithinSafeArea: true
  },
  screen_3840x2160: {
    baselineStepPx: 24,
    rowCount: 4,
    columnCount: 8,
    marginTopBaselines: 4,
    marginBottomBaselines: 4,
    marginLeftBaselines: 4,
    marginRightBaselines: 4,
    rowGutterBaselines: 0,
    columnGutterBaselines: 0,
    fitWithinSafeArea: false
  },
  tablet_2560x1600: {
    baselineStepPx: 8,
    rowCount: 4,
    columnCount: 4,
    marginTopBaselines: 0,
    marginBottomBaselines: 9,
    marginLeftBaselines: 0,
    marginRightBaselines: 0,
    rowGutterBaselines: 4,
    columnGutterBaselines: 4,
    fitWithinSafeArea: true
  }
};

export const OVERLAY_PROFILE_TEXT_STYLE_OVERRIDES: Record<string, OverlayProfileTextStyleOverrides> = {
  landscape_1280x720: {
    title: { fontSizePx: 42, lineHeightPx: 48 },
    b_head: { fontSizePx: 24, lineHeightPx: 32 },
    paragraph: { fontSizePx: 24, lineHeightPx: 32 }
  },
  instagram_1080x1350: {
    title: { fontSizePx: 63, lineHeightPx: 64 },
    b_head: { fontSizePx: 32, lineHeightPx: 36 },
    paragraph: { fontSizePx: 32, lineHeightPx: 36 }
  },
  story_1080x1920: {
    title: { fontSizePx: 63, lineHeightPx: 64 },
    b_head: { fontSizePx: 32, lineHeightPx: 36 },
    paragraph: { fontSizePx: 32, lineHeightPx: 36 }
  },
  screen_3840x2160: {
    title: { fontSizePx: 110, lineHeightPx: 112 },
    b_head: { fontSizePx: 55, lineHeightPx: 72 },
    paragraph: { fontSizePx: 32, lineHeightPx: 36 }
  },
  tablet_2560x1600: {
    title: { fontSizePx: 63, lineHeightPx: 64 },
    b_head: { fontSizePx: 32, lineHeightPx: 36 },
    paragraph: { fontSizePx: 32, lineHeightPx: 36 }
  }
};

export const OVERLAY_TEXT_STYLE_DISPLAY_LABELS: Record<string, string> = {
  title: "A Head",
  b_head: "B Head",
  paragraph: "P"
};

export const DEFAULT_OVERLAY_LOGO: LogoPlacementSpec = {
  id: "brand-mark",
  xPx: 41,
  yPx: 0,
  widthPx: 42,
  heightPx: 72,
  assetPath: "/assets/UbuntuTagLogo.svg"
};

export const DEFAULT_OVERLAY_FORMAT_OVERRIDES: Record<string, ContentFormatOverrides> = {
  generic_social: {
    csvPath: "./assets/content.csv",
    fields: {
      body_intro: {
        style: "b_head",
        keylineIndex: 3,
        columnSpan: 2,
        rowIndex: 1,
        offsetBaselines: 0,
        label: "B Head"
      },
      detail_primary: {
        style: "paragraph",
        keylineIndex: 2,
        columnSpan: 1,
        rowIndex: 4,
        offsetBaselines: 15,
        label: "Paragraph 1"
      },
      detail_secondary: {
        style: "paragraph",
        keylineIndex: 3,
        columnSpan: 1,
        rowIndex: 4,
        offsetBaselines: 15,
        label: "Paragraph 2"
      }
    }
  },
  speaker_highlight: {
    csvPath: "./assets/content-speaker-highlight.csv",
    fields: {
      session_title: {
        style: "b_head",
        keylineIndex: 3,
        columnSpan: 2,
        rowIndex: 6,
        offsetBaselines: 9,
        label: "Session Title"
      },
      speaker_name: {
        style: "paragraph",
        keylineIndex: 3,
        columnSpan: 2,
        rowIndex: 7,
        offsetBaselines: 4,
        label: "Speaker Name"
      },
      speaker_role: {
        style: "paragraph",
        keylineIndex: 3,
        columnSpan: 2,
        rowIndex: 7,
        offsetBaselines: 14,
        label: "Speaker Role"
      }
    }
  }
};

export const DEFAULT_OVERLAY_CSV_DRAFT = [
  "main_heading,text_1,text_2,text_3",
  '"Ubuntu\\nSummit\\n26.04","A showcase\\nfor the innovative\\nand the ambitious","May 27-28, 2026","Online"',
  '"Ubuntu\\nSummit\\n26.04","Kernel rebuild, now with actual reference defaults.","Parity audit","In progress"'
].join("\n");

export const SPEAKER_OVERLAY_CSV_DRAFT = [
  "session_title,speaker_name,speaker_role,speaker_photo",
  '"Developer ready Ubuntu on Qualcomm IoT","Ameya Pandit","Software Engineering Lead, Qualcomm","./assets/speaker_photos/ameya_pandit.jpg"'
].join("\n");

export const OVERLAY_LAYOUT_PARAMETER_SCHEMA: OperatorParameterSchema = {
  sections: [
    {
      key: "frame",
      title: "Frame",
      description: "Document-sized frame controls for overlay parity preview."
    },
    {
      key: "safeArea",
      title: "Safe Area"
    },
    {
      key: "grid",
      title: "Grid"
    },
    {
      key: "content",
      title: "Content",
      description: "Operator-side content source controls. The CSV staging surface remains preview-specific for now."
    }
  ],
  fields: [
    { kind: "number", sectionKey: "frame", path: "frame.widthPx", label: "Width", min: 320, step: 1 },
    { kind: "number", sectionKey: "frame", path: "frame.heightPx", label: "Height", min: 320, step: 1 },
    { kind: "number", sectionKey: "safeArea", path: "safeArea.top", label: "Top", min: 0, step: 1 },
    { kind: "number", sectionKey: "safeArea", path: "safeArea.right", label: "Right", min: 0, step: 1 },
    { kind: "number", sectionKey: "safeArea", path: "safeArea.bottom", label: "Bottom", min: 0, step: 1 },
    { kind: "number", sectionKey: "safeArea", path: "safeArea.left", label: "Left", min: 0, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.baselineStepPx", label: "Baseline step", min: 1, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.rowCount", label: "Rows", min: 1, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.columnCount", label: "Columns", min: 1, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.marginTopBaselines", label: "Top margin", min: 0, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.marginBottomBaselines", label: "Bottom margin", min: 0, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.marginLeftBaselines", label: "Left margin", min: 0, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.marginRightBaselines", label: "Right margin", min: 0, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.rowGutterBaselines", label: "Row gutter", min: 0, step: 1 },
    { kind: "number", sectionKey: "grid", path: "grid.columnGutterBaselines", label: "Column gutter", min: 0, step: 1 },
    { kind: "boolean", sectionKey: "grid", path: "grid.fitWithinSafeArea", label: "Fit within safe area" },
    {
      kind: "select",
      sectionKey: "content",
      path: "contentSource",
      label: "Source",
      options: [
        { label: "Inline", value: "inline" },
        { label: "CSV draft", value: "csv" }
      ]
    },
    { kind: "number", sectionKey: "content", path: "csvContent.rowIndex", label: "CSV row", min: 1, step: 1, hint: "Used only when CSV content source is active." }
  ]
};

export function getDefaultOverlayGridForProfile(profileKey: string): GridSettings {
  return {
    ...(OVERLAY_PROFILE_GRID_DEFAULTS[profileKey] ?? OVERLAY_PROFILE_GRID_DEFAULTS.landscape_1280x720)
  };
}

export function applyOverlayProfileTextStyleDefaults(
  baseTextStyles: TextStyleSpec[],
  profileKey: string
): TextStyleSpec[] {
  const overrides = OVERLAY_PROFILE_TEXT_STYLE_OVERRIDES[profileKey] ?? OVERLAY_PROFILE_TEXT_STYLE_OVERRIDES.landscape_1280x720;
  return baseTextStyles.map((style) => {
    const override = overrides[style.key as keyof OverlayProfileTextStyleOverrides];
    return override
      ? { ...style, fontSizePx: override.fontSizePx, lineHeightPx: override.lineHeightPx }
      : { ...style };
  });
}

export function getOverlayStyleDisplayLabel(styleKey: string): string {
  return OVERLAY_TEXT_STYLE_DISPLAY_LABELS[styleKey] ?? styleKey;
}

export function buildOverlayVariableItemLabel(styleKey: string, ordinal: number, total: number): string {
  const styleLabel = getOverlayStyleDisplayLabel(styleKey);
  return total > 1 ? `${styleLabel} ${ordinal}` : styleLabel;
}

export function getOverlayFieldDisplayLabel(
  params: Pick<OverlayLayoutOperatorParams, "textFields">,
  fieldId: string
): string {
  const field = params.textFields.find((candidate) => candidate.id === fieldId);
  if (!field) {
    return fieldId;
  }

  const sameStyleFields = params.textFields.filter((candidate) => candidate.styleKey === field.styleKey);
  const ordinal = sameStyleFields.findIndex((candidate) => candidate.id === field.id) + 1;
  return buildOverlayVariableItemLabel(field.styleKey, Math.max(1, ordinal), sameStyleFields.length);
}

function createLandscapeOverlayTextFields(): TextFieldPlacementSpec[] {
  return [
    {
      id: "main_heading",
      contentFieldId: "main_heading",
      styleKey: "title",
      text: "Ubuntu\nSummit\n26.04",
      keylineIndex: 2,
      rowIndex: 1,
      offsetBaselines: 0,
      columnSpan: 1
    },
    {
      id: "body_intro",
      contentFieldId: "text_1",
      styleKey: "b_head",
      text: "A showcase\nfor the innovative\nand the ambitious",
      keylineIndex: 3,
      rowIndex: 1,
      offsetBaselines: 0,
      columnSpan: 2
    },
    {
      id: "detail_primary",
      contentFieldId: "text_2",
      styleKey: "paragraph",
      text: "May 27-28, 2026",
      keylineIndex: 3,
      rowIndex: 1,
      offsetBaselines: 15,
      columnSpan: 1
    },
    {
      id: "detail_secondary",
      contentFieldId: "text_3",
      styleKey: "paragraph",
      text: "Online",
      keylineIndex: 3,
      rowIndex: 1,
      offsetBaselines: 15,
      columnSpan: 1
    }
  ];
}

export function buildTextFieldsForFormat(
  formatKey: string,
  overrides: Record<string, ContentFormatOverrides> = DEFAULT_OVERLAY_FORMAT_OVERRIDES,
  mainHeadingField?: TextFieldPlacementSpec
): TextFieldPlacementSpec[] {
  const formatSpec: OverlayContentFormatSpec =
    OVERLAY_CONTENT_FORMATS[formatKey] ?? OVERLAY_CONTENT_FORMATS[OVERLAY_CONTENT_FORMAT_ORDER[0]];
  const formatOverride = overrides[formatSpec.key];

  const fields: TextFieldPlacementSpec[] = [];

  if (mainHeadingField) {
    fields.push({ ...mainHeadingField });
  } else {
    fields.push({
      id: "main_heading",
      contentFieldId: "main_heading",
      styleKey: "title",
      text: "Ubuntu\nSummit\n26.04",
      keylineIndex: 2,
      rowIndex: 1,
      offsetBaselines: 0,
      columnSpan: 1
    });
  }

  for (const fieldSpec of formatSpec.fields) {
    const override = formatOverride?.fields[fieldSpec.id];
    fields.push({
      id: fieldSpec.id,
      contentFieldId: fieldSpec.id,
      styleKey: override?.style ?? fieldSpec.style,
      text: "",
      keylineIndex: override?.keylineIndex ?? 3,
      rowIndex: override?.rowIndex ?? 1,
      offsetBaselines: override?.offsetBaselines ?? 0,
      columnSpan: override?.columnSpan ?? 1
    });
  }

  return fields;
}

export function findCsvHeaderForField(
  headers: string[],
  fieldId: string,
  formatKey: string
): string | undefined {
  const formatSpec = OVERLAY_CONTENT_FORMATS[formatKey] ?? OVERLAY_CONTENT_FORMATS[OVERLAY_CONTENT_FORMAT_ORDER[0]];
  const fieldSpec = formatSpec.fields.find((field) => field.id === fieldId);
  const aliases = fieldSpec ? [fieldSpec.id, ...(fieldSpec.aliases ?? [])] : [fieldId];

  for (const alias of aliases) {
    const found = headers.find((header) => header === alias);
    if (found) {
      return found;
    }
  }

  const legacySlot = fieldSpec?.legacySlot;
  if (legacySlot) {
    const found = headers.find((header) => header === legacySlot);
    if (found) {
      return found;
    }
  }

  return undefined;
}

export function createDefaultOverlayParams(
  profileKey: string = DEFAULT_OUTPUT_PROFILE_KEY,
  formatKey: string = "generic_social"
): OverlayLayoutOperatorParams {
  const profile = getOutputProfile(profileKey);
  const textFields = buildTextFieldsForFormat(formatKey);
  const landscapeTextByContentField = new Map(
    createLandscapeOverlayTextFields().map((field) => [field.contentFieldId ?? field.id, field.text])
  );
  const formatSpec = OVERLAY_CONTENT_FORMATS[formatKey] ?? OVERLAY_CONTENT_FORMATS[OVERLAY_CONTENT_FORMAT_ORDER[0]];
  const inlineTextByFieldId: Record<string, string> = {};

  inlineTextByFieldId.main_heading = landscapeTextByContentField.get("main_heading") ?? "";
  for (const fieldSpec of formatSpec.fields) {
    const legacyText = fieldSpec.legacySlot ? landscapeTextByContentField.get(fieldSpec.legacySlot) : undefined;
    inlineTextByFieldId[fieldSpec.id] = legacyText ?? "";
  }

  return {
    frame: {
      widthPx: profile.widthPx,
      heightPx: profile.heightPx
    },
    safeArea: { ...profile.safeArea },
    grid: getDefaultOverlayGridForProfile(profileKey),
    textStyles: applyOverlayProfileTextStyleDefaults(DEFAULT_OVERLAY_TEXT_STYLES, profileKey),
    textFields: textFields.map((field) => ({ ...field })),
    logo: { ...DEFAULT_OVERLAY_LOGO },
    contentSource: "inline",
    inlineTextByFieldId,
    csvContent: {
      draft: formatKey === "speaker_highlight" ? SPEAKER_OVERLAY_CSV_DRAFT : DEFAULT_OVERLAY_CSV_DRAFT,
      rowIndex: 1
    }
  };
}

function normalizeContentSource(contentSource?: OverlayContentSource): OverlayContentSource {
  return contentSource === "csv" ? "csv" : "inline";
}

export function getOverlayFieldContentKey(field: TextFieldPlacementSpec): string {
  const contentFieldId = field.contentFieldId?.trim();
  return contentFieldId && contentFieldId.length > 0 ? contentFieldId : field.id;
}

export function parseCsvDraft(draft: string): OverlayCsvDraftTable {
  const safeDraft = String(draft || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!safeDraft.trim()) {
    return { headers: [], rows: [], hasUnterminatedQuote: false };
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < safeDraft.length; index += 1) {
    const character = safeDraft[index];
    const nextCharacter = safeDraft[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (character === "\n" && !inQuotes) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  row.push(cell);
  rows.push(row);

  while (rows.length > 0 && rows[rows.length - 1].every((value) => value === "")) {
    rows.pop();
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], hasUnterminatedQuote: inQuotes };
  }

  const [headers, ...dataRows] = rows;
  return {
    headers: headers.map((header) => String(header || "").trim()),
    rows: dataRows,
    hasUnterminatedQuote: inQuotes
  };
}

function serializeCsvCell(value: string): string {
  const safeValue = String(value || "");
  if (!/[",\n]/.test(safeValue)) {
    return safeValue;
  }

  return `"${safeValue.replace(/"/g, '""')}"`;
}

function serializeCsvDraft(table: OverlayCsvDraftTable): string {
  const rows = [table.headers, ...table.rows];
  return rows
    .map((row) => row.map((value) => serializeCsvCell(value)).join(","))
    .join("\n");
}

function ensureCsvColumn(table: OverlayCsvDraftTable, header: string): number {
  let headerIndex = table.headers.indexOf(header);
  if (headerIndex !== -1) {
    return headerIndex;
  }

  table.headers.push(header);
  for (const row of table.rows) {
    row.push("");
  }

  headerIndex = table.headers.length - 1;
  return headerIndex;
}

function ensureCsvRow(table: OverlayCsvDraftTable, rowIndex: number): string[] {
  while (table.rows.length <= rowIndex) {
    table.rows.push(Array.from({ length: table.headers.length }, () => ""));
  }

  const row = table.rows[rowIndex];
  while (row.length < table.headers.length) {
    row.push("");
  }
  return row;
}

function getInlineTextValue(params: OverlayLayoutOperatorParams, field: TextFieldPlacementSpec): string {
  const contentKey = getOverlayFieldContentKey(field);
  const directValue = params.inlineTextByFieldId?.[field.id];
  if (typeof directValue === "string") {
    return directValue;
  }

  const mappedValue = params.inlineTextByFieldId?.[contentKey];
  if (typeof mappedValue === "string") {
    return mappedValue;
  }

  return field.text;
}

function normalizeCsvLookupValue(value: string): string {
  return String(value || "").trim().toLowerCase();
}

function getOverlayFieldHeaderAliases(field: TextFieldPlacementSpec): string[] {
  const contentKey = getOverlayFieldContentKey(field);
  const aliases = new Set<string>([contentKey]);

  for (const formatSpec of Object.values(OVERLAY_CONTENT_FORMATS)) {
    const fieldSpec = formatSpec.fields.find((candidate) => {
      if (candidate.id === contentKey || candidate.legacySlot === contentKey) {
        return true;
      }

      return candidate.aliases.some((alias) => alias === contentKey);
    });

    if (!fieldSpec) {
      continue;
    }

    aliases.add(fieldSpec.id);
    if (fieldSpec.legacySlot) {
      aliases.add(fieldSpec.legacySlot);
    }
    for (const alias of fieldSpec.aliases) {
      aliases.add(alias);
    }
  }

  return Array.from(aliases).filter(Boolean);
}

function findCsvHeaderIndex(headers: string[], field: TextFieldPlacementSpec): number {
  const normalizedHeaderIndex = new Map<string, number>();

  headers.forEach((header, index) => {
    const normalizedHeader = normalizeCsvLookupValue(header);
    if (!normalizedHeaderIndex.has(normalizedHeader)) {
      normalizedHeaderIndex.set(normalizedHeader, index);
    }
  });

  for (const alias of getOverlayFieldHeaderAliases(field)) {
    const headerIndex = normalizedHeaderIndex.get(normalizeCsvLookupValue(alias));
    if (headerIndex !== undefined) {
      return headerIndex;
    }
  }

  return -1;
}

function getCsvTextValue(params: OverlayLayoutOperatorParams, field: TextFieldPlacementSpec): string {
  const table = parseCsvDraft(params.csvContent?.draft ?? "");
  const rowIndex = Math.max(1, Math.round(params.csvContent?.rowIndex ?? 1)) - 1;
  const headerIndex = findCsvHeaderIndex(table.headers, field);

  if (headerIndex === -1 || rowIndex < 0 || rowIndex >= table.rows.length) {
    return getInlineTextValue(params, field);
  }

  const row = table.rows[rowIndex];
  return row?.[headerIndex] ?? "";
}

export function resolveOverlayTextValue(params: OverlayLayoutOperatorParams, field: TextFieldPlacementSpec): string {
  return normalizeContentSource(params.contentSource) === "csv"
    ? getCsvTextValue(params, field)
    : getInlineTextValue(params, field);
}

export function resolveOverlayTextFields(params: OverlayLayoutOperatorParams): TextFieldPlacementSpec[] {
  return params.textFields.map((field) => ({
    ...field,
    text: resolveOverlayTextValue(params, field)
  }));
}

export function inspectOverlayCsvDraft(params: OverlayLayoutOperatorParams): OverlayCsvDraftSummary {
  const table = parseCsvDraft(params.csvContent?.draft ?? "");
  const selectedRowIndex = Math.max(1, Math.round(params.csvContent?.rowIndex ?? 1));
  const selectedRow = table.rows[selectedRowIndex - 1];
  const selectedRowValues: Record<string, string> = {};

  table.headers.forEach((header, index) => {
    if (!header) {
      return;
    }

    selectedRowValues[header] = selectedRow?.[index] ?? "";
  });

  const fieldKeys = Array.from(new Set(params.textFields.map((field) => getOverlayFieldContentKey(field))));

  return {
    headers: [...table.headers],
    rowCount: table.rows.length,
    selectedRowIndex,
    selectedRowExists: selectedRowIndex >= 1 && selectedRowIndex <= table.rows.length,
    selectedRowValues,
    missingFieldKeys: params.textFields
      .filter((field, index, fields) => fields.findIndex((candidate) => getOverlayFieldContentKey(candidate) === getOverlayFieldContentKey(field)) === index)
      .map((field) => getOverlayFieldContentKey(field))
      .filter((fieldKey) => {
        const matchingField = params.textFields.find((field) => getOverlayFieldContentKey(field) === fieldKey);
        return matchingField ? findCsvHeaderIndex(table.headers, matchingField) === -1 : !fieldKeys.includes(fieldKey);
      }),
    hasUnterminatedQuote: table.hasUnterminatedQuote
  };
}

export function setOverlayTextValue(
  params: OverlayLayoutOperatorParams,
  textFieldId: string,
  value: string
): OverlayLayoutOperatorParams {
  const field = params.textFields.find((candidate) => candidate.id === textFieldId);
  if (!field) {
    return params;
  }

  if (normalizeContentSource(params.contentSource) === "csv") {
    const table = parseCsvDraft(params.csvContent?.draft ?? "");
    const rowIndex = Math.max(1, Math.round(params.csvContent?.rowIndex ?? 1)) - 1;
    const matchedHeaderIndex = findCsvHeaderIndex(table.headers, field);
    const headerIndex = matchedHeaderIndex !== -1
      ? matchedHeaderIndex
      : ensureCsvColumn(table, getOverlayFieldContentKey(field));
    const row = ensureCsvRow(table, rowIndex);
    row[headerIndex] = value;

    return {
      ...params,
      csvContent: {
        draft: serializeCsvDraft(table),
        rowIndex: rowIndex + 1
      }
    };
  }

  const contentKey = getOverlayFieldContentKey(field);
  return {
    ...params,
    inlineTextByFieldId: {
      ...params.inlineTextByFieldId,
      [field.id]: value,
      [contentKey]: value
    }
  };
}

export function normalizeOverlayLinkedTitleLogoParams(
  params: OverlayLayoutOperatorParams
): OverlayLayoutOperatorParams {
  const titleStyle = params.textStyles.find((style) => style.key === "title");
  const logo = params.logo;
  if (!titleStyle || !logo || logo.widthPx <= 0 || logo.heightPx <= 0) {
    return params;
  }

  const aspectRatio = logo.widthPx / Math.max(1, logo.heightPx);
  const linkedDimensions = getLinkedLogoDimensionsPx(titleStyle.fontSizePx, aspectRatio);

  if (linkedDimensions.widthPx === logo.widthPx && linkedDimensions.heightPx === logo.heightPx) {
    return params;
  }

  return {
    ...params,
    logo: {
      ...logo,
      widthPx: linkedDimensions.widthPx,
      heightPx: linkedDimensions.heightPx
    }
  };
}

export function normalizeOverlayTextFieldOffsetBaselines(
  params: OverlayLayoutOperatorParams,
  field: TextFieldPlacementSpec,
  measurer: TextMeasurer
): TextFieldPlacementSpec {
  const style = params.textStyles.find((candidate) => candidate.key === field.styleKey);
  if (!style) {
    return field;
  }

  const minimumOffsetBaselines = getMinimumFirstBaselineInsetBaselines(
    params.grid.baselineStepPx,
    style,
    measurer
  );
  const nextOffsetBaselines = Math.max(Math.round(field.offsetBaselines), minimumOffsetBaselines);
  return nextOffsetBaselines === field.offsetBaselines
    ? field
    : { ...field, offsetBaselines: nextOffsetBaselines };
}

export function normalizeOverlayParamsForEditing(
  params: OverlayLayoutOperatorParams,
  measurer: TextMeasurer
): OverlayLayoutOperatorParams {
  const linkedParams = normalizeOverlayLinkedTitleLogoParams(params);
  let didChange = false;
  const textFields = linkedParams.textFields.map((field) => {
    const normalizedField = normalizeOverlayTextFieldOffsetBaselines(linkedParams, field, measurer);
    if (normalizedField !== field) {
      didChange = true;
    }
    return normalizedField;
  });

  if (didChange) {
    return { ...linkedParams, textFields };
  }

  return linkedParams;
}

export function resolveOverlayLayoutScene(
  params: OverlayLayoutOperatorParams,
  textMeasureOptions?: ApproximateTextMeasureOptions
): LayerScene {
  return resolveLayerScene({
    frame: params.frame,
    safeArea: params.safeArea,
    grid: params.grid,
    textFields: resolveOverlayTextFields(params),
    textStyles: params.textStyles,
    ...(params.logo ? { logo: params.logo } : {})
  }, createApproximateTextMeasurer(textMeasureOptions));
}

export function createOverlayLayoutOperator(
  options: CreateOverlayLayoutOperatorOptions = {}
): OperatorDefinition<OverlayLayoutOperatorParams> {
  return {
    key: options.operatorKey ?? OVERLAY_LAYOUT_OPERATOR_KEY,
    version: "0.1.0",
    inputs: [],
    parameterSchema: OVERLAY_LAYOUT_PARAMETER_SCHEMA,
    outputs: [
      {
        key: "scene",
        kind: "layer-scene",
        description: "Resolved overlay scene with guides, text placements, and optional logo placement."
      },
      {
        key: "grid",
        kind: "layout-grid-metrics",
        description: "Resolved baseline and column grid metrics for overlay composition."
      },
      {
        key: "texts",
        kind: "resolved-text-placement-list",
        description: "Resolved text placements derived from grid and style settings."
      },
      {
        key: "logo",
        kind: "logo-placement",
        description: "Optional resolved logo placement anchored to the layout origin."
      }
    ],
    run(context) {
      const scene = resolveOverlayLayoutScene(context.params, options.textMeasureOptions);

      return {
        scene,
        grid: scene.grid,
        texts: scene.texts,
        ...(scene.logo ? { logo: scene.logo } : {})
      } satisfies Record<string, unknown>;
    }
  };
}