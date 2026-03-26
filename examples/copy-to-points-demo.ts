import type { PrototypeLibrary } from "../packages/core-types/src/index.js";
import { resolveCopyToPoints } from "../packages/operator-copy-to-points/src/index.js";
import { resolvePhyllotaxisField } from "../packages/operator-phyllotaxis/src/index.js";

const pointField = resolvePhyllotaxisField({
  numPoints: 8,
  radius: 240,
  radiusFalloff: 0.5,
  angleOffsetDeg: 0,
  origin: { x: 100, y: 120, z: 0 }
});

for (const [index, point] of pointField.points.entries()) {
  point.attributes.prototype_id = index % 2 === 0 ? "dot" : "spark";
  point.attributes.pscale = 0.75 + index * 0.1;
  point.attributes.color = index % 2 === 0
    ? { r: 1, g: 0.95, b: 0.8, a: 1 }
    : { r: 0.8, g: 0.9, b: 1, a: 1 };
}

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

const instanceSet = resolveCopyToPoints(pointField, prototypeLibrary, {
  defaultPrototypeId: "dot"
});

console.log(JSON.stringify(instanceSet, null, 2));