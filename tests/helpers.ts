import type { SelectOption, SelectItem, SelectSeparator } from '../src/types';

export function createAnchor(): HTMLDivElement {
  const el = document.createElement('div');
  el.id = `anchor-${Math.random().toString(36).slice(2, 8)}`;
  document.body.appendChild(el);
  return el;
}

export function createNativeSelect(
  options: { value: string; label: string; selected?: boolean; group?: string }[],
): HTMLSelectElement {
  const select = document.createElement('select');
  const groups = new Map<string, HTMLOptGroupElement>();

  for (const opt of options) {
    const optionEl = document.createElement('option');
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    if (opt.selected) {
      optionEl.selected = true;
    }

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

export function clickTrigger(container: HTMLElement): void {
  const trigger = container.querySelector('button[role="combobox"]') as HTMLElement;
  trigger.click();
}

export function getVisibleOptions(): HTMLElement[] {
  const dropdown = document.querySelector('.fs__dropdown--open');
  if (!dropdown) {
    return [];
  }
  return Array.from(dropdown.querySelectorAll('.fs__option'));
}

export function getDropdown(): HTMLElement | null {
  return document.querySelector('.fs__dropdown--open');
}

export function pressKey(key: string, opts?: Partial<KeyboardEvent>): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
}
