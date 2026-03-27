# Vanilla + docs-typescale audit

## Bottom line

Use `docs-typescale` as a reference for token authoring and baseline-nudge generation, not as a drop-in override layer.

For `brand-layout-ops`, the right move is a preview-app-local dense Vanilla settings layer compiled before importing Vanilla, based loosely on the `apps` domain from `docs-typescale`, but expanded so it also overrides Vanilla's component-driving text maps and spacing primitives.

Do not copy the demo-only generated `h1` to `p` CSS as the main mechanism.

## What docs-typescale is doing well

The useful part of `docs-typescale` is the authoring pipeline:

- `config/typography-config-docs.json`
- `config/typography-config-editorial.json`
- `config/typography-config-apps.json`
- `src/{domain}/tokens.json`
- `scripts/generate-vanilla-text-settings.js`

That gives three domain-specific scales and preserves font-specific top nudges from the baseline nudge generator.

The `apps` domain is the closest precedent for panel UI density:

- `h1`, `h2`: `1.5rem / 2rem`
- `h3`, `h4`: `1.125rem / 1.5rem`
- `h5`, `h6`, `p`: `0.875rem / 1.25rem`
- baseline unit in that repo's config: `0.5rem`

That is a solid starting point for a compact control panel scale.

## What docs-typescale is not actually solving

### 1. Its `$baseline-unit` is not Vanilla's real rhythm switch

In `docs-typescale`, `$baseline-unit` is only used by the demo overlay and a few custom rules in `src/{domain}/main.scss`.

Vanilla's actual rhythm is driven by:

- `$sp-unit-ratio`
- `$sp-unit`
- `$settings-text-*` maps
- `$spv-nudge`
- `$input-margin-bottom`
- `$input-vertical-padding`

So the current `docs-typescale` automated override file is not really densifying Vanilla. It is mostly powering the demo grid and a couple of helper rules.

### 2. It only overrides a subset of Vanilla's text maps

`scripts/generate-vanilla-text-settings.js` generates:

- `$settings-text-h1`
- `$settings-text-h2`
- `$settings-text-h3`
- `$settings-text-h4`
- `$settings-text-h5`
- `$settings-text-h6`
- `$settings-text-p`

It does not generate or override the maps Vanilla uses all over components for control density and utility text:

- `$settings-text-default`
- `$settings-text-small`
- `$settings-text-small-dense`
- `$settings-text-x-small`
- mobile / large variants such as `$settings-text-h1-mobile`, `$settings-text-h1-large`, etc.

That means buttons, inputs, labels, tabs, tables, badges, navigation, and some panel internals still derive from Vanilla defaults rather than the custom domain scale.

This matters for `brand-layout-ops`, because the preview UI is built from exactly those component classes.

### 3. It falls back to post-Vanilla selector overrides

After importing and including Vanilla, `docs-typescale` imports generated CSS that directly overrides raw elements:

- `h1`
- `h2`
- `h3`
- `h4`
- `h5`
- `h6`
- `p`

That is fine for demos.

It is not the right foundation for a reusable layer, because it bypasses the shared Sass primitives that make Vanilla's internal component rhythm coherent.

### 4. It leaves Vanilla's large-screen text scaling logic half-alive

The manual override files in `docs-typescale` pin `$base-font-sizes`, but they do not turn off Vanilla's `$increase-font-size-on-larger-screens` behavior.

So the code path that changes root line-height on extra-large breakpoints is still conceptually active. For a dense tool panel UI, I would explicitly disable that behavior rather than relying on partial compensation.

### 5. There is at least one suspect generated artifact

`src/docs/_vanilla-text-settings.generated.scss` contains an obviously wrong `sp-after` value for `h6` compared with the source tokens in `src/docs/tokens.json`.

That makes me treat the generated Sass maps as helpful output, but not as unquestioned ground truth until the generator is tightened.

## Vanilla audit

Vanilla is still valuable here.

Its typography and component rhythm are coherent because a lot of the framework derives from the same small set of maps and spacing formulas:

- headings and paragraphs come from `%vf-heading-*` and `%paragraph`
- buttons use `$settings-text-default` and `$settings-text-small`
- forms use `$settings-text-default`, `$input-margin-bottom`, and `$input-vertical-padding`
- accordions and panel headings inherit those same text and spacing assumptions

That is why it stays visually aligned across controls better than most CSS frameworks.

The downside is that typography density is mostly compile-time Sass, not runtime CSS custom properties. Color theme scoping is easy. Type scale scoping is not.

So the framework is good for a dense panel bundle, but bad for a selector-scoped "light override layer" in the modern CSS-variable sense.

## What brand-layout-ops currently needs

The preview app already imports Vanilla globally in `apps/overlay-preview/src/styles.scss`, then themes it with CSS custom properties.

The UI also already uses dense-oriented component classes heavily:

- `p-button is-dense`
- `p-button--base is-dense`
- `p-form-validation__input is-dense`
- `p-form__group`
- `p-form-help-text`
- `p-accordion`
- `p-panel`

So the missing piece is not a lot of extra custom CSS. The missing piece is a compile-time dense type/spacing settings layer before Vanilla is imported.

## Recommended approach

### Recommendation

Create a preview-only dense Vanilla settings partial inside `brand-layout-ops`, and compile it before importing Vanilla in `apps/overlay-preview/src/styles.scss`.

Treat it as app-global within `overlay-preview`, not selector-scoped to just `.mascot-app`.

That is acceptable because:

- the preview app is already its own entrypoint
- the stage text is not driven by DOM typography anyway
- Vanilla's typography scale is not realistically scopeable per subtree without forking emitted selectors

### Recommended file shape

Something like:

- `apps/overlay-preview/src/_vanilla-density-settings.scss`
- `apps/overlay-preview/src/styles.scss`

And optionally later:

- `tools/typography/panel-config.json`
- `tools/typography/generate-vanilla-panel-settings.js`

### What that dense settings partial should own

At minimum:

- `$increase-font-size-on-larger-screens: false`
- `$sp-unit-ratio` or `$sp-unit`
- `$settings-text-default`
- `$settings-text-small`
- `$settings-text-small-dense`
- `$settings-text-x-small`
- `$settings-text-h1` through `$settings-text-h6`
- mobile variants for headings if you want responsive divergence, otherwise set them equal to the dense desktop values
- `$base-font-sizes`
- heading weights if needed

If this set is incomplete, the panel will still look "almost dense" while controls keep default Vanilla proportions.

## How much of docs-typescale to reuse

### Reuse directly

- the idea of domain JSON configs
- the use of baseline-nudge-generator output as source data
- the `apps` domain as the initial visual reference
- the habit of generating Sass maps instead of hand-tuning every selector

### Do not reuse directly

- the generated `h1` to `p` CSS overrides as the primary delivery mechanism
- the current automated override file that only defines `$baseline-unit`
- the demo HTML / baseline overlay machinery
- the watcher script as-is

### Port only if needed

Port the generator only after expanding it to emit the full set of Vanilla maps the panel actually uses.

If I want the shortest path in `brand-layout-ops`, I would hand-author the dense maps first, then only bring generation back in once the shape is correct.

## Suggested panel scale strategy

I would start from the `docs-typescale` `apps` domain, not from `docs` or `editorial`.

Then decide between two levels:

### Safe first pass

- keep the `apps` scale essentially as-is
- use it to tighten the panel without risking illegibility

### More aggressive dense pass

Generate a fourth domain specifically for preview panels, still on an `0.5rem` grid, but with smaller default/helper text.

The shape I would test first is:

- default body / form text around `0.8125rem` with `1.25rem` line-height
- small text around `0.75rem` with `1rem` or `1.25rem` line-height depending on control density
- x-small helper/meta text around `0.6875rem` to `0.75rem`

I would not hardcode nudge values for that by hand. I would generate them from the same font metrics workflow used in `docs-typescale`.

## Important constraint: scope

If the goal is literally "apply smaller Vanilla typography only inside one subtree," Vanilla fights that because the type scale is resolved in Sass before emission.

So there are really only three sane options:

1. Make the entire `overlay-preview` app use the dense Vanilla bundle.
2. Build a second custom-namespaced fork of emitted selectors, which is more work than it is worth here.
3. Keep global Vanilla defaults and restyle every panel component manually, which defeats the point of leaning on Vanilla's rhythm system.

For this project, option 1 is the right answer.

## Version note

There is version drift:

- `docs-typescale`: `vanilla-framework ^4.30.0`
- `brand-layout-ops`: `vanilla-framework ^4.46.0`
- local `vanilla-framework` repo in this workspace: `4.47.0`

The relevant text-map structure still looks compatible enough to reuse the concept, but any implementation in `brand-layout-ops` should target the `4.46.x` / `4.47.x` behavior, not assumptions frozen in the older demo repo.

## Practical plan for the next implementation pass

1. Add a dense settings partial in `apps/overlay-preview/src` and import it before `vanilla-framework`.
2. Disable Vanilla's large-screen auto scaling for the panel bundle.
3. Override the full family of text maps used by buttons, forms, helper text, headings, and accordion/panel chrome.
4. Keep the current color-theme CSS custom properties unchanged.
5. Do not port the demo overlay code.
6. Only after the hand-authored dense layer feels right, decide whether to port a cleaned-up generator from `docs-typescale`.

## Personal conclusion

`docs-typescale` proved the right idea, but not the final delivery shape.

For `brand-layout-ops`, I want:

- Vanilla's component rhythm
- a denser compile-time text system
- preview-app-local scope
- no demo baggage
- no post-hoc element overrides as the core mechanism

So the reusable asset is the token-generation mindset plus the `apps` scale reference, while the actual implementation should be a smaller, stricter Sass settings layer built directly in `brand-layout-ops`.

## Follow-up recommendation: keep Vanilla or replace it?

For this specific project, if the real target is only:

- text styles
- form controls
- accordion
- panel shell

and the desired outcome is a very dense, baseline-aligned control UI around a 12pt body, I would not keep investing in Vanilla as the long-term implementation.

I would use Vanilla as a reference model, then replace it with a small custom panel system.

### Why

The current `overlay-preview` usage is narrow. In practice the app is mostly relying on a small family of patterns:

- buttons
- labels and help text
- text inputs, selects, textareas
- accordion markup
- panel container styling

That is a small enough surface area that a custom implementation is realistic.

The cost of continuing with Vanilla is not just bytes. It is also:

- compile-time global Sass coupling
- hard-to-scope typography decisions
- a legacy architecture shaped for a much broader component library
- carrying patterns and assumptions you do not need

For a compact authoring panel, that is unnecessary drag.

### Important nuance

I am not recommending a from-scratch rewrite of Vanilla as a framework.

I am recommending a from-scratch implementation of the few panel primitives this app actually needs, using your baseline-nudge-generator as the typography source of truth.

That is a much smaller and cleaner task.

### What I would build instead

A small internal UI layer for `overlay-preview` with:

- generated typography tokens from baseline-nudge-generator
- one dense control scale centered on a 12pt body
- explicit component primitives for `Button`, `Field`, `Input`, `Select`, `Textarea`, `HelpText`, `Accordion`, and `Panel`
- CSS custom properties for color theming
- generated top/bottom text nudges so controls sit on the same baseline grid

### Architecture I would prefer

1. A `panel-typography.json` config that defines the dense control scale.
2. A generator step that emits tokens for:
	- body / default text
	- label text
	- helper text
	- section heading text
	- button text
3. A tiny SCSS or CSS layer that consumes those tokens and styles only the needed components.
4. No dependency on Vanilla at runtime.

### Why this is the better fit

If the only non-negotiable requirement is "dense controls that still align to a baseline grid," your package is already the more important technology than Vanilla.

Vanilla gave a good reference for component rhythm, but your generator is the part that can make a lean custom system precise.

### My actual recommendation

If you want the fastest low-risk result, do one short interim pass with a dense Vanilla settings layer.

If you want the right medium-term architecture, build a tiny custom panel UI system and remove Vanilla from `overlay-preview`.

Given the current dependency surface, I think the medium-term answer is the better one.