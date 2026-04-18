# TODO

## Objective

Rebuild the current mascot-animation project in this new architecture and verify 1:1 functional parity here before continuing feature work.

Work should now center on:

- `c:\Users\lyubo\work\repos\brand-layout-ops`

The original app remains the reference implementation for behavior and output, not the place to continue product architecture work.

Reference source repo:

- `c:\Users\lyubo\work\repos\racoon-anim`

## Working Rules

- This file is the active source of truth for sequencing and status.
- Keep this file operational and short-term. Product shape, architecture, north stars, and open design questions belong in `ROADMAP.md`.
- Completed work belongs in `HISTORY.md`, not in the active queue.
- If priorities change mid-lane, record the new lane here and move displaced long-term thinking back to the roadmap instead of letting TODO turn into a second strategy document.

## Active Execution Queue

Lane P is active.

### Lane O — Stage shell ergonomics

Status: Paused after O1-O3. The shell follow-up did its job; O4/O5 stay deferred until there is a concrete zoom or pan need.

### Lane P — Format variants and preset groundwork

Goal: Stop treating saved sizes as if they were only export targets. The live workflow is already closer to authored per-format variants, so the next pass should make the shell, controller behavior, and terminology match that reality without breaking the current document format.

| Step | Status | Summary |
|------|--------|---------|
| P1 | Done | Reframed the shell surface around authored formats instead of generic target rows. `Document Setup...` is now `Formats...`, the modal copy speaks in terms of formats, and the table behaves like a format list while preserving the current serialized `project.targets` shape for compatibility |
| P2 | Done | Newly added formats now become active immediately. Because profile-bucket state already seeds from the current active format on first switch, new formats inherit a useful first-guess layout instead of forcing a second activation step |
| P3 | Done | Persistence and app-surface cleanup landed without breaking compatibility: the shared schema now exposes `OverlayDocumentFormat`, automation emits `document_formats` plus `document_active_format_id` alongside the legacy target keys, and the live app context or shell controller wiring now reads as formats instead of targets |
| P4 | Done | The first data-model slice is landed without a schema break: document formats now carry `formatPresetKey` and `derivedFromFormatId` metadata, built-in presets are now defined as one shared frame + safe-area + grid seed package, the shell exposes that model through `File -> Preset Library...`, and first-time variant seeding now respects that split by keeping preset-backed safe-area or grid seeds while custom sizes derive from the source format. Next: reuse `getOverlayFormatSeedSummary` inside `apps/overlay-preview/src/preview-shell-controller.ts` so the Preset Library dialog describes global preset seeds with the same canonical language the Formats workflow already uses, while keeping `project.targets` and future output-recipe work unchanged. |

## Immediate Next Steps

- Finish defining Lane P4 before reopening zoom, pan, or other shell polish.
- Keep document compatibility stable while the user-facing model shifts from targets to formats.
- Treat new format work as authoring behavior first. Export-recipes or output-operator work can follow once the authoring model is honest.

## Operational Constraints

- Do not re-introduce browser-local preset CRUD as the working-state authority.
- Do not start a saved-file schema rename until the shell and controller behavior settle.
- Keep `baseline-foundry` read-only from this repo unless a shared contract clearly belongs upstream.
- Prefer small validated slices over a one-shot format-system rewrite.

