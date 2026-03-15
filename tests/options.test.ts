import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@floating-ui/dom', () => ({
  computePosition: vi.fn(() => Promise.resolve({ x: 0, y: 100, placement: 'bottom-start' })),
  autoUpdate: vi.fn((_r: Element, _f: Element, cb: () => void) => {
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
  assertOptionCount,
  getVisibleOptions,
  getGroupLabels,
  getSeparators,
  getSearchInput,
  typeInSearch,
} from './helpers';

// ── Options management ──────────────────────────────────────

describe('Options — addOption', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('adds a new option', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.addOption({ value: 'mango', label: 'Mango' });
    expect(s.getOption('mango')?.label).toBe('Mango');
    expect(s.count).toBe(6);
  });

  it('adds option to a group', () => {
    const s = FluteSelect.create(anchor, { options: GROUPED });
    s.addOption({ value: 'kiwi', label: 'Kiwi' }, 'Fruits');
    expect(s.getOption('kiwi')).toBeDefined();
    s.open();
    const group = document.querySelector('.fs__group');
    const values = Array.from(group?.querySelectorAll('.fs__option') ?? []).map((o) =>
      o.getAttribute('data-value'),
    );
    expect(values).toContain('kiwi');
  });
});

describe('Options — removeOption', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('removes option and deselects it', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'apple' });
    s.removeOption('apple');
    expect(s.getOption('apple')).toBeUndefined();
    expect(s.getValue()).toBe('');
    expect(s.count).toBe(4);
  });
});

describe('Options — updateOptions', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('replaces all options', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'banana' });
    s.updateOptions([
      { value: 'x', label: 'X' },
      { value: 'y', label: 'Y' },
    ]);
    expect(s.getOption('banana')).toBeUndefined();
    expect(s.getOption('x')?.label).toBe('X');
    expect(s.getValue()).toBe(''); // old value cleared
    expect(s.count).toBe(2);
  });

  it('replaces with groups', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.updateOptions(GROUPED);
    s.open();
    expect(getGroupLabels()).toHaveLength(2);
  });
});

describe('Options — getOption', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('returns option by value', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    expect(s.getOption('cherry')?.label).toBe('Cherry');
  });

  it('returns undefined for unknown value', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    expect(s.getOption('nonexistent')).toBeUndefined();
  });
});

// ── Grouped rendering ───────────────────────────────────────

describe('Options — Grouped rendering', () => {
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
    const labels = getGroupLabels();
    expect(labels).toHaveLength(2);
    expect(labels[0]!.textContent).toBe('Fruits');
    expect(labels[1]!.textContent).toBe('Vegetables');
  });

  it('options within groups are clickable and selectable', () => {
    const s = FluteSelect.create(anchor, { options: GROUPED });
    s.open();
    const carrot = document.querySelector('[data-value="carrot"]') as HTMLElement;
    carrot.click();
    expect(s.getValue()).toBe('carrot');
  });
});

// ── Separator support ───────────────────────────────────────

describe('Options — Separators', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('renders separator elements', () => {
    const s = FluteSelect.create(anchor, { options: WITH_SEPARATORS });
    s.open();
    const seps = getSeparators();
    expect(seps).toHaveLength(1);
    expect(seps[0]!.getAttribute('role')).toBe('separator');
  });

  it('separators are hidden during search', () => {
    const s = FluteSelect.create(anchor, { options: WITH_SEPARATORS, searchable: true });
    s.open();
    typeInSearch(getSearchInput()!, 'a');
    expect(getSeparators()).toHaveLength(0);
  });

  it('separator does not affect option count', () => {
    const s = FluteSelect.create(anchor, { options: WITH_SEPARATORS });
    s.open();
    assertOptionCount(4); // apple, banana, carrot, daikon
  });

  it('options across separator are selectable', () => {
    const s = FluteSelect.create(anchor, { options: WITH_SEPARATORS });
    s.open();
    const opts = getVisibleOptions();
    opts[2]!.click(); // carrot (after separator)
    expect(s.getValue()).toBe('carrot');
  });
});

// ── Custom rendering ────────────────────────────────────────

describe('Options — Custom renderOption', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('uses renderOption for dropdown items', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      renderOption: (opt, state) =>
        `<div class="custom">${opt.label}${state.selected ? ' *' : ''}</div>`,
    });
    s.open();
    expect(document.querySelector('.fs__option .custom')).not.toBeNull();
  });
});

describe('Options — Custom renderSelected', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('uses renderSelected for trigger label', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      value: 'apple',
      renderSelected: (opt) => `<b>${opt.label}</b>`,
    });
    const label = s.element.querySelector('.fs__trigger-label');
    expect(label?.innerHTML).toContain('<b>Apple</b>');
  });
});

describe('Options — Custom renderTag', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('uses renderTag for multi-select tags', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      multiple: true,
      value: ['apple'],
      renderTag: (opt) => `<em>${opt.label}</em>`,
    });
    const tag = s.element.querySelector('.fs__tag');
    expect(tag?.innerHTML).toContain('<em>Apple</em>');
  });
});

describe('Options — Custom renderEmpty', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('uses renderEmpty for empty state', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      searchable: true,
      renderEmpty: (q) => `<div class="custom-empty">Nothing for "${q}"</div>`,
    });
    s.open();
    typeInSearch(getSearchInput()!, 'zzz');
    expect(document.querySelector('.custom-empty')?.textContent).toBe('Nothing for "zzz"');
  });
});

// ── Rich options ────────────────────────────────────────────

describe('Options — Rich options', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
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
