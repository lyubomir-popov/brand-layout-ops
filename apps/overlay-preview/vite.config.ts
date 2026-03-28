import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const sourceDefaultConfigPath = path.resolve(__dirname, "public", "assets", "source-default-config.json");
const sourceDefaultAuthoringPath = "/__authoring/source-default-config";

function sourceDefaultAuthoringPlugin(): Plugin {
  return {
    name: "source-default-authoring",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || req.url.split("?")[0] !== sourceDefaultAuthoringPath) {
          next();
          return;
        }

        if (req.method === "GET") {
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

        if (req.method === "POST") {
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
                res.end(JSON.stringify({ ok: true }));
              } catch {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Invalid source default snapshot payload." }));
              }
            })();
          });
          return;
        }

        res.statusCode = 405;
        res.setHeader("Allow", "GET, POST");
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