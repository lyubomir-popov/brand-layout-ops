/**
 * playback-controller.ts — Animation playback loop management.
 *
 * Owns the play/pause state, frame timing, and requestAnimationFrame loop.
 * The preview's main module supplies the per-frame render callback.
 */

import type { PreviewState } from "./preview-app-context.js";

export interface PlaybackControllerDeps {
  readonly state: PreviewState;
  renderBackgroundFrame(mode: "interactive"): void;
}

export interface PlaybackController {
  updatePlaybackToggleUi(): void;
  setPlaybackPlaying(nextIsPlaying: boolean): void;
  togglePlayback(): void;
  ensurePlaybackLoop(): void;
  stopPlaybackLoop(): void;
}

export function createPlaybackController(deps: PlaybackControllerDeps): PlaybackController {
  const { state } = deps;
  let playbackFrameHandle: number | null = null;
  let lastPlaybackFrameMs: number | null = null;

  function getPlaybackToggleButton(): HTMLButtonElement | null {
    return document.querySelector<HTMLButtonElement>("[data-playback-toggle]");
  }

  function updatePlaybackToggleUi(): void {
    const button = getPlaybackToggleButton();
    if (!button) return;
    button.textContent = state.isPlaying ? "Pause Motion" : "Play Motion";
    button.setAttribute("aria-pressed", state.isPlaying ? "true" : "false");
  }

  function stopPlaybackLoop(): void {
    if (playbackFrameHandle !== null) {
      cancelAnimationFrame(playbackFrameHandle);
      playbackFrameHandle = null;
    }
    lastPlaybackFrameMs = null;
  }

  function stepPlayback(nowMs: number): void {
    if (!state.isPlaying) {
      stopPlaybackLoop();
      return;
    }

    if (lastPlaybackFrameMs === null) {
      lastPlaybackFrameMs = nowMs;
    }

    const deltaSec = Math.max(0, Math.min(0.1, (nowMs - lastPlaybackFrameMs) / 1000));
    lastPlaybackFrameMs = nowMs;
    state.playbackTimeSec += deltaSec;
    deps.renderBackgroundFrame("interactive");
    playbackFrameHandle = requestAnimationFrame(stepPlayback);
  }

  function ensurePlaybackLoop(): void {
    if (!state.isPlaying || playbackFrameHandle !== null) {
      return;
    }
    playbackFrameHandle = requestAnimationFrame(stepPlayback);
  }

  function setPlaybackPlaying(nextIsPlaying: boolean): void {
    if (state.isPlaying === nextIsPlaying) {
      if (nextIsPlaying) {
        ensurePlaybackLoop();
      }
      updatePlaybackToggleUi();
      return;
    }

    state.isPlaying = nextIsPlaying;
    updatePlaybackToggleUi();

    if (nextIsPlaying) {
      lastPlaybackFrameMs = null;
      ensurePlaybackLoop();
      return;
    }

    stopPlaybackLoop();
  }

  function togglePlayback(): void {
    setPlaybackPlaying(!state.isPlaying);
  }

  return {
    updatePlaybackToggleUi,
    setPlaybackPlaying,
    togglePlayback,
    ensurePlaybackLoop,
    stopPlaybackLoop
  };
}
