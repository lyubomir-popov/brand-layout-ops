import type { OperatorDefinition, OperatorGraph, PrototypeLibrary } from "@brand-layout-ops/core-types";
import { OperatorRegistry, evaluateGraph } from "@brand-layout-ops/graph-runtime";
import { copyToPointsOperator } from "../packages/operator-copy-to-points/src/index.js";
import { FUZZY_BOIDS_OPERATOR_KEY, fuzzyBoidsOperator } from "../packages/operator-fuzzy-boids/src/index.js";
import { phyllotaxisOperator } from "../packages/operator-phyllotaxis/src/index.js";

const PROTOTYPE_LIBRARY_OPERATOR_KEY = "demo.prototype-library";

const prototypeLibrary: PrototypeLibrary = {
  prototypes: [
    {
      id: "dot",
      kind: "mesh",
      source: "./assets/dot.glb"
    },
    {
      id: "spark",
      kind: "svg",
      source: "./assets/spark.svg"
    }
  ],
  detail: {}
};

const prototypeLibraryOperator: OperatorDefinition = {
  key: PROTOTYPE_LIBRARY_OPERATOR_KEY,
  version: "0.1.0",
  inputs: [],
  outputs: [
    {
      key: "prototypeLibrary",
      kind: "prototype-library",
      description: "Static prototype library used for boid instancing demo output."
    }
  ],
  run() {
    return {
      prototypeLibrary
    };
  }
};

const registry = new OperatorRegistry();
registry.register(phyllotaxisOperator);
registry.register(fuzzyBoidsOperator);
registry.register(copyToPointsOperator);
registry.register(prototypeLibraryOperator);

const graph: OperatorGraph = {
  nodes: [
    {
      id: "phyllotaxis",
      operatorKey: "operator.phyllotaxis",
      params: {
        numPoints: 48,
        radius: 180,
        radiusFalloff: 0.55,
        angleOffsetDeg: 0,
        origin: { x: 340, y: 260, z: 0 }
      }
    },
    {
      id: "fuzzy-boids",
      operatorKey: FUZZY_BOIDS_OPERATOR_KEY,
      params: {
        timeSeconds: 3.5,
        deltaTimeSeconds: 1 / 24,
        seed: 7,
        spawnRadiusPx: 160,
        staggerStartSeconds: 0.9,
        initialSpeedPxPerSecond: 72,
        initialSpeedJitter: 0.3,
        minSpeedPxPerSecond: 28,
        maxSpeedPxPerSecond: 140,
        maxAccelerationPxPerSecond2: 96,
        massMin: 0.8,
        massMax: 1.2,
        pscaleMin: 0.45,
        pscaleMax: 1.15,
        separationRadiusPx: 38,
        separationStrength: 0.42,
        alignmentRadiusPx: 92,
        alignmentStrength: 0.085,
        cohesionRadiusPx: 118,
        cohesionStrength: 0.06,
        centerPullStrength: 0.02,
        maxNeighbors: 14,
        bounds: {
          kind: "radial",
          radiusPx: 260,
          marginPx: 56,
          forcePxPerSecond2: 220
        },
        palette: [
          { r: 1, g: 0.88, b: 0.68, a: 1 },
          { r: 0.8, g: 0.91, b: 1, a: 1 },
          { r: 1, g: 0.98, b: 0.92, a: 0.95 }
        ],
        prototypeIds: ["dot", "spark", "dot"]
      }
    },
    {
      id: "prototype-library",
      operatorKey: PROTOTYPE_LIBRARY_OPERATOR_KEY,
      params: {}
    },
    {
      id: "copy-to-points",
      operatorKey: "operator.copy-to-points",
      params: {
        defaultPrototypeId: "dot",
        normalAttribute: "N"
      }
    }
  ],
  edges: [
    {
      fromNodeId: "phyllotaxis",
      fromPortKey: "pointField",
      toNodeId: "fuzzy-boids",
      toPortKey: "seedField"
    },
    {
      fromNodeId: "fuzzy-boids",
      fromPortKey: "pointField",
      toNodeId: "copy-to-points",
      toPortKey: "pointField"
    },
    {
      fromNodeId: "prototype-library",
      fromPortKey: "prototypeLibrary",
      toNodeId: "copy-to-points",
      toPortKey: "prototypeLibrary"
    }
  ]
};

const outputs = await evaluateGraph(graph, registry);
const boidField = outputs.get("fuzzy-boids")?.boidField;
const pointField = outputs.get("fuzzy-boids")?.pointField;
const instanceSet = outputs.get("copy-to-points")?.instanceSet;

if (!boidField || !pointField || !instanceSet) {
  throw new Error("Fuzzy boids demo did not produce the expected outputs.");
}

console.log(JSON.stringify({ boidField, pointField, instanceSet }, null, 2));