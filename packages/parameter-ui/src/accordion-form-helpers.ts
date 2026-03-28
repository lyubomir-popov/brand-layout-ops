/**
 * Accordion form helpers — Vanilla-framework styled form primitives
 * used by preview-panel section builders.
 *
 * These use Vanilla Framework / portable-vertical-rhythm CSS classes
 * (p-form, p-accordion, p-checkbox) and are the working UI primitives
 * for the current accordion-based config editor.
 */

// ── Counters ──────────────────────────────────────────────────────────

let accordionIdCounter = 0;
let checkboxFieldIdCounter = 0;

// ── Form groups ───────────────────────────────────────────────────────

export function createFormGroup(label: string, control: HTMLElement): HTMLElement {
  const group = document.createElement("div");
  group.className = "p-form__group";

  const lbl = document.createElement("label");
  lbl.className = "p-form__label u-no-margin--bottom";
  lbl.textContent = label;

  const ctrl = document.createElement("div");
  ctrl.className = "p-form__control";
  ctrl.append(control);

  group.append(lbl, ctrl);
  return group;
}

export function createCheckboxFormGroup(
  label: string,
  checked: boolean,
  onChange: (v: boolean) => void,
  configureInput?: (input: HTMLInputElement) => void
): HTMLElement {
  const group = document.createElement("div");
  group.className = "p-form__group p-form__group--checkbox";

  const ctrl = document.createElement("div");
  ctrl.className = "p-form__control";

  const checkbox = document.createElement("div");
  checkbox.className = "p-checkbox";

  const inputId = `preview-checkbox-${++checkboxFieldIdCounter}`;
  const input = createCheckboxInput(checked, onChange);
  input.id = inputId;
  input.className = "p-checkbox__input";
  configureInput?.(input);

  const inputLabel = document.createElement("label");
  inputLabel.className = "p-checkbox__label";
  inputLabel.htmlFor = inputId;
  inputLabel.textContent = label;

  checkbox.append(input, inputLabel);
  ctrl.append(checkbox);
  group.append(ctrl);
  return group;
}

// ── Input primitives ──────────────────────────────────────────────────

export function createNumberInput(
  value: number,
  opts: { min?: number; max?: number; step?: number },
  onChange: (v: number) => void
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "number";
  input.className = "p-form-validation__input vr-input--number is-dense";
  input.value = String(value);
  if (opts.min !== undefined) input.min = String(opts.min);
  if (opts.max !== undefined) input.max = String(opts.max);
  if (opts.step !== undefined) input.step = String(opts.step);
  input.addEventListener("change", () => {
    const v = parseFloat(input.value);
    if (Number.isFinite(v)) onChange(v);
  });
  return input;
}

export function createSliderInput(
  value: number,
  opts: { min: number; max: number; step: number },
  onChange: (v: number) => void
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "slider-pair slider-pair--stacked p-slider__wrapper";

  const range = document.createElement("input");
  range.type = "range";
  range.min = String(opts.min);
  range.max = String(opts.max);
  range.step = String(opts.step);
  range.value = String(value);

  const num = document.createElement("input");
  num.type = "number";
  num.className = "p-form-validation__input p-slider__input is-dense";
  num.min = String(opts.min);
  num.max = String(opts.max);
  num.step = String(opts.step);
  num.value = String(value);

  range.addEventListener("input", () => {
    const v = parseFloat(range.value);
    if (Number.isFinite(v)) { num.value = String(v); onChange(v); }
  });
  num.addEventListener("change", () => {
    const v = parseFloat(num.value);
    if (Number.isFinite(v)) { range.value = String(v); onChange(v); }
  });

  wrap.append(range, num);
  return wrap;
}

export function createSelectInput(
  value: string,
  options: Array<{ label: string; value: string }>,
  onChange: (v: string) => void
): HTMLSelectElement {
  const sel = document.createElement("select");
  sel.className = "p-form-validation__input is-dense";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    o.selected = opt.value === value;
    sel.append(o);
  }
  sel.addEventListener("change", () => onChange(sel.value));
  return sel;
}

export function createCheckboxInput(checked: boolean, onChange: (v: boolean) => void): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  return input;
}

// ── Accordion section ─────────────────────────────────────────────────

export function buildAccordionSectionEl(title: string): { root: HTMLElement; body: HTMLElement } {
  const id = `accordion-tab-${++accordionIdCounter}`;
  const sectionId = `${id}-section`;

  const root = document.createElement("li");
  root.className = "p-accordion__group";

  const heading = document.createElement("div");
  heading.setAttribute("role", "heading");
  heading.setAttribute("aria-level", "3");
  heading.className = "p-accordion__heading";

  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "p-accordion__tab";
  tab.id = id;
  tab.setAttribute("aria-controls", sectionId);
  tab.setAttribute("aria-expanded", "false");
  tab.textContent = title;
  heading.append(tab);

  const body = document.createElement("section");
  body.className = "p-accordion__panel config-group";
  body.id = sectionId;
  body.setAttribute("aria-hidden", "true");
  body.setAttribute("aria-labelledby", id);

  root.append(heading, body);
  return { root, body };
}

export function setupAccordion(accordionContainer: HTMLElement): void {
  accordionContainer.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>(".p-accordion__tab");
    if (!target) return;

    const panelId = target.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel) return;

    const isOpen = target.getAttribute("aria-expanded") === "true";

    // Mutual exclusion: close all other sections when opening one
    if (!isOpen) {
      accordionContainer.querySelectorAll<HTMLElement>(".p-accordion__tab").forEach((tab) => {
        if (tab !== target) {
          const otherPanelId = tab.getAttribute("aria-controls");
          const otherPanel = otherPanelId ? document.getElementById(otherPanelId) : null;
          tab.setAttribute("aria-expanded", "false");
          otherPanel?.setAttribute("aria-hidden", "true");
        }
      });
    }

    target.setAttribute("aria-expanded", String(!isOpen));
    panel.setAttribute("aria-hidden", String(isOpen));
  });
}

// ── Layout helpers ────────────────────────────────────────────────────

export function wrapCol(span: number, el: HTMLElement): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = `col-${span}`;
  wrapper.append(el);
  return wrapper;
}

export function createReadonlySpan(value: string): HTMLElement {
  const span = document.createElement("span");
  span.className = "p-form-help-text";
  span.textContent = value;
  return span;
}
