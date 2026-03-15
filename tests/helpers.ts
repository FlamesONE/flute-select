import { expect } from 'vitest';
import type { SelectOption, SelectItem, SelectSeparator } from '../src/types';

// ── Data fixtures ───────────────────────────────────────────

export const FRUITS: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'grape', label: 'Grape' },
  { value: 'pineapple', label: 'Pineapple' },
];

export const FRUITS_WITH_DISABLED: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana', disabled: true },
  { value: 'cherry', label: 'Cherry' },
];

export const GROUPED: SelectItem[] = [
  {
    label: 'Fruits',
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
    ],
  },
  {
    label: 'Vegetables',
    options: [
      { value: 'carrot', label: 'Carrot' },
      { value: 'broccoli', label: 'Broccoli' },
    ],
  },
];

export const RICH_OPTIONS: SelectOption[] = [
  { value: '1', label: 'John Doe', description: 'john@example.com', image: '/john.jpg' },
  { value: '2', label: 'Jane Smith', description: 'jane@example.com', icon: '<svg></svg>' },
];

export const WITH_SEPARATORS: SelectItem[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { separator: true } as SelectSeparator,
  { value: 'carrot', label: 'Carrot' },
  { value: 'daikon', label: 'Daikon' },
];

export const EMPTY: SelectOption[] = [];

// ── DOM helpers ─────────────────────────────────────────────

export function createAnchor(): HTMLDivElement {
  const el = document.createElement('div');
  el.id = `anchor-${Math.random().toString(36).slice(2, 8)}`;
  document.body.appendChild(el);
  return el;
}

export function createNativeSelect(
  options: {
    value: string;
    label: string;
    selected?: boolean;
    disabled?: boolean;
    group?: string;
  }[],
): HTMLSelectElement {
  const select = document.createElement('select');
  const groups = new Map<string, HTMLOptGroupElement>();

  for (const opt of options) {
    const optionEl = document.createElement('option');
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    if (opt.selected) optionEl.selected = true;
    if (opt.disabled) optionEl.disabled = true;

    if (opt.group) {
      let group = groups.get(opt.group);
      if (!group) {
        group = document.createElement('optgroup');
        group.label = opt.group;
        select.appendChild(group);
        groups.set(opt.group, group);
      }
      group.appendChild(optionEl);
    } else {
      select.appendChild(optionEl);
    }
  }

  document.body.appendChild(select);
  return select;
}

// ── Action helpers ──────────────────────────────────────────

export function click(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

export function mouseDown(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
}

export function mouseEnter(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
}

export function pressKey(key: string, opts?: Partial<KeyboardEvent>): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }),
  );
}

export function typeInSearch(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export function clickOutside(): void {
  document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
}

// ── Query helpers ───────────────────────────────────────────

export function getTrigger(container: HTMLElement): HTMLElement {
  return container.querySelector('button[role="combobox"]') as HTMLElement;
}

export function getDropdown(): HTMLElement | null {
  return document.querySelector('.fs__dropdown--open');
}

export function getVisibleOptions(): HTMLElement[] {
  const dropdown = document.querySelector('.fs__dropdown--open');
  if (!dropdown) return [];
  return Array.from(dropdown.querySelectorAll('.fs__option'));
}

export function getHighlighted(): HTMLElement | null {
  return document.querySelector('.fs__option--highlighted');
}

export function getSelected(): HTMLElement[] {
  return Array.from(document.querySelectorAll('.fs__option--selected'));
}

export function getSearchInput(): HTMLInputElement | null {
  return document.querySelector('.fs__search-input');
}

export function getHiddenInputs(container: HTMLElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll('input[type="hidden"]'));
}

export function getTags(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('.fs__tag'));
}

export function getSeparators(): HTMLElement[] {
  return Array.from(document.querySelectorAll('.fs__separator'));
}

export function getGroupLabels(): HTMLElement[] {
  return Array.from(document.querySelectorAll('.fs__group-label'));
}

// ── Assertion helpers (like Headless UI) ────────────────────

export function assertOpen(container: HTMLElement): void {
  expect(container.classList.contains('fs--open')).toBe(true);
  expect(getDropdown()).not.toBeNull();
  expect(getTrigger(container).getAttribute('aria-expanded')).toBe('true');
}

export function assertClosed(container: HTMLElement): void {
  expect(container.classList.contains('fs--open')).toBe(false);
  expect(getDropdown()).toBeNull();
  expect(getTrigger(container).getAttribute('aria-expanded')).toBe('false');
}

export function assertHighlightedValue(value: string): void {
  const el = getHighlighted();
  expect(el).not.toBeNull();
  expect(el?.getAttribute('data-value')).toBe(value);
}

export function assertNoHighlight(): void {
  expect(getHighlighted()).toBeNull();
}

export function assertSelectedValues(container: HTMLElement, values: string[]): void {
  const selected = getSelected();
  const actual = selected.map((el) => el.getAttribute('data-value'));
  expect(actual).toEqual(values);
}

export function assertOptionCount(count: number): void {
  expect(getVisibleOptions()).toHaveLength(count);
}

export function assertTriggerLabel(container: HTMLElement, text: string): void {
  const label = container.querySelector('.fs__trigger-label');
  expect(label?.textContent).toBe(text);
}

export function assertPlaceholder(container: HTMLElement, text: string): void {
  const label = container.querySelector('.fs__trigger-label');
  expect(label?.textContent).toBe(text);
  expect(label?.classList.contains('fs__trigger-label--empty')).toBe(true);
}

// ── Shortcut: open via trigger click ────────────────────────

export function clickTrigger(container: HTMLElement): void {
  click(getTrigger(container));
}
