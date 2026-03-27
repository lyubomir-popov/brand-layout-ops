/**
 * three-primitives.ts — Instanced circle & segment rendering layers for Three.js.
 * Faithful TypeScript port of racoon-anim three-primitives.js.
 */
import * as THREE from "three";

const SHARED_QUAD = new THREE.PlaneGeometry(1, 1);

function setUniformColor(color: THREE.Color, value: string): void {
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    const hex = value.slice(1);
    const exp = hex.length === 3
      ? hex.split("").map(c => c + c).join("")
      : hex;
    color.setRGB(
      parseInt(exp.slice(0, 2), 16) / 255,
      parseInt(exp.slice(2, 4), 16) / 255,
      parseInt(exp.slice(4, 6), 16) / 255
    );
    return;
  }
  color.set(value as THREE.ColorRepresentation);
}

function createInstancedQuad(): THREE.InstancedBufferGeometry {
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = SHARED_QUAD.index;
  geo.setAttribute("position", SHARED_QUAD.getAttribute("position"));
  geo.setAttribute("uv", SHARED_QUAD.getAttribute("uv"));
  return geo;
}

function createShaderMat(colorHex: string, vs: string, fs: string): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: { u_color: { value: new THREE.Color() } },
    vertexShader: vs,
    fragmentShader: fs
  });
  setUniformColor(mat.uniforms.u_color.value as THREE.Color, colorHex);
  mat.toneMapped = false;
  return mat;
}

export interface InstancedLayer {
  mesh: THREE.Mesh;
  clear(): void;
  finalize(): void;
  setColor(hex: string): void;
  dispose(): void;
}

export interface CircleLayer extends InstancedLayer {
  push(cx: number, cy: number, w: number, h: number, alpha: number): void;
}

export interface SegmentLayer extends InstancedLayer {
  push(sx: number, sy: number, ex: number, ey: number, width: number, alpha: number): void;
}

export function createCircleLayer(capacity: number, colorHex: string, renderOrder = 0): CircleLayer {
  const geo = createInstancedQuad();
  const centers = new Float32Array(capacity * 2);
  const sizes = new Float32Array(capacity * 2);
  const alphas = new Float32Array(capacity);

  const cAttr = new THREE.InstancedBufferAttribute(centers, 2);
  const sAttr = new THREE.InstancedBufferAttribute(sizes, 2);
  const aAttr = new THREE.InstancedBufferAttribute(alphas, 1);
  cAttr.setUsage(THREE.DynamicDrawUsage);
  sAttr.setUsage(THREE.DynamicDrawUsage);
  aAttr.setUsage(THREE.DynamicDrawUsage);

  geo.setAttribute("instance_center", cAttr);
  geo.setAttribute("instance_size", sAttr);
  geo.setAttribute("instance_alpha", aAttr);
  geo.instanceCount = 0;

  const mat = createShaderMat(colorHex,
    `attribute vec2 instance_center;
     attribute vec2 instance_size;
     attribute float instance_alpha;
     varying vec2 v_uv;
     varying float v_alpha;
     void main() {
       vec2 wp = instance_center + position.xy * instance_size;
       v_uv = uv;
       v_alpha = instance_alpha;
       gl_Position = projectionMatrix * modelViewMatrix * vec4(wp, 0.0, 1.0);
     }`,
    `uniform vec3 u_color;
     varying vec2 v_uv;
     varying float v_alpha;
     void main() {
       vec2 c = v_uv * 2.0 - 1.0;
       float d = length(c);
       float e = fwidth(d);
       float mask = 1.0 - smoothstep(1.0 - e, 1.0 + e, d);
       float a = v_alpha * mask;
       if (a <= 0.001) discard;
       gl_FragColor = vec4(u_color, a);
     }`
  );

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = renderOrder;
  let count = 0;

  return {
    mesh,
    clear() { count = 0; geo.instanceCount = 0; },
    push(cx, cy, w, h, alpha) {
      if (count >= capacity || alpha <= 0 || w <= 0 || h <= 0) return;
      const i2 = count * 2;
      centers[i2] = cx; centers[i2 + 1] = cy;
      sizes[i2] = w; sizes[i2 + 1] = h;
      alphas[count] = alpha;
      count++;
    },
    finalize() {
      geo.instanceCount = count;
      cAttr.needsUpdate = true;
      sAttr.needsUpdate = true;
      aAttr.needsUpdate = true;
    },
    setColor(hex) { setUniformColor((mat.uniforms.u_color.value as THREE.Color), hex); },
    dispose() { geo.dispose(); mat.dispose(); }
  };
}

export function createSegmentLayer(capacity: number, colorHex: string, renderOrder = 0): SegmentLayer {
  const geo = createInstancedQuad();
  const starts = new Float32Array(capacity * 2);
  const ends = new Float32Array(capacity * 2);
  const widths = new Float32Array(capacity);
  const alphas = new Float32Array(capacity);

  const sAttr = new THREE.InstancedBufferAttribute(starts, 2);
  const eAttr = new THREE.InstancedBufferAttribute(ends, 2);
  const wAttr = new THREE.InstancedBufferAttribute(widths, 1);
  const aAttr = new THREE.InstancedBufferAttribute(alphas, 1);
  sAttr.setUsage(THREE.DynamicDrawUsage);
  eAttr.setUsage(THREE.DynamicDrawUsage);
  wAttr.setUsage(THREE.DynamicDrawUsage);
  aAttr.setUsage(THREE.DynamicDrawUsage);

  geo.setAttribute("instance_start", sAttr);
  geo.setAttribute("instance_end", eAttr);
  geo.setAttribute("instance_width", wAttr);
  geo.setAttribute("instance_alpha", aAttr);
  geo.instanceCount = 0;

  const mat = createShaderMat(colorHex,
    `attribute vec2 instance_start;
     attribute vec2 instance_end;
     attribute float instance_width;
     attribute float instance_alpha;
     varying float v_alpha;
     void main() {
       vec2 seg = instance_end - instance_start;
       float len = max(length(seg), 0.0001);
       vec2 norm = vec2(-seg.y, seg.x) / len;
       vec2 ctr = (instance_start + instance_end) * 0.5;
       vec2 wp = ctr + seg * position.x + norm * position.y * instance_width;
       v_alpha = instance_alpha;
       gl_Position = projectionMatrix * modelViewMatrix * vec4(wp, 0.0, 1.0);
     }`,
    `uniform vec3 u_color;
     varying float v_alpha;
     void main() {
       if (v_alpha <= 0.001) discard;
       gl_FragColor = vec4(u_color, v_alpha);
     }`
  );

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = renderOrder;
  let count = 0;

  return {
    mesh,
    clear() { count = 0; geo.instanceCount = 0; },
    push(sx, sy, ex, ey, width, alpha) {
      if (count >= capacity || alpha <= 0 || width <= 0) return;
      const i2 = count * 2;
      starts[i2] = sx; starts[i2 + 1] = sy;
      ends[i2] = ex; ends[i2 + 1] = ey;
      widths[count] = width;
      alphas[count] = alpha;
      count++;
    },
    finalize() {
      geo.instanceCount = count;
      sAttr.needsUpdate = true;
      eAttr.needsUpdate = true;
      wAttr.needsUpdate = true;
      aAttr.needsUpdate = true;
    },
    setColor(hex) { setUniformColor((mat.uniforms.u_color.value as THREE.Color), hex); },
    dispose() { geo.dispose(); mat.dispose(); }
  };
}
