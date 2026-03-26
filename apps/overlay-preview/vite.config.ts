import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      "@brand-layout-ops/core-types": path.resolve(repoRoot, "packages/core-types/src/index.ts"),
      "@brand-layout-ops/graph-runtime": path.resolve(repoRoot, "packages/graph-runtime/src/index.ts"),
      "@brand-layout-ops/layout-engine": path.resolve(repoRoot, "packages/layout-engine/src/index.ts"),
      "@brand-layout-ops/layout-grid": path.resolve(repoRoot, "packages/layout-grid/src/index.ts"),
      "@brand-layout-ops/layout-text": path.resolve(repoRoot, "packages/layout-text/src/index.ts"),
      "@brand-layout-ops/operator-overlay-layout": path.resolve(repoRoot, "packages/operator-overlay-layout/src/index.ts"),
      "@brand-layout-ops/overlay-interaction": path.resolve(repoRoot, "packages/overlay-interaction/src/index.ts"),
      "@brand-layout-ops/parameter-ui": path.resolve(repoRoot, "packages/parameter-ui/src/index.ts")
    }
  },
  server: {
    fs: {
      allow: [repoRoot]
    }
  }
});