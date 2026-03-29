/**
 * halo-config-section.ts — Halo Field accordion section builder.
 *
 * Extracted from main.ts. Builds the halo-field parameter panel
 * (or a scene-family preview summary when a non-halo family is active).
 * Receives all dependencies via PreviewAppContext instead of closure capture.
 */

import type { PreviewAppContext } from "./preview-app-context.js";
import { getOutputProfileMetrics } from "@brand-layout-ops/core-types";
import {
  buildAccordionSectionEl,
  createCheckboxFormGroup,
  createFormGroup,
  createNumberInput,
  createReadonlySpan,
  createSelectInput,
  createSliderInput,
  wrapCol
} from "@brand-layout-ops/parameter-ui";

export function buildHaloConfigSection(ctx: PreviewAppContext): HTMLElement {
  const { state } = ctx;

  if (state.documentProject.sceneFamilyKey !== "halo") {
    const { root, body } = buildAccordionSectionEl(`${ctx.getSceneFamilyLabel(state.documentProject.sceneFamilyKey)} Preview`);

    const helpText = document.createElement("p");
    helpText.className = "bf-form-help bf-u-no-margin--bottom";
    helpText.textContent = "Dedicated parameter controls for this scene family are not surfaced yet. They will appear here once the operator selector UI lands.";
    body.append(helpText);

    return root;
  }

  const { root, body } = buildAccordionSectionEl("Halo Field");
  const hc = state.haloConfig;
  const updateHaloConfig = (updater: (config: typeof state.haloConfig) => typeof state.haloConfig) => {
    state.haloConfig = updater(state.haloConfig);
    void ctx.renderStage();
  };

  const compositionFields = document.createElement("div");
  compositionFields.className = "bf-grid";

  compositionFields.append(wrapCol(1, createFormGroup("Scale",
    createSliderInput(hc.composition.scale, { min: 0.1, max: 2, step: 0.01 }, v => {
      state.haloConfig = { ...hc, composition: { ...hc.composition, scale: v } }; void ctx.renderStage();
    })
  )));

  compositionFields.append(wrapCol(1, createFormGroup("Radial Scale",
    createSliderInput(hc.composition.radial_scale, { min: 0.1, max: 2, step: 0.01 }, v => {
      state.haloConfig = { ...hc, composition: { ...hc.composition, radial_scale: v } }; void ctx.renderStage();
    })
  )));

  compositionFields.append(wrapCol(1, createFormGroup("Center Y Offset",
    createSliderInput(hc.composition.center_offset_y_px ?? 0, { min: -500, max: 500, step: 1 }, v => {
      const metrics = getOutputProfileMetrics(state.outputProfileKey);
      state.haloConfig = { ...hc, composition: { ...hc.composition, center_offset_y_px: v, center_y_px: metrics.centerYPx + v } };
      void ctx.renderStage();
    })
  )));

  compositionFields.append(wrapCol(1, createFormGroup("Inner Radius",
    createSliderInput(hc.generator_wrangle.inner_radius, { min: 0, max: 1, step: 0.001 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, inner_radius: v } }; void ctx.renderStage();
    })
  )));

  compositionFields.append(wrapCol(1, createFormGroup("Outer Radius",
    createSliderInput(hc.generator_wrangle.outer_radius, { min: 0, max: 1, step: 0.001 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, outer_radius: v } }; void ctx.renderStage();
    })
  )));

  body.append(compositionFields);

  const generatorFields = document.createElement("div");
  generatorFields.className = "bf-grid";

  generatorFields.append(wrapCol(1, createFormGroup("Spokes",
    createNumberInput(hc.generator_wrangle.spoke_count, { min: 4, max: 120, step: 1 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, spoke_count: Math.round(v) } }; void ctx.renderStage();
    })
  )));

  generatorFields.append(wrapCol(1, createFormGroup("Orbits",
    createNumberInput(hc.generator_wrangle.num_orbits, { min: 1, max: 16, step: 1 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, num_orbits: Math.round(v) } }; void ctx.renderStage();
    })
  )));

  generatorFields.append(wrapCol(1, createFormGroup("Min Active Orbits",
    createNumberInput(hc.generator_wrangle.min_active_orbits, { min: 1, max: 16, step: 1 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, min_active_orbits: Math.round(v) } }; void ctx.renderStage();
    })
  )));

  generatorFields.append(wrapCol(1, createFormGroup("Phase Count",
    createNumberInput(hc.generator_wrangle.phase_count, { min: 1, max: 6, step: 1 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, phase_count: Math.round(v) } }; void ctx.renderStage();
    })
  )));

  body.append(generatorFields);

  const angleFields = document.createElement("div");
  angleFields.className = "bf-grid";

  angleFields.append(wrapCol(1, createFormGroup("Base Angle",
    createSliderInput(hc.generator_wrangle.base_angle_deg, { min: -180, max: 180, step: 0.1 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, base_angle_deg: v } }; void ctx.renderStage();
    })
  )));

  angleFields.append(wrapCol(1, createFormGroup("Pattern Offset",
    createNumberInput(hc.generator_wrangle.pattern_offset_spokes, { min: -120, max: 120, step: 1 }, v => {
      state.haloConfig = { ...hc, generator_wrangle: { ...hc.generator_wrangle, pattern_offset_spokes: Math.round(v) } }; void ctx.renderStage();
    })
  )));

  angleFields.append(wrapCol(1, createFormGroup("Start Radius",
    createSliderInput(hc.spoke_lines.start_radius_px, { min: 0, max: 400, step: 1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, start_radius_px: v } }; void ctx.renderStage();
    })
  )));

  angleFields.append(wrapCol(1, createFormGroup("End Radius Extra",
    createSliderInput(hc.spoke_lines.end_radius_extra_px, { min: 0, max: 400, step: 1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, end_radius_extra_px: v } }; void ctx.renderStage();
    })
  )));

  body.append(angleFields);

  /* colors row */
  const colorFields = document.createElement("div");
  colorFields.className = "bf-grid";

  for (const [label, getValue, setValue] of [
    ["Background", () => hc.composition.background_color,
      (v: string) => { state.haloConfig = { ...hc, composition: { ...hc.composition, background_color: v } }; }],
    ["Dot Color", () => hc.point_style.color,
      (v: string) => { state.haloConfig = { ...hc, point_style: { ...hc.point_style, color: v } }; }],
    ["Construction", () => hc.spoke_lines.construction_color,
      (v: string) => { state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, construction_color: v } }; }],
    ["Reference", () => hc.spoke_lines.reference_color,
      (v: string) => { state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, reference_color: v } }; }],
    ["Spoke Color", () => hc.spoke_lines.color,
      (v: string) => { state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, color: v } }; }],
    ["Echo Color", () => hc.spoke_lines.echo_color,
      (v: string) => { state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_color: v } }; }]
  ] as const) {
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "p-color-input";
    colorInput.value = (getValue as () => string)();
    colorInput.addEventListener("input", () => {
      (setValue as (v: string) => void)(colorInput.value);
      void ctx.renderStage();
    });
    colorFields.append(wrapCol(1, createFormGroup(label as string, colorInput)));
  }

  body.append(colorFields);

  /* spoke details row */
  const spokeDetails = document.createElement("div");
  spokeDetails.className = "bf-grid";

  spokeDetails.append(wrapCol(1, createFormGroup("Spoke Width",
    createSliderInput(hc.spoke_lines.width_px, { min: 0, max: 16, step: 0.5 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, width_px: v } }; void ctx.renderStage();
    })
  )));

  spokeDetails.append(wrapCol(1, createFormGroup("Echo Count",
    createNumberInput(hc.spoke_lines.echo_count, { min: 0, max: 32, step: 1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_count: Math.round(v) } }; void ctx.renderStage();
    })
  )));

  spokeDetails.append(wrapCol(1, createFormGroup("Echo Style",
    createSelectInput(hc.spoke_lines.echo_style,
      [
        { label: "Mixed", value: "mixed" },
        { label: "Dots", value: "dots" },
        { label: "Plus", value: "plus" },
        { label: "Triangles", value: "triangles" },
        { label: "Diamond", value: "diamond" },
        { label: "Star", value: "star" },
        { label: "Hexagon", value: "hexagon" },
        { label: "Radial Dash", value: "radial_dash" }
      ],
      (v) => { state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_style: v } }; void ctx.renderStage(); }
    )
  )));

  spokeDetails.append(wrapCol(1, createFormGroup("Phase Width",
    createSliderInput(hc.spoke_lines.phase_start_width_px, { min: 0, max: 32, step: 1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, phase_start_width_px: v } }; void ctx.renderStage();
    })
  )));

  body.append(spokeDetails);

  /* echo shape details row */
  const echoDetails = document.createElement("div");
  echoDetails.className = "bf-grid";

  echoDetails.append(wrapCol(1, createFormGroup("Phase End Width",
    createSliderInput(hc.spoke_lines.phase_end_width_px, { min: 0, max: 32, step: 1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, phase_end_width_px: v } }; void ctx.renderStage();
    })
  )));

  echoDetails.append(wrapCol(1, createFormGroup("Echo Stroke",
    createSliderInput(hc.spoke_lines.echo_marker_stroke_px, { min: 0, max: 12, step: 0.5 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_marker_stroke_px: v } }; void ctx.renderStage();
    })
  )));

  echoDetails.append(wrapCol(1, createFormGroup("Echo Scale",
    createSliderInput(hc.spoke_lines.echo_marker_scale_mult, { min: 0.1, max: 6, step: 0.1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_marker_scale_mult: v } }; void ctx.renderStage();
    })
  )));

  echoDetails.append(wrapCol(1, createFormGroup("Sparse Boost",
    createSliderInput(hc.spoke_lines.echo_sparse_scale_boost, { min: 0, max: 6, step: 0.1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_sparse_scale_boost: v } }; void ctx.renderStage();
    })
  )));

  body.append(echoDetails);

  /* echo pattern details row */
  const echoPatternDetails = document.createElement("div");
  echoPatternDetails.className = "bf-grid";

  echoPatternDetails.append(wrapCol(1, createFormGroup("Shape Seed",
    createNumberInput(hc.spoke_lines.echo_shape_seed, { min: 0, max: 9999, step: 1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_shape_seed: Math.round(v) } }; void ctx.renderStage();
    })
  )));

  echoPatternDetails.append(wrapCol(1, createFormGroup("Mix Shape %",
    createSliderInput(hc.spoke_lines.echo_mix_shape_pct, { min: 0, max: 1, step: 0.01 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_mix_shape_pct: v } }; void ctx.renderStage();
    })
  )));

  echoPatternDetails.append(wrapCol(1, createFormGroup("Ripple Count",
    createSliderInput(hc.spoke_lines.echo_wave_count, { min: 0, max: 12, step: 1 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_wave_count: Math.round(v) } }; void ctx.renderStage();
    })
  )));

  echoPatternDetails.append(wrapCol(1, createFormGroup("Echo Fade",
    createSliderInput(hc.spoke_lines.echo_opacity_mult, { min: 0, max: 1, step: 0.01 }, v => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, echo_opacity_mult: v } }; void ctx.renderStage();
    })
  )));

  body.append(echoPatternDetails);

  const screensaverDetails = document.createElement("div");
  screensaverDetails.className = "bf-grid";

  screensaverDetails.append(wrapCol(1, createFormGroup("Breath Cycle",
    createSliderInput(hc.screensaver?.cycle_sec ?? 60, { min: 0, max: 60, step: 0.1 }, v => {
      state.haloConfig = { ...hc, screensaver: { ...hc.screensaver!, cycle_sec: v } }; void ctx.renderStage();
    })
  )));

  screensaverDetails.append(wrapCol(1, createFormGroup("Breath Ramp In",
    createSliderInput(hc.screensaver?.ramp_in_sec ?? 0.6, { min: 0, max: 60, step: 0.1 }, v => {
      state.haloConfig = { ...hc, screensaver: { ...hc.screensaver!, ramp_in_sec: v } }; void ctx.renderStage();
    })
  )));

  screensaverDetails.append(wrapCol(1, createFormGroup("Min Spokes",
    createSliderInput(hc.screensaver?.min_spoke_count ?? 24, { min: 1, max: 180, step: 1 }, v => {
      state.haloConfig = { ...hc, screensaver: { ...hc.screensaver!, min_spoke_count: Math.round(v) } }; void ctx.renderStage();
    })
  )));

  screensaverDetails.append(wrapCol(1, createFormGroup("Boundary Ease",
    createSliderInput(hc.screensaver?.phase_boundary_transition_sec ?? 0.35, { min: 0, max: 1.5, step: 0.01 }, v => {
      state.haloConfig = { ...hc, screensaver: { ...hc.screensaver!, phase_boundary_transition_sec: v } }; void ctx.renderStage();
    })
  )));

  body.append(screensaverDetails);

  const motionToggleFields = document.createElement("div");
  motionToggleFields.className = "bf-grid";

  motionToggleFields.append(wrapCol(1, createCheckboxFormGroup(
    "Mascot Fade",
    hc.mascot_fade.enabled,
    (enabled) => {
      updateHaloConfig((config) => ({
        ...config,
        mascot_fade: { ...config.mascot_fade, enabled }
      }));
    }
  )));

  motionToggleFields.append(wrapCol(1, createCheckboxFormGroup(
    "Head Turn",
    hc.head_turn.enabled,
    (enabled) => {
      updateHaloConfig((config) => ({
        ...config,
        head_turn: { ...config.head_turn, enabled }
      }));
    }
  )));

  motionToggleFields.append(wrapCol(1, createCheckboxFormGroup(
    "Closing Blink",
    hc.blink.enabled,
    (enabled) => {
      updateHaloConfig((config) => ({
        ...config,
        blink: { ...config.blink, enabled }
      }));
    }
  )));

  motionToggleFields.append(wrapCol(1, createCheckboxFormGroup(
    "Finale Sweep",
    hc.finale?.enabled ?? true,
    (enabled) => {
      updateHaloConfig((config) => ({
        ...config,
        finale: { ...config.finale!, enabled }
      }));
    }
  )));

  body.append(motionToggleFields);

  const motionTimingFields = document.createElement("div");
  motionTimingFields.className = "bf-grid";

  motionTimingFields.append(wrapCol(1, createFormGroup("Fade Duration",
    createSliderInput(hc.mascot_fade.duration_sec, { min: 0, max: 3, step: 0.01 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        mascot_fade: { ...config.mascot_fade, duration_sec: v }
      }));
    })
  )));

  motionTimingFields.append(wrapCol(1, createFormGroup("Head Turn Duration",
    createSliderInput(hc.head_turn.duration_sec, { min: 0, max: 1, step: 0.01 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        head_turn: { ...config.head_turn, duration_sec: v }
      }));
    })
  )));

  motionTimingFields.append(wrapCol(1, createFormGroup("Dot Overlap",
    createSliderInput(hc.head_turn.dot_overlap_sec, { min: 0, max: 1, step: 0.01 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        head_turn: { ...config.head_turn, dot_overlap_sec: v }
      }));
    })
  )));

  motionTimingFields.append(wrapCol(1, createFormGroup("Blink Delay",
    createSliderInput(hc.blink.start_delay_sec, { min: 0, max: 1, step: 0.01 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        blink: { ...config.blink, start_delay_sec: v }
      }));
    })
  )));

  body.append(motionTimingFields);

  const finaleMotionFields = document.createElement("div");
  finaleMotionFields.className = "bf-grid";

  finaleMotionFields.append(wrapCol(1, createFormGroup("Finale Delay",
    createSliderInput(hc.finale?.delay_after_dots_sec ?? 0, { min: 0, max: 4, step: 0.01 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        finale: { ...config.finale!, delay_after_dots_sec: v }
      }));
    })
  )));

  finaleMotionFields.append(wrapCol(1, createFormGroup("Finale Duration",
    createSliderInput(hc.finale?.duration_sec ?? 0.75, { min: 0, max: 6, step: 0.01 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        finale: { ...config.finale!, duration_sec: v }
      }));
    })
  )));

  finaleMotionFields.append(wrapCol(1, createFormGroup("Blink Duration",
    createSliderInput(hc.blink.duration_sec, { min: 0, max: 1, step: 0.01 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        blink: { ...config.blink, duration_sec: v }
      }));
    })
  )));

  finaleMotionFields.append(wrapCol(1, createFormGroup("Nose Bob",
    createSliderInput(hc.sneeze.nose_bob_up_px, { min: 0, max: 20, step: 0.1 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        sneeze: { ...config.sneeze, nose_bob_up_px: v }
      }));
    })
  )));

  body.append(finaleMotionFields);

  const headTurnFields = document.createElement("div");
  headTurnFields.className = "bf-grid";

  headTurnFields.append(wrapCol(1, createFormGroup("Peak Angle",
    createSliderInput(hc.head_turn.peak_angle_deg, { min: -90, max: 90, step: 0.1 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        head_turn: { ...config.head_turn, peak_angle_deg: v }
      }));
    })
  )));

  headTurnFields.append(wrapCol(1, createFormGroup("Reverse Angle",
    createSliderInput(hc.head_turn.reverse_angle_deg, { min: -90, max: 90, step: 0.1 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        head_turn: { ...config.head_turn, reverse_angle_deg: v }
      }));
    })
  )));

  headTurnFields.append(wrapCol(1, createFormGroup("Overshoot Angle",
    createSliderInput(hc.head_turn.overshoot_angle_deg, { min: -90, max: 90, step: 0.1 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        head_turn: { ...config.head_turn, overshoot_angle_deg: v }
      }));
    })
  )));

  headTurnFields.append(wrapCol(1, createCheckboxFormGroup(
    "Loop Sneeze",
    hc.sneeze.enabled,
    (enabled) => {
      updateHaloConfig((config) => ({
        ...config,
        sneeze: { ...config.sneeze, enabled }
      }));
    }
  )));

  body.append(headTurnFields);

  const motionCurveFields = document.createElement("div");
  motionCurveFields.className = "bf-grid";

  motionCurveFields.append(wrapCol(1, createFormGroup("Peak Timing",
    createSliderInput(hc.head_turn.peak_frac, { min: 0, max: 1, step: 0.01 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        head_turn: { ...config.head_turn, peak_frac: v }
      }));
    })
  )));

  motionCurveFields.append(wrapCol(1, createFormGroup("Reverse Timing",
    createSliderInput(hc.head_turn.reverse_frac, { min: 0, max: 1, step: 0.01 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        head_turn: { ...config.head_turn, reverse_frac: v }
      }));
    })
  )));

  motionCurveFields.append(wrapCol(1, createFormGroup("Overshoot Timing",
    createSliderInput(hc.head_turn.overshoot_frac, { min: 0, max: 1, step: 0.01 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        head_turn: { ...config.head_turn, overshoot_frac: v }
      }));
    })
  )));

  motionCurveFields.append(wrapCol(1, createFormGroup("Closed Eye Scale",
    createSliderInput(hc.blink.eye_scale_y_closed, { min: 0, max: 1, step: 0.01 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        blink: { ...config.blink, eye_scale_y_closed: v }
      }));
    })
  )));

  body.append(motionCurveFields);

  const blinkCurveFields = document.createElement("div");
  blinkCurveFields.className = "bf-grid";

  blinkCurveFields.append(wrapCol(1, createFormGroup("Blink Close",
    createSliderInput(hc.blink.close_frac, { min: 0, max: 1, step: 0.01 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        blink: { ...config.blink, close_frac: v }
      }));
    })
  )));

  blinkCurveFields.append(wrapCol(1, createFormGroup("Hold Closed",
    createSliderInput(hc.blink.hold_closed_frac, { min: 0, max: 1, step: 0.01 }, v => {
      updateHaloConfig((config) => ({
        ...config,
        blink: { ...config.blink, hold_closed_frac: v }
      }));
    })
  )));

  body.append(blinkCurveFields);

  const toggleFields = document.createElement("div");
  toggleFields.className = "bf-grid";

  toggleFields.append(wrapCol(1, createCheckboxFormGroup(
    "Pulse Orbits",
    hc.screensaver?.pulse_orbits ?? false,
    (pulseOrbits) => {
      state.haloConfig = { ...hc, screensaver: { ...hc.screensaver!, pulse_orbits: pulseOrbits } };
      void ctx.renderStage();
    }
  )));

  toggleFields.append(wrapCol(1, createCheckboxFormGroup(
    "Pulse Spokes",
    hc.screensaver?.pulse_spokes ?? false,
    (pulseSpokes) => {
      state.haloConfig = { ...hc, screensaver: { ...hc.screensaver!, pulse_spokes: pulseSpokes } };
      void ctx.renderStage();
    }
  )));

  toggleFields.append(wrapCol(1, createCheckboxFormGroup(
    "Release Labels",
    hc.spoke_text?.enabled ?? false,
    (enabled) => {
      state.haloConfig = { ...hc, spoke_text: { ...hc.spoke_text!, enabled } };
      void ctx.renderStage();
    }
  )));

  body.append(toggleFields);

  if (hc.spoke_text?.enabled) {
    const labelFields = document.createElement("div");
    labelFields.className = "bf-grid";

    labelFields.append(wrapCol(1, createFormGroup("Label Size",
      createSliderInput(hc.spoke_text.font_size_px, { min: 3, max: 24, step: 0.5 }, v => {
        state.haloConfig = { ...hc, spoke_text: { ...hc.spoke_text!, font_size_px: v } }; void ctx.renderStage();
      })
    )));

    labelFields.append(wrapCol(1, createFormGroup("Label Position",
      createSliderInput(hc.spoke_text.radial_u, { min: 0, max: 1, step: 0.01 }, v => {
        state.haloConfig = { ...hc, spoke_text: { ...hc.spoke_text!, radial_u: v } }; void ctx.renderStage();
      })
    )));

    body.append(labelFields);
  }

  const debugFields = document.createElement("div");
  debugFields.className = "bf-grid";

  debugFields.append(wrapCol(1, createCheckboxFormGroup(
    "Reference Halo",
    hc.spoke_lines.show_reference_halo,
    (showReferenceHalo) => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, show_reference_halo: showReferenceHalo } };
      void ctx.renderStage();
    }
  )));

  debugFields.append(wrapCol(1, createCheckboxFormGroup(
    "Debug Masks",
    hc.spoke_lines.show_debug_masks,
    (showDebugMasks) => {
      state.haloConfig = { ...hc, spoke_lines: { ...hc.spoke_lines, show_debug_masks: showDebugMasks } };
      void ctx.renderStage();
    }
  )));

  body.append(debugFields);

  return root;
}
