#!/usr/bin/env npx tsx
/**
 * Playwright headless export runner for brand-layout-ops.
 *
 * Spins up the Vite preview server, opens the overlay preview in a headless
 * Chromium browser, and captures one PNG frame per CSV row (or a single frame
 * if no CSV is active).
 *
 * Usage:
 *   npx tsx scripts/export-headless.ts                     # defaults
 *   npx tsx scripts/export-headless.ts --rows 1-5          # specific rows
 *   npx tsx scripts/export-headless.ts --profile story_1080x1920
 *   npx tsx scripts/export-headless.ts --format speaker_highlight
 *   npx tsx scripts/export-headless.ts --out ./exports
 *
 * Requires playwright as a peer:
 *   npm i -D playwright
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Arg parsing (minimal, no deps)
// ---------------------------------------------------------------------------

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : undefined;
}

const profileKey = getArg("--profile") ?? "landscape_1280x720";
const formatKey = getArg("--format") ?? "generic_social";
const outDir = resolve(getArg("--out") ?? "./exports");
const rowsArg = getArg("--rows"); // e.g. "1-5" or "3"
const port = Number(getArg("--port") ?? "4177");
const headless = !process.argv.includes("--headed");

// Parse row range
function parseRowRange(arg: string | undefined): { start: number; end: number } | null {
  if (!arg) return null;
  if (arg.includes("-")) {
    const [a, b] = arg.split("-").map(Number);
    if (Number.isFinite(a) && Number.isFinite(b)) return { start: a, end: b };
  }
  const n = Number(arg);
  if (Number.isFinite(n)) return { start: n, end: n };
  return null;
}

const rowRange = parseRowRange(rowsArg);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Ensure output dir
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  // Check for playwright
  let chromium: typeof import("playwright").chromium;
  try {
    const pw = await import("playwright");
    chromium = pw.chromium;
  } catch {
    console.error(
      "Playwright is not installed. Run:\n  npm i -D playwright\nthen retry."
    );
    process.exit(1);
  }

  // Start Vite dev server in background
  console.log(`Starting Vite preview server on port ${port}...`);
  const viteProcess = execSync(
    `npx vite --config apps/overlay-preview/vite.config.ts --host 127.0.0.1 --port ${port} &`,
    { stdio: "ignore" }
  );
  void viteProcess; // fire-and-forget on Windows — we rely on the server starting quickly

  // Give Vite a moment
  await new Promise((r) => setTimeout(r, 3000));

  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Navigating to ${baseUrl}...`);
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  // Wait for the SVG stage to be rendered
  await page.waitForSelector("[data-preview-stage]", { timeout: 15_000 });

  // Inject profile / format switch via the preview's global state
  await page.evaluate(
    ({ profileKey, formatKey }) => {
      // These functions are on the window if we expose them — but since main.ts
      // doesn't export to window, we dispatch through the UI selects instead.
      const profileSelect = document.querySelector(
        "[data-document-panel] select"
      ) as HTMLSelectElement | null;
      if (profileSelect) {
        profileSelect.value = profileKey;
        profileSelect.dispatchEvent(new Event("input", { bubbles: true }));
      }
    },
    { profileKey, formatKey }
  );

  // Short settle
  await new Promise((r) => setTimeout(r, 800));

  async function captureFrame(label: string) {
    const svg = await page.$("[data-preview-stage]");
    if (!svg) {
      console.warn(`No SVG stage found for ${label}, skipping.`);
      return;
    }
    const safeName = label.replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = resolve(outDir, `${safeName}.png`);
    await svg.screenshot({ path });
    console.log(`  Saved ${path}`);
  }

  if (rowRange) {
    for (let row = rowRange.start; row <= rowRange.end; row++) {
      // Click "Next row" or set the row index via the number input
      await page.evaluate((rowIdx: number) => {
        const inputs = document.querySelectorAll<HTMLInputElement>(
          "[data-document-panel] input[type='number']"
        );
        // Find the row index input (labeled "Row index" from schema)
        for (const input of inputs) {
          const label = input
            .closest(".parameter-field")
            ?.querySelector("label")?.textContent;
          if (label?.toLowerCase().includes("row")) {
            input.value = String(rowIdx);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            break;
          }
        }
      }, row);

      await new Promise((r) => setTimeout(r, 400));
      await captureFrame(`${profileKey}_${formatKey}_row${row}`);
    }
  } else {
    await captureFrame(`${profileKey}_${formatKey}_frame`);
  }

  await browser.close();
  console.log("Export complete.");

  // Try to kill the Vite server
  try {
    execSync(`npx kill-port ${port}`, { stdio: "ignore" });
  } catch {
    // Best-effort cleanup
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
