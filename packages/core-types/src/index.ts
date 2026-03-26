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
}

export interface LogoPlacement {
  id: string;
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
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

export interface OperatorDefinition<TParams = unknown> {
  key: string;
  version: string;
  inputs: OperatorPort[];
  outputs: OperatorPort[];
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