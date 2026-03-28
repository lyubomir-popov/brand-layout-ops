export interface FrameSize {
  widthPx: number;
  heightPx: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface ColorRgba {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// ---------------------------------------------------------------------------
// Output profiles
// ---------------------------------------------------------------------------

export interface OutputProfile {
  key: string;
  label: string;
  widthPx: number;
  heightPx: number;
  defaultFrameRate: number;
  kind: string;
  platforms: string;
  safeArea: SafeAreaInsets;
}

export const OUTPUT_PROFILE_ORDER: readonly string[] = [
  "landscape_1280x720",
  "instagram_1080x1350",
  "story_1080x1920",
  "screen_3840x2160",
  "tablet_2560x1600"
] as const;

export const OUTPUT_PROFILES: Readonly<Record<string, OutputProfile>> = {
  landscape_1280x720: {
    key: "landscape_1280x720",
    label: "1280\u00d7720 X LI",
    widthPx: 1280,
    heightPx: 720,
    defaultFrameRate: 24,
    kind: "social_landscape",
    platforms: "Twitter/X, Mastodon, LinkedIn",
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 }
  },
  instagram_1080x1350: {
    key: "instagram_1080x1350",
    label: "1080\u00d71350 4:5 IG",
    widthPx: 1080,
    heightPx: 1350,
    defaultFrameRate: 30,
    kind: "social_portrait",
    platforms: "Instagram",
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 }
  },
  story_1080x1920: {
    key: "story_1080x1920",
    label: "1080\u00d71920 9:16 IG Story",
    widthPx: 1080,
    heightPx: 1920,
    defaultFrameRate: 30,
    kind: "story",
    platforms: "Instagram Story",
    safeArea: { top: 250, right: 65, bottom: 250, left: 65 }
  },
  screen_3840x2160: {
    key: "screen_3840x2160",
    label: "3840\u00d72160",
    widthPx: 3840,
    heightPx: 2160,
    defaultFrameRate: 24,
    kind: "screen",
    platforms: "Screen",
    safeArea: { top: 24, right: 24, bottom: 24, left: 24 }
  },
  tablet_2560x1600: {
    key: "tablet_2560x1600",
    label: "2560\u00d71600",
    widthPx: 2560,
    heightPx: 1600,
    defaultFrameRate: 24,
    kind: "tablet",
    platforms: "Tablet",
    safeArea: { top: 250, right: 65, bottom: 250, left: 65 }
  }
};

export const DEFAULT_OUTPUT_PROFILE_KEY = "landscape_1280x720";

export function getOutputProfile(profileKey: string = DEFAULT_OUTPUT_PROFILE_KEY): OutputProfile {
  return OUTPUT_PROFILES[profileKey] ?? OUTPUT_PROFILES[DEFAULT_OUTPUT_PROFILE_KEY];
}

export function getOutputProfileMetrics(profileKey: string = DEFAULT_OUTPUT_PROFILE_KEY): OutputProfile & { aspectRatio: number; centerXPx: number; centerYPx: number } {
  const profile = getOutputProfile(profileKey);
  return {
    ...profile,
    aspectRatio: profile.widthPx / profile.heightPx,
    centerXPx: profile.widthPx * 0.5,
    centerYPx: profile.heightPx * 0.5
  };
}

// ---------------------------------------------------------------------------
// Overlay content formats
// ---------------------------------------------------------------------------

export interface OverlayContentFieldSpec {
  id: string;
  label: string;
  style: string;
  legacySlot: string | null;
  aliases: readonly string[];
}

export interface OverlayContentFormatSpec {
  key: string;
  label: string;
  fields: readonly OverlayContentFieldSpec[];
}

export const OVERLAY_CONTENT_FORMAT_ORDER: readonly string[] = [
  "generic_social",
  "speaker_highlight"
] as const;

export const OVERLAY_CONTENT_FORMATS: Readonly<Record<string, OverlayContentFormatSpec>> = {
  generic_social: {
    key: "generic_social",
    label: "Social Media Post - Generic",
    fields: [
      {
        id: "body_intro",
        label: "B Head",
        style: "b_head",
        legacySlot: "text_1",
        aliases: ["text_1", "headline", "kicker", "body_top"]
      },
      {
        id: "detail_primary",
        label: "Paragraph 1",
        style: "paragraph",
        legacySlot: "text_2",
        aliases: ["text_2", "footer_1", "date_line", "body_mid"]
      },
      {
        id: "detail_secondary",
        label: "Paragraph 2",
        style: "paragraph",
        legacySlot: "text_3",
        aliases: ["text_3", "footer_2", "summary", "body_bottom"]
      }
    ]
  },
  speaker_highlight: {
    key: "speaker_highlight",
    label: "Speaker Highlight",
    fields: [
      {
        id: "session_title",
        label: "Session Title",
        style: "b_head",
        legacySlot: "text_1",
        aliases: ["session_title", "title", "headline", "text_1"]
      },
      {
        id: "speaker_name",
        label: "Speaker Name",
        style: "paragraph",
        legacySlot: "text_2",
        aliases: ["speaker_name", "name", "speaker", "text_2"]
      },
      {
        id: "speaker_role",
        label: "Speaker Role",
        style: "paragraph",
        legacySlot: "text_3",
        aliases: ["speaker_role", "role", "speaker_title", "text_3"]
      }
    ]
  }
};

export function getOverlayContentFormatSpec(formatKey?: string): OverlayContentFormatSpec {
  const key = typeof formatKey === "string" ? formatKey : OVERLAY_CONTENT_FORMAT_ORDER[0];
  return OVERLAY_CONTENT_FORMATS[key] ?? OVERLAY_CONTENT_FORMATS[OVERLAY_CONTENT_FORMAT_ORDER[0]];
}

// ---------------------------------------------------------------------------
// Text style constants
// ---------------------------------------------------------------------------

export const LINKED_TITLE_BASE_FONT_SIZE_PX = 63;
export const LINKED_LOGO_BASE_WIDTH_PX = 63;
export const LINKED_LOGO_BASE_HEIGHT_PX = 108;

export interface GridSettings {
  baselineStepPx: number;
  rowCount: number;
  columnCount: number;
  marginTopBaselines: number;
  marginBottomBaselines: number;
  marginLeftBaselines: number;
  marginRightBaselines: number;
  marginSideBaselines?: number;
  rowGutterBaselines: number;
  columnGutterBaselines: number;
  fitWithinSafeArea: boolean;
}

export interface LayoutGridMetrics {
  baselineStepPx: number;
  rowCount: number;
  columnCount: number;
  leftMarginPx: number;
  rightMarginPx: number;
  topMarginPx: number;
  bottomMarginPx: number;
  rowGutterPx: number;
  columnGutterPx: number;
  rowHeightPx: number;
  columnWidthPx: number;
  layoutLeftPx: number;
  layoutTopPx: number;
  layoutRightPx: number;
  layoutBottomPx: number;
  contentLeftPx: number;
  contentTopPx: number;
  contentRightPx: number;
  contentBottomPx: number;
  columnKeylinePositionsPx: number[];
}

export interface TextStyleSpec {
  key: string;
  fontSizePx: number;
  lineHeightPx: number;
  fontWeight?: number;
}

export interface TextFieldPlacementSpec {
  id: string;
  contentFieldId?: string;
  styleKey: string;
  text: string;
  keylineIndex: number;
  rowIndex: number;
  offsetBaselines: number;
  columnSpan: number;
}

export interface TextMeasureResult {
  widthPx: number;
  ascentPx: number;
  descentPx: number;
}

export interface TextMeasurer {
  measureLine(text: string, style: TextStyleSpec): TextMeasureResult;
}

export interface LayoutBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ResolvedTextPlacement {
  id: string;
  styleKey: string;
  text: string;
  wrappedLines: string[];
  lineHeightPx: number;
  keylineIndex: number;
  rowIndex: number;
  offsetBaselines: number;
  columnSpan: number;
  anchorXPx: number;
  anchorBaselineYPx: number;
  maxWidthPx: number;
  bounds: LayoutBounds;
}

export interface LogoPlacementSpec {
  id?: string;
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
  assetPath?: string;
  linkTitleSizeToHeight?: boolean;
}

export interface LogoPlacement {
  id: string;
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
  assetPath?: string;
  linkTitleSizeToHeight?: boolean;
  bounds: LayoutBounds;
}

export interface LayerScene {
  grid: LayoutGridMetrics;
  texts: ResolvedTextPlacement[];
  logo?: LogoPlacement;
}

export interface PointRecord {
  id: string;
  position: Vector3;
  attributes: Record<string, unknown>;
}

export interface PointField {
  points: PointRecord[];
  detail: Record<string, unknown>;
}

export interface BoidRecord {
  id: string;
  position: Vector3;
  velocity: Vector3;
  accel: Vector3;
  mass: number;
  N: Vector3;
  up: Vector3;
  startTimeSeconds: number;
  attributes: Record<string, unknown>;
}

export interface BoidSimulationState {
  timeSeconds: number;
  deltaTimeSeconds: number;
  stepCount: number;
  activeBoidCount: number;
}

export interface BoidField {
  boids: BoidRecord[];
  simulation: BoidSimulationState;
  detail: Record<string, unknown>;
}

export interface PrototypeDefinition {
  id: string;
  kind: "mesh" | "svg" | "group" | "sprite" | "shape";
  source?: string;
  attributes?: Record<string, unknown>;
}

export interface PrototypeLibrary {
  prototypes: PrototypeDefinition[];
  detail: Record<string, unknown>;
}

export interface InstanceRecord {
  id: string;
  pointId: string;
  prototypeId: string;
  position: Vector3;
  rotationEuler: Vector3;
  scale: Vector3;
  pscale: number;
  normal: Vector3;
  up: Vector3;
  orient?: Quaternion;
  color?: ColorRgba;
  attributes: Record<string, unknown>;
}

export interface InstanceSet {
  prototypes: PrototypeDefinition[];
  instances: InstanceRecord[];
  detail: Record<string, unknown>;
}

export interface OperatorPort<TValue = unknown> {
  key: string;
  kind: string;
  description?: string;
  defaultValue?: TValue;
}

export interface OperatorParameterSectionSchema {
  key: string;
  title: string;
  description?: string;
}

interface OperatorParameterFieldSchemaBase {
  path: string;
  sectionKey: string;
  label: string;
  hint?: string;
}

export interface OperatorParameterNumberFieldSchema extends OperatorParameterFieldSchemaBase {
  kind: "number";
  min?: number;
  max?: number;
  step?: number;
}

export interface OperatorParameterBooleanFieldSchema extends OperatorParameterFieldSchemaBase {
  kind: "boolean";
}

export interface OperatorParameterSelectOptionSchema {
  label: string;
  value: string;
}

export interface OperatorParameterSelectFieldSchema extends OperatorParameterFieldSchemaBase {
  kind: "select";
  options: OperatorParameterSelectOptionSchema[];
}

export type OperatorParameterFieldSchema =
  | OperatorParameterNumberFieldSchema
  | OperatorParameterBooleanFieldSchema
  | OperatorParameterSelectFieldSchema;

export interface OperatorParameterSchema {
  sections: OperatorParameterSectionSchema[];
  fields: OperatorParameterFieldSchema[];
}

export interface OperatorDefinition<TParams = unknown> {
  key: string;
  version: string;
  inputs: OperatorPort[];
  outputs: OperatorPort[];
  parameterSchema?: OperatorParameterSchema;
  run(context: OperatorRunContext<TParams>): Promise<Record<string, unknown>> | Record<string, unknown>;
}

export interface OperatorRunContext<TParams = unknown> {
  params: TParams;
  inputs: Record<string, unknown>;
}

export interface GraphNode<TParams = unknown> {
  id: string;
  operatorKey: string;
  params: TParams;
}

export interface GraphEdge {
  fromNodeId: string;
  fromPortKey: string;
  toNodeId: string;
  toPortKey: string;
}

export interface OperatorGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}