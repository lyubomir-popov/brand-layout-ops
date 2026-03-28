# UI Parity Audit — Reference vs Current

> Generated from exhaustive read of `racoon-anim/src/app/index.js`, `config-schema.js`, `editor-constants.js`, `default-config-source.js`.
> Compared against `apps/overlay-preview/src/main.ts` accordion sections.

Legend: ✅ = implemented, ⚠️ = partial/different, ❌ = missing

---

## 1. Output Profile Selection

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| 5 profile radio tabs (landscape, instagram, story, screen, tablet) | ✅ | ✅ | `buildOutputFormatSection` → `buildOutputProfileOptions` |

---

## 2. Overlay — Visibility & Guides

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Show Overlay System (checkbox) | ✅ | ✅ | "Show overlay" in Playback & Export section |
| Show Guides (checkbox, `W` shortcut) | ✅ | ⚠️ | We use a 3-option dropdown in Grid section (`off / composition / baseline`) instead of a checkbox, but the `W` or `G` cycle and the baseline option are implemented. |

---

## 3. Overlay — Content Source & Format

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Content format dropdown | ✅ | ✅ | `buildContentFormatSection` |
| Content source radio (inline / CSV) | ✅ | ✅ | Dropdown instead of radio; functionally equivalent |
| CSV path text input | ✅ | ⚠️ | We use an inline textarea for CSV data instead of a file path. Acceptable divergence for browser app. |

---

## 4. Overlay — Text Styles Editor (A Head / B Head / Paragraph tabs)

The reference has a tabbed text-styles sub-panel where each style tab exposes editable size, line-height, and weight, plus **match buttons** to sync related styles.

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Style tabs (A Head / B Head / Paragraph) | ✅ | ❌ | We have a "Paragraph Styles" palette for applying styles to fields, but no editable per-style properties panel |
| Font Size (px) per style | ✅ | ❌ | Per-profile defaults exist in `sample-document.ts` but not editable in UI |
| Line Height (px) per style | ✅ | ❌ | Same |
| Font Weight per style | ✅ | ❌ | Same |
| Match A Head → B Head button | ✅ | ❌ | |
| Match A Head → Paragraph button | ✅ | ❌ | |
| Match A Head → Logo button | ✅ | ❌ | Linked logo scaling exists in code but no explicit match button |

---

## 5. Overlay — Selected Text Element Editor

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Item toolbar (add / duplicate / delete / move up / move down) | ✅ | ⚠️ | We have an action row; verify all 5 actions present |
| Text textarea (inline editing) | ✅ | ✅ | |
| Style dropdown | ✅ | ⚠️ | We use palette buttons in a separate section instead of inline dropdown |
| Row number input | ✅ | ✅ | "Row" |
| Column (keyline) number input | ✅ | ✅ | "Keyline" |
| Y Offset (baselines) number input | ✅ | ✅ | "Y Offset" |
| Column Span number input | ✅ | ✅ | "Span" |
| CSV edit status indicator | ✅ | ❌ | Shows which CSV column maps to the selected field |

---

## 6. Overlay — Logo Section

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Logo asset path text input | ✅ | ❌ | We use a hardcoded asset path |
| Logo X position | ✅ | ✅ | Number input |
| Logo Y position | ✅ | ✅ | Number input |
| Logo height slider | ✅ | ⚠️ | We have height as number input (not slider). Also expose width (extra). |

---

## 7. Layout Grid

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Baseline step (px) | ✅ | ✅ | |
| Row count | ✅ | ✅ | |
| Column count | ✅ | ✅ | |
| Margin Top (baselines) | ✅ | ✅ | |
| Margin Bottom (baselines) | ✅ | ✅ | |
| Margin Left (baselines) | ✅ | ✅ | |
| Margin Right (baselines) | ✅ | ✅ | |
| Row Gutter (baselines) | ✅ | ✅ | |
| Column Gutter (baselines) | ✅ | ✅ | Labeled "Col Gutter" in our grid section |
| Fit Within Safe Area (checkbox) | ✅ | ✅ | |
| Overlay Background Above Animation (checkbox) | ✅ | ❌ | Controls z-order of safe-area background panel vs mascot/halo |
| Safe Area Top (px) — conditional | ✅ | ✅ | Shown only when Fit Within Safe Area is ON |
| Safe Area Right (px) — conditional | ✅ | ✅ | Same |
| Safe Area Bottom (px) — conditional | ✅ | ✅ | Same |
| Safe Area Left (px) — conditional | ✅ | ✅ | Same |

---

## 8. Playback & Export

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Play / Pause toggle | ✅ | ✅ | |
| Export Frame (PNG) | ✅ | ✅ | |
| Reset Defaults button | ✅ | ✅ | |
| Write Source Default button | ✅ | ✅ | |
| Source default status text | ✅ | ✅ | |
| Transparent PNG background checkbox | ✅ | ✅ | |
| Export MP4 button → modal | ✅ | ❌ | No export modal, no MP4 pipeline |
| Export PNG Sequence button → modal | ✅ | ✅ | Opens a frame-range modal and writes via File System Access when available |

---

## 9. Export Options Modal

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Start Frame / End Frame inputs | ✅ | ✅ | |
| Frame Count & Duration display | ✅ | ✅ | |
| Fade In checkbox (MP4 only) | ✅ | ❌ | |
| Fade Out checkbox (MP4 only) | ✅ | ❌ | |
| Submit / Cancel buttons | ✅ | ✅ | |

---

## 10. Presets

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Preset tabs list with "Active" badge | ✅ | ✅ | |
| Save Preset button | ✅ | ✅ | |
| Update Preset button | ✅ | ✅ | |
| Delete Preset button | ✅ | ✅ | |
| Export Preset (JSON) button | ✅ | ✅ | |
| Import Preset (JSON) file input | ✅ | ✅ | |
| Preset name input | ✅ | ✅ | Editable name field above the preset actions |
| Preset meta status display | ✅ | ❌ | Success/error messages for preset operations |

---

## 11. Global Brand Settings (Presets Tab in reference)

The reference has a "Presets" tab with global brand settings shared across all output profiles.

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Title Text (global) | ✅ | ❌ | We have per-field inline text, no global title concept |
| Logo Asset Path (global) | ✅ | ❌ | |
| Background Color | ✅ | ⚠️ | In our Halo Field section as "Background" color picker |
| Safe Area Fill Color | ✅ | ❌ | |
| Construction Plane Color | ✅ | ✅ | In Halo Field section as "Construction" |
| Reference Spoke Color | ✅ | ✅ | In Halo Field section as "Reference" |
| Echo Marker Color | ✅ | ✅ | In Halo Field section as "Echo Color" |
| Overlay Text Color | ✅ | ❌ | We don't expose overlay text color as a control |
| Mascot Color | ✅ | ❌ | Mascot rendering now exists, but no dedicated mascot color control is exposed |

---

## 12. Field — Stage (Composition)

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Position X (px) | ✅ | ❌ | Derived from `getOutputProfileMetrics` center; not user-adjustable |
| Position Y (px) | ✅ | ❌ | Same |
| Background Color | ✅ | ⚠️ | In Halo Field section |
| Composition Scale | ✅ | ✅ | "Scale" slider in Halo Field section |

---

## 13. Field — Generator Wrangle

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Inner Radius | ✅ | ✅ | Slider |
| Outer Radius | ✅ | ✅ | Slider |
| Max Orbits | ✅ | ✅ | "Orbits" number input |
| Max Spokes | ✅ | ✅ | "Spokes" number input |
| Phase Count | ✅ | ✅ | Number input |
| Min Orbits | ✅ | ✅ | "Min Active Orbits" number input |

---

## 14. Field — Mascot Asset

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Native Asset Width (px) | ✅ | ❌ | No mascot asset system yet |

---

## 15. Halo — Spoke Lines

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Show SVG Halo Reference (checkbox) | ✅ | ✅ | Exposed as "Show Reference Halo" |
| Show Phase Debug Overlay (checkbox) | ✅ | ✅ | Exposed as "Show Debug Masks" |
| Construction Plane Color | ✅ | ✅ | |
| Reference Spoke Color | ✅ | ✅ | |
| Echo Marker Color | ✅ | ✅ | |
| Outer Spoke Thickness (px) | ✅ | ✅ | "Spoke Width" slider |
| Echo Shape Stroke (px) | ✅ | ✅ | Exposed as "Echo Stroke" |
| Echo Shape Scale Multiplier | ✅ | ✅ | Exposed as "Echo Scale" |
| Echo Sparse Scale Boost | ✅ | ✅ | Exposed as "Sparse Boost" |
| Inner Spoke Start Thickness (px) | ✅ | ⚠️ | "Phase Width" maps to start thickness |
| Inner Spoke End Thickness (px) | ✅ | ✅ | Exposed as "Phase End Width" |
| Echo Count | ✅ | ✅ | |
| Echo Marker Style | ✅ | ✅ | "Echo Style" dropdown; we also have extra styles (diamond, star, hexagon, radial_dash) |
| Echo Shape Seed | ✅ | ✅ | |
| Mixed Shape Replacement | ✅ | ✅ | Exposed as "Mix Shape %" |
| Echo Dot Scale Multiplier | ✅ | ✅ | Exposed as "Echo Scale" |
| Echo Ripple Count | ✅ | ✅ | |
| Echo Outer Fade | ✅ | ✅ | Exposed as "Echo Fade" |

---

## 16. Halo — Release Labels (spoke_text)

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Show Release Labels (checkbox) | ✅ | ✅ | Release labels are rendered on the overlay canvas |
| Label Font Size (px) | ✅ | ✅ | Exposed as "Label Size" |
| Label Position (u) | ✅ | ✅ | Exposed as "Label Position" |

---

## 17. Halo — Screensaver Loop

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Breath Cycle (sec) | ✅ | ✅ | Slider |
| Breath Ramp In (sec) | ✅ | ✅ | Slider |
| Pulse Orbits (checkbox) | ✅ | ✅ | |
| Pulse Spokes (checkbox) | ✅ | ✅ | |
| Min Spokes | ✅ | ✅ | Slider |
| Phase Boundary Transition (sec) | ✅ | ✅ | "Boundary Ease" slider |

---

## 18. Vignette

Entire vignette tab is missing from the current UI.

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Show Vignette (checkbox) | ✅ | ❌ | |
| Vignette Outside Safe Area (checkbox) | ✅ | ❌ | |
| Safe Area Radius (px) | ✅ | ❌ | |
| Safe Area Feather (px) | ✅ | ❌ | |
| Safe Area Choke | ✅ | ❌ | |
| Outside Radius (px) — conditional | ✅ | ❌ | |
| Outside Feather (px) — conditional | ✅ | ❌ | |
| Outside Choke — conditional | ✅ | ❌ | |
| Shape Fade | ✅ | ❌ | |
| Shape Fade Start | ✅ | ❌ | |
| Shape Fade End | ✅ | ❌ | |
| Dither | ✅ | ❌ | |

---

## 19. Dots — Motion (transition_wrangle)

Dot motion controls are mostly missing. The renderer handles dot animation internally but doesn't expose the full parametric surface.

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Duration (sec) | ✅ | ❌ | |
| Spins | ✅ | ❌ | |
| Emit Frac | ✅ | ❌ | |
| Alpha Ramp Duration | ✅ | ❌ | |
| Orbit Count Start/End Frac | ✅ | ❌ | |
| Capture Start Frac | ✅ | ❌ | |
| Orbit Stagger Frac | ✅ | ❌ | |
| Speed Mult Per Orbit | ✅ | ❌ | |
| Spawn Angle Offset (deg) | ✅ | ❌ | |
| Occlusion Arc (deg) | ✅ | ❌ | |
| Base Pscale | ✅ | ❌ | |
| Orbital Frontier Amount/Width/Bias | ✅ | ❌ | |
| Phase Frontier Amount/Width/Bias | ✅ | ❌ | |

---

## 20. Dots — Style (point_style)

| Control | Ref | Current | Notes |
|---------|-----|---------|-------|
| Dot Color | — | ✅ | We have "Dot Color" picker; reference doesn't have a dedicated dot color picker (uses composition-level color) |
| Base Dot Size Multiplier | ✅ | ❌ | |
| Min Dot Scale | ✅ | ❌ | |
| Min Dot Diameter (px) | ✅ | ❌ | |

---

## Summary

| Category | Total Controls | ✅ Implemented | ⚠️ Partial | ❌ Missing |
|----------|---------------|---------------|------------|-----------|
| Output Profile | 1 | 1 | 0 | 0 |
| Visibility & Guides | 2 | 1 | 1 | 0 |
| Content Source & Format | 3 | 2 | 1 | 0 |
| Text Styles Editor | 6 | 0 | 0 | 6 |
| Selected Element | 8 | 5 | 2 | 1 |
| Logo | 4 | 2 | 1 | 1 |
| Layout Grid | 15 | 14 | 0 | 1 |
| Playback & Export | 8 | 7 | 0 | 1 |
| Export Modal | 5 | 3 | 0 | 2 |
| Presets | 8 | 7 | 0 | 1 |
| Global Brand Settings | 9 | 3 | 1 | 5 |
| Composition (Stage) | 4 | 1 | 1 | 2 |
| Generator Wrangle | 6 | 6 | 0 | 0 |
| Mascot Asset | 1 | 0 | 0 | 1 |
| Halo Spoke Lines | 18 | 17 | 1 | 0 |
| Release Labels | 3 | 3 | 0 | 0 |
| Screensaver Loop | 6 | 6 | 0 | 0 |
| Vignette | 12 | 0 | 0 | 12 |
| Dot Motion | 17 | 0 | 0 | 17 |
| Dot Style | 4 | 1 | 0 | 3 |
| **Total** | **140** | **79** | **8** | **53** |

**Coverage: 79 / 140 implemented (56%), 8 partial (6%), 53 missing (38%)**

### Priority gaps for parity

1. **Text Styles Editor** — editable font size / line height / weight per style, match buttons
2. **Overlay Background Above Animation** — safe-area fill z-order toggle still missing
3. **MP4 export UI parity** — no one-click MP4 modal with fade-in or fade-out options yet
4. **Dot motion controls** — `transition_wrangle` remains mostly internal rather than surfaced in the editor
5. **Halo spoke details** — echo shape stroke, scale, seed, ripple, fade controls
6. **Vignette** — entire subsystem and UI
7. **Dot motion** — parametric controls for transition_wrangle
8. **Release labels** — rendering + 3 controls
9. **Mascot composition** — asset system, width control
10. **Preset name input** — editable name field
