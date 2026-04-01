import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.argv[2] || "http://127.0.0.1:4177/";
const outputDirArg = process.argv[3] || "output/export-validation/2026-04-01";
const previewDocumentPathArg = process.argv[4] || "apps/overlay-preview/public/assets/source-default-config.json";
const outputDir = path.resolve(outputDirArg);
const previewDocument = JSON.parse(fs.readFileSync(path.resolve(previewDocumentPathArg), "utf8"));

fs.mkdirSync(outputDir, { recursive: true });

const variants = [
  {
    name: "rebuild-halo-1080x1350.png",
    url: baseUrl,
    payload: {
      preview_document: previewDocument,
      output_profile_key: "instagram_1080x1350",
      document_scene_family_key: "halo",
      transparent_background: true,
      playback_time_sec: 3
    }
  },
  {
    name: "rebuild-fuzzy-gpu-1080x1350.png",
    url: `${baseUrl.replace(/\/?$/, "")}/?gpuBoids=1`,
    payload: {
      preview_document: previewDocument,
      output_profile_key: "instagram_1080x1350",
      document_scene_family_key: "fuzzy-boids",
      playback_time_sec: 3
    }
  },
  {
    name: "rebuild-fuzzy-cpu-1080x1350.png",
    url: `${baseUrl.replace(/\/?$/, "")}/?noGpuBoids=1`,
    payload: {
      preview_document: previewDocument,
      output_profile_key: "instagram_1080x1350",
      document_scene_family_key: "fuzzy-boids",
      playback_time_sec: 3
    }
  }
];

const browser = await chromium.launch({ headless: true });
const summary = [];

try {
  for (const variant of variants) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1600 },
      deviceScaleFactor: 1
    });

    await page.goto(variant.url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.__layoutOpsAutomation), { timeout: 15000 });
    await page.evaluate(() => window.__layoutOpsAutomation.ready());

    const state = await page.evaluate(
      (payload) => window.__layoutOpsAutomation.applySnapshot(payload),
      variant.payload
    );

    const start = Date.now();
    const frame = await page.evaluate(
      (payload) => window.__layoutOpsAutomation.exportFrame(payload),
      variant.payload
    );
    const elapsedMs = Date.now() - start;

    const outputPath = path.join(outputDir, variant.name);
    fs.writeFileSync(outputPath, Buffer.from(frame.png_base64, "base64"));

    summary.push({
      name: variant.name,
      url: variant.url,
      previewDocumentPath: path.resolve(previewDocumentPathArg),
      elapsedMs,
      outputProfileKey: state.output_profile_key,
      sceneFamilyKey: state.document_scene_family_key,
      transparentBackground: frame.transparent_background,
      widthPx: frame.width_px,
      heightPx: frame.height_px
    });

    await page.close();
  }
} finally {
  await browser.close();
}

const summaryPath = path.join(outputDir, "rebuild-export-summary.json");
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

console.log(JSON.stringify(summary, null, 2));
console.log(`Wrote validation outputs to ${outputDir}`);