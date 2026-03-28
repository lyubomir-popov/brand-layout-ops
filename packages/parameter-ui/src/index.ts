export {
  buildAccordionSectionEl,
  createCheckboxFormGroup,
  createCheckboxInput,
  createFormGroup,
  createNumberInput,
  createReadonlySpan,
  createSelectInput,
  createSliderInput,
  setupAccordion,
  wrapCol
} from "./accordion-form-helpers.js";

export interface FieldHandle<TElement extends HTMLElement> {
  root: HTMLElement;
  input: TElement;
}

export interface SectionHandle {
  root: HTMLElement;
  body: HTMLElement;
}

export type ParameterSectionFactory = () => HTMLElement;

export interface ParameterSectionDefinition {
  key: string;
  order: number;
  /** Optional group tag. Sections with no group are always visible.
   *  Sections tagged with an operator key are only shown when that operator is selected. */
  group?: string | undefined;
  factory: ParameterSectionFactory;
  afterRender?: (() => void) | undefined;
}

export interface ParameterSectionRegistry {
  register(section: ParameterSectionDefinition): void;
  registerMany(sections: Iterable<ParameterSectionDefinition>): void;
  getSections(): ParameterSectionDefinition[];
}

interface BaseFieldOptions {
  label: string;
  hint?: string;
}

export interface NumberFieldOptions extends BaseFieldOptions {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onInput(value: number): void;
}

export interface CheckboxFieldOptions extends BaseFieldOptions {
  checked: boolean;
  onInput(checked: boolean): void;
}

export interface TextAreaFieldOptions extends BaseFieldOptions {
  value: string;
  rows?: number;
  placeholder?: string;
  onInput(value: string): void;
}

export interface SelectFieldOption {
  label: string;
  value: string;
}

export interface SelectFieldOptions extends BaseFieldOptions {
  value: string;
  options: SelectFieldOption[];
  onInput(value: string): void;
}

export interface ReadoutFieldOptions extends BaseFieldOptions {
  value: string;
}

function appendHint(container: HTMLElement, hint?: string): void {
  if (!hint) {
    return;
  }

  const hintElement = document.createElement("p");
  hintElement.className = "parameter-field__hint";
  hintElement.textContent = hint;
  container.append(hintElement);
}

export function createSection(title: string, description?: string): SectionHandle {
  const root = document.createElement("section");
  root.className = "parameter-section";

  const header = document.createElement("header");
  header.className = "parameter-section__header";

  const titleElement = document.createElement("h2");
  titleElement.className = "parameter-section__title";
  titleElement.textContent = title;
  header.append(titleElement);

  if (description) {
    const descriptionElement = document.createElement("p");
    descriptionElement.className = "parameter-section__description";
    descriptionElement.textContent = description;
    header.append(descriptionElement);
  }

  const body = document.createElement("div");
  body.className = "parameter-section__body";

  root.append(header, body);
  return { root, body };
}

export function createParameterSectionRegistry(
  initialSections: Iterable<ParameterSectionDefinition> = []
): ParameterSectionRegistry {
  const sections = new Map<string, ParameterSectionDefinition>();

  const register = (section: ParameterSectionDefinition) => {
    sections.set(section.key, section);
  };

  const registerMany = (entries: Iterable<ParameterSectionDefinition>) => {
    for (const section of entries) {
      register(section);
    }
  };

  registerMany(initialSections);

  return {
    register,
    registerMany,
    getSections: () => [...sections.values()].sort((left, right) => left.order - right.order)
  };
}

export function createNumberField(options: NumberFieldOptions): FieldHandle<HTMLInputElement> {
  const root = document.createElement("label");
  root.className = "parameter-field";

  const label = document.createElement("span");
  label.className = "parameter-field__label";
  label.textContent = options.label;

  const input = document.createElement("input");
  input.className = "parameter-field__input";
  input.type = "number";
  input.value = String(options.value);
  if (Number.isFinite(options.min)) {
    input.min = String(options.min);
  }
  if (Number.isFinite(options.max)) {
    input.max = String(options.max);
  }
  if (Number.isFinite(options.step)) {
    input.step = String(options.step);
  }
  input.addEventListener("input", () => {
    const nextValue = Number(input.value);
    if (!Number.isFinite(nextValue)) {
      return;
    }
    options.onInput(nextValue);
  });

  root.append(label, input);
  appendHint(root, options.hint);
  return { root, input };
}

export function createCheckboxField(options: CheckboxFieldOptions): FieldHandle<HTMLInputElement> {
  const root = document.createElement("label");
  root.className = "parameter-field parameter-field--checkbox";

  const input = document.createElement("input");
  input.className = "parameter-field__checkbox";
  input.type = "checkbox";
  input.checked = options.checked;
  input.addEventListener("input", () => {
    options.onInput(input.checked);
  });

  const label = document.createElement("span");
  label.className = "parameter-field__label";
  label.textContent = options.label;

  root.append(input, label);
  appendHint(root, options.hint);
  return { root, input };
}

export function createTextAreaField(options: TextAreaFieldOptions): FieldHandle<HTMLTextAreaElement> {
  const root = document.createElement("label");
  root.className = "parameter-field";

  const label = document.createElement("span");
  label.className = "parameter-field__label";
  label.textContent = options.label;

  const input = document.createElement("textarea");
  input.className = "parameter-field__textarea";
  input.rows = options.rows ?? 5;
  input.value = options.value;
  if (options.placeholder) {
    input.placeholder = options.placeholder;
  }
  input.addEventListener("input", () => {
    options.onInput(input.value);
  });

  root.append(label, input);
  appendHint(root, options.hint);
  return { root, input };
}

export function createSelectField(options: SelectFieldOptions): FieldHandle<HTMLSelectElement> {
  const root = document.createElement("label");
  root.className = "parameter-field";

  const label = document.createElement("span");
  label.className = "parameter-field__label";
  label.textContent = options.label;

  const input = document.createElement("select");
  input.className = "parameter-field__input";

  for (const option of options.options) {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    optionElement.selected = option.value === options.value;
    input.append(optionElement);
  }

  input.addEventListener("input", () => {
    options.onInput(input.value);
  });

  root.append(label, input);
  appendHint(root, options.hint);
  return { root, input };
}

export function createReadoutField(options: ReadoutFieldOptions): HTMLElement {
  const root = document.createElement("div");
  root.className = "parameter-field parameter-field--readout";

  const label = document.createElement("span");
  label.className = "parameter-field__label";
  label.textContent = options.label;

  const value = document.createElement("output");
  value.className = "parameter-field__readout";
  value.textContent = options.value;

  root.append(label, value);
  appendHint(root, options.hint);
  return root;
}