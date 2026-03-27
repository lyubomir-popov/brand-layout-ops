#!/usr/bin/env npx tsx
/**
 * Encode an exported PNG sequence into an MP4 master using FFmpeg.
 *
 * Encoding defaults are tuned to preserve thin graphic shapes (spokes, grid
 * lines, small text) better than a normal delivery encode.
 *
 * Usage:
 *   npx tsx scripts/encode-mp4.ts --input-dir ./output/1280x720/cli-20260327-143000
 *   npx tsx scripts/encode-mp4.ts --input-dir ./output --fps 30
 *   npx tsx scripts/encode-mp4.ts --input-dir ./output --delivery  # platform-safe
 *   npx tsx scripts/encode-mp4.ts --input-dir ./output --output ./my-video.mp4
 *
 * FFmpeg must be on PATH or specified with --ffmpeg.
 */

import { execFileSync, execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { basename, resolve, join } from "node:path";
import { platform } from "node:os";

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

const inputDirArg = getArg("--input-dir");
const outputArg = getArg("--output");
const fps = Number(getArg("--fps") ?? "24");
const ffmpegArg = getArg("--ffmpeg");
const overwrite = hasFlag("--overwrite");
const delivery = hasFlag("--delivery");
const allIntra = hasFlag("--all-intra");
const fadeInSec = Number(getArg("--fade-in-sec") ?? "0");
const fadeOutSec = Number(getArg("--fade-out-sec") ?? "0");

// Delivery mode overrides
const crf = delivery ? 14 : Number(getArg("--crf") ?? "10");
const preset = delivery ? "slow" : (getArg("--preset") ?? "slow");
const pixFmt = delivery ? "yuv420p" : (getArg("--pix-fmt") ?? "yuv444p");

// ---------------------------------------------------------------------------
// FFmpeg resolution
// ---------------------------------------------------------------------------

function resolveFFmpeg(): string {
  if (ffmpegArg) return resolve(ffmpegArg);

  try {
    // Check if ffmpeg is on PATH
    execSync("ffmpeg -version", { stdio: "ignore" });
    return "ffmpeg";
  } catch {
    // On Windows, check common WinGet install location
    if (platform() === "win32") {
      const localAppData = process.env.LOCALAPPDATA ?? "";
      if (localAppData) {
        const wingetDir = join(localAppData, "Microsoft", "WinGet", "Packages");
        if (existsSync(wingetDir)) {
          const entries = readdirSync(wingetDir).filter(e => e.startsWith("Gyan.FFmpeg"));
          for (const entry of entries.sort().reverse()) {
            const binDir = join(wingetDir, entry);
            // Look for ffmpeg.exe in nested dirs
            try {
              const subDirs = readdirSync(binDir);
              for (const sub of subDirs) {
                const candidate = join(binDir, sub, "bin", "ffmpeg.exe");
                if (existsSync(candidate)) return candidate;
              }
            } catch { /* skip */ }
          }
        }
      }
    }
  }

  throw new Error(
    "ffmpeg was not found on PATH. Pass --ffmpeg <path> or install ffmpeg.\n" +
    "  Windows: winget install Gyan.FFmpeg.Essentials\n" +
    "  macOS:   brew install ffmpeg\n" +
    "  Linux:   sudo apt install ffmpeg"
  );
}

// ---------------------------------------------------------------------------
// Frame sequence validation
// ---------------------------------------------------------------------------

interface SequenceInfo {
  firstFramePath: string;
  firstFrameNumber: number;
  lastFrameNumber: number;
  padWidth: number;
  frameCount: number;
}

function validateInputDir(dir: string): SequenceInfo {
  if (!existsSync(dir)) {
    throw new Error(`Input directory does not exist: ${dir}`);
  }

  const framePattern = /^frame-(\d+)\.png$/;
  const entries: Array<{ number: number; padWidth: number; path: string }> = [];

  for (const name of readdirSync(dir)) {
    const match = framePattern.exec(name);
    if (match) {
      entries.push({
        number: Number(match[1]),
        padWidth: match[1].length,
        path: join(dir, name),
      });
    }
  }

  if (entries.length === 0) {
    throw new Error(
      `${dir} does not contain any frame-0001.png style exports.`
    );
  }

  entries.sort((a, b) => a.number - b.number);
  const first = entries[0];
  const last = entries[entries.length - 1];

  // Check contiguity
  const expected = last.number - first.number + 1;
  if (entries.length !== expected) {
    throw new Error(
      `Frame sequence must be contiguous. Found ${entries.length} frames in range ` +
      `${first.number}-${last.number} (expected ${expected}).`
    );
  }

  return {
    firstFramePath: first.path,
    firstFrameNumber: first.number,
    lastFrameNumber: last.number,
    padWidth: Math.max(...entries.map(e => e.padWidth)),
    frameCount: entries.length,
  };
}

// ---------------------------------------------------------------------------
// FFmpeg command builder
// ---------------------------------------------------------------------------

function buildFadeFilter(frameCount: number, fpsVal: number): string | null {
  const filters: string[] = [];
  const fadeIn = Math.min(frameCount, Math.max(0, Math.round(fadeInSec * fpsVal)));
  const fadeOut = Math.min(frameCount, Math.max(0, Math.round(fadeOutSec * fpsVal)));

  if (fadeIn > 0) {
    filters.push(`fade=t=in:s=0:n=${fadeIn}`);
  }
  if (fadeOut > 0) {
    const start = Math.max(0, frameCount - fadeOut);
    filters.push(`fade=t=out:s=${start}:n=${fadeOut}`);
  }

  return filters.length > 0 ? filters.join(",") : null;
}

function buildCommand(
  ffmpeg: string,
  seq: SequenceInfo,
  outputPath: string
): string[] {
  const inputDir = resolve(seq.firstFramePath, "..");
  const inputPattern = join(inputDir, `frame-%0${seq.padWidth}d.png`);

  const profileVal = pixFmt === "yuv444p" ? "high444" : "high";

  const cmd = [
    ffmpeg,
    "-hide_banner",
    "-loglevel", "error",
    "-framerate", String(fps),
    "-start_number", String(seq.firstFrameNumber),
    "-i", inputPattern,
    "-c:v", "libx264",
    "-preset", preset,
    "-crf", String(crf),
    "-pix_fmt", pixFmt,
    "-profile:v", profileVal,
    "-level:v", "4.1",
    "-colorspace", "bt709",
    "-color_primaries", "bt709",
    "-color_trc", "bt709",
    "-movflags", "+faststart",
    "-tune", "animation",
    "-bf", "0",
  ];

  const fadeFilter = buildFadeFilter(seq.frameCount, fps);
  if (fadeFilter) {
    cmd.push("-vf", fadeFilter);
  }

  if (allIntra) {
    cmd.push("-g", "1", "-keyint_min", "1", "-sc_threshold", "0");
  } else {
    cmd.push(
      "-g", String(Math.max(1, fps * 2)),
      "-keyint_min", String(Math.max(1, Math.floor(fps / 2)))
    );
  }

  cmd.push(overwrite ? "-y" : "-n");
  cmd.push(outputPath);
  return cmd;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (!inputDirArg) {
    console.error("Usage: npx tsx scripts/encode-mp4.ts --input-dir <directory> [options]");
    console.error("Run with --help for all options.");
    process.exit(1);
  }

  const inputDir = resolve(inputDirArg);
  const ffmpeg = resolveFFmpeg();
  const seq = validateInputDir(inputDir);

  const outputPath = outputArg
    ? resolve(outputArg)
    : join(inputDir, `${basename(inputDir)}-master.mp4`);

  console.log(
    `Encoding ${seq.frameCount} frames at ${fps} fps\n` +
    `  CRF: ${crf}, Preset: ${preset}, Pixel format: ${pixFmt}\n` +
    `  Output: ${outputPath}`
  );

  const cmd = buildCommand(ffmpeg, seq, outputPath);
  const [executable, ...args] = cmd;

  try {
    execFileSync(executable, args, { stdio: "inherit" });
    console.log(`\nEncoded successfully: ${outputPath}`);
  } catch (err) {
    console.error("FFmpeg encoding failed.");
    process.exit(1);
  }
}

main();
