import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const publicRoot = path.resolve(__dirname, "public");
const sourceDefaultConfigPath = path.resolve(__dirname, "public", "assets", "source-default-config.json");
const sourceDefaultAuthoringPath = "/__authoring/source-default-config";
const sourceDefaultRelativePath = path.relative(__dirname, sourceDefaultConfigPath).replace(/\\/g, "/");
const overlayCsvAuthoringPath = "/__authoring/overlay-csv";

function resolvePublicAuthoringAssetPath(rawAssetPath: string): { logicalPath: string; filePath: string } {
  const normalizedAssetPath = String(rawAssetPath || "").trim().replace(/\\/g, "/");
  if (!normalizedAssetPath) {
    throw new Error("Expected an assetPath string.");
  }

  const relativeAssetPath = normalizedAssetPath.startsWith("./")
    ? normalizedAssetPath.slice(2)
    : normalizedAssetPath.replace(/^\/+/, "");
  if (!relativeAssetPath) {
    throw new Error("Expected an assetPath string.");
  }

  const filePath = path.resolve(publicRoot, relativeAssetPath);
  const relativeFromPublic = path.relative(publicRoot, filePath);
  if (!relativeFromPublic || relativeFromPublic.startsWith("..") || path.isAbsolute(relativeFromPublic)) {
    throw new Error("Asset path must stay within apps/overlay-preview/public.");
  }

  return {
    logicalPath: normalizedAssetPath.startsWith("./") ? normalizedAssetPath : `./${relativeFromPublic.replace(/\\/g, "/")}`,
    filePath
  };
}

function sourceDefaultAuthoringPlugin(): Plugin {
  return {
    name: "source-default-authoring",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestPath = req.url?.split("?")[0];
        if (!requestPath || (requestPath !== sourceDefaultAuthoringPath && requestPath !== overlayCsvAuthoringPath)) {
          next();
          return;
        }

        if (requestPath === sourceDefaultAuthoringPath && req.method === "GET") {
          void (async () => {
            try {
              const contents = await fs.readFile(sourceDefaultConfigPath, "utf8");
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(contents);
            } catch (error) {
              const code = (error as NodeJS.ErrnoException).code;
              if (code === "ENOENT") {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: "Source default snapshot not found." }));
                return;
              }

              res.statusCode = 500;
              res.end(JSON.stringify({ error: "Failed to read source default snapshot." }));
            }
          })();
          return;
        }

        if (requestPath === sourceDefaultAuthoringPath && req.method === "POST") {
          const chunks: Uint8Array[] = [];
          req.on("data", (chunk) => {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          });
          req.on("end", () => {
            void (async () => {
              try {
                const payload = Buffer.concat(chunks).toString("utf8") || "{}";
                const parsed = JSON.parse(payload);
                await fs.mkdir(path.dirname(sourceDefaultConfigPath), { recursive: true });
                await fs.writeFile(
                  sourceDefaultConfigPath,
                  `${JSON.stringify(parsed, null, 2)}\n`,
                  "utf8"
                );
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ ok: true, path: sourceDefaultRelativePath }));
              } catch {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Invalid source default snapshot payload." }));
              }
            })();
          });
          return;
        }

        if (requestPath === overlayCsvAuthoringPath && req.method === "POST") {
          const chunks: Uint8Array[] = [];
          req.on("data", (chunk) => {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          });
          req.on("end", () => {
            void (async () => {
              try {
                const payload = Buffer.concat(chunks).toString("utf8") || "{}";
                const parsed = JSON.parse(payload);
                const draft = typeof parsed?.draft === "string" ? parsed.draft : null;
                if (draft === null) {
                  throw new Error("Expected a draft string.");
                }

                const resolvedAsset = resolvePublicAuthoringAssetPath(parsed?.assetPath);
                const normalizedDraft = draft.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
                await fs.mkdir(path.dirname(resolvedAsset.filePath), { recursive: true });
                await fs.writeFile(
                  resolvedAsset.filePath,
                  normalizedDraft.length > 0 && !normalizedDraft.endsWith("\n")
                    ? `${normalizedDraft}\n`
                    : normalizedDraft,
                  "utf8"
                );
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ ok: true, path: resolvedAsset.logicalPath }));
              } catch (error) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({
                  error: error instanceof Error ? error.message : "Invalid CSV authoring payload."
                }));
              }
            })();
          });
          return;
        }

        res.statusCode = 405;
        res.setHeader("Allow", requestPath === sourceDefaultAuthoringPath ? "GET, POST" : "POST");
        res.end();
      });
    }
  };
}

export default defineConfig({
  root: __dirname,
  plugins: [sourceDefaultAuthoringPlugin()],
  resolve: {
    alias: {
      "@brand-layout-ops/core-types": path.resolve(repoRoot, "packages/core-types/src/index.ts"),
      "@brand-layout-ops/graph-runtime": path.resolve(repoRoot, "packages/graph-runtime/src/index.ts"),
      "@brand-layout-ops/layout-engine": path.resolve(repoRoot, "packages/layout-engine/src/index.ts"),
      "@brand-layout-ops/layout-grid": path.resolve(repoRoot, "packages/layout-grid/src/index.ts"),
      "@brand-layout-ops/layout-text": path.resolve(repoRoot, "packages/layout-text/src/index.ts"),
      "@brand-layout-ops/operator-overlay-layout": path.resolve(repoRoot, "packages/operator-overlay-layout/src/index.ts"),
      "@brand-layout-ops/overlay-interaction": path.resolve(repoRoot, "packages/overlay-interaction/src/index.ts"),
      "@brand-layout-ops/parameter-ui": path.resolve(repoRoot, "packages/parameter-ui/src/index.ts"),
      "@brand-layout-ops/operator-halo-field": path.resolve(repoRoot, "packages/operator-halo-field/src/index.ts"),
      "@brand-layout-ops/operator-ubuntu-summit-animation": path.resolve(repoRoot, "packages/operator-ubuntu-summit-animation/src/index.ts")
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [path.resolve(repoRoot, "node_modules")]
      }
    }
  },
  server: {
    fs: {
      allow: [repoRoot]
    }
  }
});