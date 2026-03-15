import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@floating-ui/dom', () => ({
  computePosition: vi.fn(() => Promise.resolve({ x: 0, y: 100 })),
  autoUpdate: vi.fn((_ref: Element, _floating: Element, cb: () => void) => {
    cb();
    return vi.fn();
  }),
  flip: vi.fn(() => ({ name: 'flip', fn: () => ({}) })),
  shift: vi.fn(() => ({ name: 'shift', fn: () => ({}) })),
  offset: vi.fn(() => ({ name: 'offset', fn: () => ({}) })),
  size: vi.fn(() => ({ name: 'size', fn: () => ({}) })),
}));

import { FluteSelect } from '../src/core/core';
import {
  createAnchor,
  FRUITS,
  GROUPED,
  RICH_OPTIONS,
  WITH_SEPARATORS,
  getVisibleOptions,
} from './helpers';

describe('FluteSelect — options management', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('addOption adds a new option', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.addOption({ value: 'mango', label: 'Mango' });
    expect(s.getOption('mango')?.label).toBe('Mango');
  });

  it('addOption to a group', () => {
    const s = FluteSelect.create(anchor, { options: GROUPED });
    s.addOption({ value: 'kiwi', label: 'Kiwi' }, 'Fruits');
    expect(s.getOption('kiwi')).toBeDefined();
    s.open();
    const group = document.querySelector('.fs__group');
    const opts = group?.querySelectorAll('.fs__option');
    const values = Array.from(opts || []).map((o) => o.getAttribute('data-value'));
    expect(values).toContain('kiwi');
  });

  it('removeOption removes and deselects', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'apple' });
    s.removeOption('apple');
    expect(s.getOption('apple')).toBeUndefined();
    expect(s.getValue()).toBe('');
  });

  it('updateOptions replaces all options', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'banana' });
    s.updateOptions([
      { value: 'x', label: 'X' },
      { value: 'y', label: 'Y' },
    ]);
    expect(s.getOption('banana')).toBeUndefined();
    expect(s.getOption('x')?.label).toBe('X');
    expect(s.getValue()).toBe('');
  });

  it('updateOptions with groups', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.updateOptions(GROUPED);
    s.open();
    const groups = document.querySelectorAll('.fs__group-label');
    expect(groups.length).toBe(2);
  });

  it('getOption returns option by value', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    const opt = s.getOption('cherry');
    expect(opt?.label).toBe('Cherry');
  });

  it('getOption returns undefined for unknown value', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    expect(s.getOption('nonexistent')).toBeUndefined();
  });
});

describe('FluteSelect — grouped options rendering', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('renders group labels', () => {
    const s = FluteSelect.create(anchor, { options: GROUPED });
    s.open();
    const labels = document.querySelectorAll('.fs__group-label');
    expect(labels.length).toBe(2);
    expect(labels[0]!.textContent).toBe('Fruits');
    expect(labels[1]!.textContent).toBe('Vegetables');
  });

  it('options within groups are selectable', () => {
    const s = FluteSelect.create(anchor, { options: GROUPED });
    s.open();
    const carrot = document.querySelector('[data-value="carrot"]') as HTMLElement;
    carrot.click();
    expect(s.getValue()).toBe('carrot');
  });
});

describe('FluteSelect — separator support', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('renders separator elements between option groups', () => {
    const s = FluteSelect.create(anchor, { options: WITH_SEPARATORS });
    s.open();
    const separators = document.querySelectorAll('.fs__separator');
    expect(separators.length).toBe(1);
    expect(separators[0]!.getAttribute('role')).toBe('separator');
  });

  it('separators do not affect option count', () => {
    const s = FluteSelect.create(anchor, { options: WITH_SEPARATORS });
    s.open();
    const opts = getVisibleOptions();
    expect(opts.length).toBe(4); // apple, banana, carrot, daikon
  });

  it('separator is not rendered when search is active', () => {
    const s = FluteSelect.create(anchor, { options: WITH_SEPARATORS, searchable: true });
    s.open();
    const input = document.querySelector('.fs__search-input') as HTMLInputElement;
    input.value = 'a';
    input.dispatchEvent(new Event('input'));
    const separators = document.querySelectorAll('.fs__separator');
    expect(separators.length).toBe(0);
  });

  it('options across separator are selectable', () => {
    const s = FluteSelect.create(anchor, { options: WITH_SEPARATORS });
    s.open();
    const opts = getVisibleOptions();
    opts[2]!.click(); // carrot (after separator)
    expect(s.getValue()).toBe('carrot');
  });

  it('updateOptions with separators works', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.updateOptions(WITH_SEPARATORS);
    s.open();
    expect(document.querySelectorAll('.fs__separator').length).toBe(1);
    expect(getVisibleOptions().length).toBe(4);
  });
});

describe('FluteSelect — custom rendering', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('renderSelected is used for trigger label', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      value: 'apple',
      renderSelected: (opt) => `<b>${opt.label}</b>`,
    });
    const label = s.element.querySelector('.fs__trigger-label');
    expect(label?.innerHTML).toContain('<b>Apple</b>');
  });

  it('renderTag is used for multi-select tags', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      multiple: true,
      value: ['apple'],
      renderTag: (opt) => `<em>${opt.label}</em>`,
    });
    const tag = s.element.querySelector('.fs__tag');
    expect(tag?.innerHTML).toContain('<em>Apple</em>');
  });

  it('renderOption is used for dropdown options', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      renderOption: (opt, state) =>
        `<div class="custom">${opt.label}${state.selected ? '!' : ''}</div>`,
    });
    s.open();
    const opt = document.querySelector('.fs__option .custom');
    expect(opt).not.toBeNull();
  });

  it('renderEmpty is used for empty state', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      searchable: true,
      renderEmpty: (q) => `<div class="custom-empty">Nothing for "${q}"</div>`,
    });
    s.open();
    const input = document.querySelector('.fs__search-input') as HTMLInputElement;
    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    expect(document.querySelector('.custom-empty')?.textContent).toBe('Nothing for "zzz"');
  });

  it('renders option with image and description', () => {
    const s = FluteSelect.create(anchor, { options: RICH_OPTIONS });
    s.open();
    expect(document.querySelector('.fs__option-image')).not.toBeNull();
    expect(document.querySelector('.fs__option-desc')?.textContent).toBe('john@example.com');
  });

  it('renders option with icon', () => {
    const s = FluteSelect.create(anchor, { options: RICH_OPTIONS });
    s.open();
    expect(document.querySelector('.fs__option-icon')).not.toBeNull();
  });

  it('renders option with html property', () => {
    const s = FluteSelect.create(anchor, {
      options: [{ value: 'x', label: 'X', html: '<b>Custom HTML</b>' }],
    });
    s.open();
    const opt = document.querySelector('.fs__option');
    expect(opt?.innerHTML).toContain('<b>Custom HTML</b>');
  });
});

describe('FluteSelect — creatable', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('shows create option when query does not match', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      searchable: true,
      creatable: true,
      createLabel: 'Add "{value}"',
    });
    s.open();
    const input = document.querySelector('.fs__search-input') as HTMLInputElement;
    input.value = 'kiwi';
    input.dispatchEvent(new Event('input'));
    const createEl = document.querySelector('.fs__option--create');
    expect(createEl?.textContent).toBe('Add "kiwi"');
  });

  it('does not show create option when query matches existing', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      searchable: true,
      creatable: true,
    });
    s.open();
    const input = document.querySelector('.fs__search-input') as HTMLInputElement;
    input.value = 'Apple';
    input.dispatchEvent(new Event('input'));
    expect(document.querySelector('.fs__option--create')).toBeNull();
  });

  it('clicking create option adds it', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      searchable: true,
      creatable: true,
    });
    s.open();
    const input = document.querySelector('.fs__search-input') as HTMLInputElement;
    input.value = 'kiwi';
    input.dispatchEvent(new Event('input'));
    const createEl = document.querySelector('[data-create="kiwi"]') as HTMLElement;
    createEl.click();
    expect(s.getValue()).toBe('kiwi');
    expect(s.getOption('kiwi')?.label).toBe('kiwi');
  });

  it('fires create event', () => {
    const handler = vi.fn();
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      searchable: true,
      creatable: true,
    });
    s.on('create', handler);
    s.open();
    const input = document.querySelector('.fs__search-input') as HTMLInputElement;
    input.value = 'mango';
    input.dispatchEvent(new Event('input'));
    const createEl = document.querySelector('[data-create="mango"]') as HTMLElement;
    createEl.click();
    expect(handler).toHaveBeenCalledWith({ option: expect.objectContaining({ value: 'mango' }) });
  });

  it('onCreate callback transforms the option', async () => {
    const s = FluteSelect.create(anchor, {
      options: [],
      searchable: true,
      creatable: true,
      onCreate: (v) => ({ value: `custom-${v}`, label: v.toUpperCase() }),
    });
    s.open();
    const input = document.querySelector('.fs__search-input') as HTMLInputElement;
    input.value = 'test';
    input.dispatchEvent(new Event('input'));
    const createEl = document.querySelector('[data-create="test"]') as HTMLElement;
    createEl.click();
    await vi.waitFor(() => {
      expect(s.getValue()).toBe('custom-test');
      expect(s.getOption('custom-test')?.label).toBe('TEST');
    });
  });

  it('creatable shows create option on empty list', () => {
    const s = FluteSelect.create(anchor, {
      options: [],
      searchable: true,
      creatable: true,
    });
    s.open();
    const input = document.querySelector('.fs__search-input') as HTMLInputElement;
    input.value = 'new';
    input.dispatchEvent(new Event('input'));
    expect(document.querySelector('.fs__option--create')).not.toBeNull();
  });
});

describe('FluteSelect — positioning modes', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('defaults to dropdown positioning (no wrapper)', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    expect(s.element.classList.contains('fs--aligned')).toBe(false);
    s.open();
    expect(document.querySelector('.fs__wrapper')).toBeNull();
    expect(getVisibleOptions().length).toBe(5);
  });

  it('aligned positioning adds wrapper and aligned class', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, positioning: 'aligned' });
    expect(s.element.classList.contains('fs--aligned')).toBe(true);
  });

  it('aligned mode opens with wrapper', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, positioning: 'aligned' });
    s.open();
    expect(document.querySelector('.fs__wrapper')).not.toBeNull();
  });
});
