import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@floating-ui/dom', () => ({
  computePosition: vi.fn(() => Promise.resolve({ x: 0, y: 100, placement: 'bottom-start' })),
  autoUpdate: vi.fn((_r: Element, _f: Element, cb: () => void) => { cb(); return vi.fn(); }),
  flip: vi.fn(() => ({ name: 'flip', fn: () => ({}) })),
  shift: vi.fn(() => ({ name: 'shift', fn: () => ({}) })),
  offset: vi.fn(() => ({ name: 'offset', fn: () => ({}) })),
  size: vi.fn(() => ({ name: 'size', fn: () => ({}) })),
}));

import { FluteSelect } from '../src/core/core';
import { filterOptions } from '../src/utils/search';
import {
  createAnchor, FRUITS,
  assertOpen, assertOptionCount,
  getVisibleOptions, getSearchInput, typeInSearch,
} from './helpers';

// ── filterOptions unit tests ────────────────────────────────

describe('filterOptions (unit)', () => {
  it('returns all options for empty query', () => {
    expect(filterOptions(FRUITS, '')).toEqual(FRUITS);
  });

  it('filters by label match', () => {
    const result = filterOptions(FRUITS, 'app');
    expect(result.map((o) => o.value)).toEqual(['apple', 'pineapple']);
  });

  it('filters by value match', () => {
    const result = filterOptions(FRUITS, 'cherry');
    expect(result).toHaveLength(1);
    expect(result[0]!.value).toBe('cherry');
  });

  it('filters by description match', () => {
    const opts = [
      { value: '1', label: 'Admin', description: 'System administrator' },
      { value: '2', label: 'User', description: 'Regular user' },
    ];
    const result = filterOptions(opts, 'admin');
    expect(result).toHaveLength(1);
    expect(result[0]!.value).toBe('1');
  });

  it('is case-insensitive', () => {
    expect(filterOptions(FRUITS, 'BANANA')).toHaveLength(1);
    expect(filterOptions(FRUITS, 'banana')).toHaveLength(1);
    expect(filterOptions(FRUITS, 'BaNaNa')).toHaveLength(1);
  });

  it('returns empty array when no match', () => {
    expect(filterOptions(FRUITS, 'xyz123')).toEqual([]);
  });

  it('matches partial strings in the middle', () => {
    expect(filterOptions(FRUITS, 'err')).toHaveLength(1); // cherry
  });
});

// ── Search integration tests ────────────────────────────────

describe('Search — Input rendering', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => { anchor = createAnchor(); });
  afterEach(() => { FluteSelect.destroyAll(); document.body.innerHTML = ''; });

  it('renders search input only when searchable=true', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: true });
    s.open();
    expect(getSearchInput()).not.toBeNull();
  });

  it('does not render search input when searchable=false', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: false });
    s.open();
    expect(getSearchInput()).toBeNull();
  });
});

describe('Search — Filtering', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => { anchor = createAnchor(); });
  afterEach(() => { FluteSelect.destroyAll(); document.body.innerHTML = ''; });

  it('typing filters displayed options', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: true });
    s.open();
    typeInSearch(getSearchInput()!, 'ban');
    const opts = getVisibleOptions();
    expect(opts).toHaveLength(1);
    expect(opts[0]!.getAttribute('data-value')).toBe('banana');
  });

  it('empty result shows empty state', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS, searchable: true, emptyText: 'Nothing found',
    });
    s.open();
    typeInSearch(getSearchInput()!, 'zzz');
    const status = document.querySelector('.fs__status--empty');
    expect(status?.textContent).toBe('Nothing found');
  });

  it('search resets on close', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: true });
    s.open();
    typeInSearch(getSearchInput()!, 'ban');
    expect(getVisibleOptions()).toHaveLength(1);
    s.close();
    s.open();
    assertOptionCount(5);
  });
});

describe('Search — Callbacks & Events', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => { anchor = createAnchor(); });
  afterEach(() => { FluteSelect.destroyAll(); document.body.innerHTML = ''; });

  it('onSearch callback fires', () => {
    const onSearch = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: true, onSearch });
    s.open();
    typeInSearch(getSearchInput()!, 'gra');
    expect(onSearch).toHaveBeenCalledWith('gra');
  });

  it('search event emits via emitter', () => {
    const handler = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: true });
    s.on('search', handler);
    s.open();
    typeInSearch(getSearchInput()!, 'x');
    expect(handler).toHaveBeenCalledWith({ query: 'x' });
  });
});

describe('Search — Input interaction', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => { anchor = createAnchor(); });
  afterEach(() => { FluteSelect.destroyAll(); document.body.innerHTML = ''; });

  it('search input click does not close dropdown', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: true });
    s.open();
    const input = getSearchInput()!;
    input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    assertOpen(s.element);
  });
});

// ── Creatable tests ─────────────────────────────────────────

describe('Search — Creatable', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => { anchor = createAnchor(); });
  afterEach(() => { FluteSelect.destroyAll(); document.body.innerHTML = ''; });

  it('shows create option when no match', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS, searchable: true, creatable: true, createLabel: 'Add "{value}"',
    });
    s.open();
    typeInSearch(getSearchInput()!, 'kiwi');
    const createEl = document.querySelector('.fs__option--create');
    expect(createEl?.textContent).toBe('Add "kiwi"');
  });

  it('does NOT show create when query matches existing label', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS, searchable: true, creatable: true,
    });
    s.open();
    typeInSearch(getSearchInput()!, 'Apple');
    expect(document.querySelector('.fs__option--create')).toBeNull();
  });

  it('clicking create adds option and selects it', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS, searchable: true, creatable: true,
    });
    s.open();
    typeInSearch(getSearchInput()!, 'kiwi');
    const createEl = document.querySelector('[data-create="kiwi"]') as HTMLElement;
    createEl.click();
    expect(s.getValue()).toBe('kiwi');
    expect(s.getOption('kiwi')?.label).toBe('kiwi');
  });

  it('fires create event', () => {
    const handler = vi.fn();
    const s = FluteSelect.create(anchor, {
      options: FRUITS, searchable: true, creatable: true,
    });
    s.on('create', handler);
    s.open();
    typeInSearch(getSearchInput()!, 'mango');
    (document.querySelector('[data-create="mango"]') as HTMLElement).click();
    expect(handler).toHaveBeenCalledWith({
      option: expect.objectContaining({ value: 'mango' }),
    });
  });

  it('onCreate callback transforms the option', async () => {
    const s = FluteSelect.create(anchor, {
      options: [], searchable: true, creatable: true,
      onCreate: (v) => ({ value: `id-${v}`, label: v.toUpperCase() }),
    });
    s.open();
    typeInSearch(getSearchInput()!, 'test');
    (document.querySelector('[data-create="test"]') as HTMLElement).click();
    await vi.waitFor(() => {
      expect(s.getValue()).toBe('id-test');
      expect(s.getOption('id-test')?.label).toBe('TEST');
    });
  });

  it('shows create option on empty list with search query', () => {
    const s = FluteSelect.create(anchor, {
      options: [], searchable: true, creatable: true,
    });
    s.open();
    typeInSearch(getSearchInput()!, 'new');
    expect(document.querySelector('.fs__option--create')).not.toBeNull();
  });
});
