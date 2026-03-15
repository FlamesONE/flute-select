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
import { filterOptions } from '../src/utils/search';
import { createAnchor, FRUITS, getVisibleOptions } from './helpers';

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
  });

  it('returns empty array for no matches', () => {
    expect(filterOptions(FRUITS, 'xyz123')).toEqual([]);
  });

  it('matches partial strings in the middle', () => {
    expect(filterOptions(FRUITS, 'err')).toHaveLength(1); // cherry
  });
});

describe('FluteSelect — search integration', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('renders search input when searchable=true', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: true });
    s.open();
    const input = document.querySelector('.fs__search-input');
    expect(input).not.toBeNull();
  });

  it('does not render search input when searchable=false', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: false });
    s.open();
    expect(document.querySelector('.fs__search-input')).toBeNull();
  });

  it('typing in search filters displayed options', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: true });
    s.open();
    const input = document.querySelector('.fs__search-input') as HTMLInputElement;
    input.value = 'ban';
    input.dispatchEvent(new Event('input'));
    const opts = getVisibleOptions();
    expect(opts).toHaveLength(1);
    expect(opts[0]!.getAttribute('data-value')).toBe('banana');
  });

  it('shows empty text when search yields no results', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      searchable: true,
      emptyText: 'Nothing',
    });
    s.open();
    const input = document.querySelector('.fs__search-input') as HTMLInputElement;
    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    const status = document.querySelector('.fs__status--empty');
    expect(status?.textContent).toBe('Nothing');
  });

  it('fires onSearch callback', () => {
    const onSearch = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: true, onSearch });
    s.open();
    const input = document.querySelector('.fs__search-input') as HTMLInputElement;
    input.value = 'gra';
    input.dispatchEvent(new Event('input'));
    expect(onSearch).toHaveBeenCalledWith('gra');
  });

  it('resets search on close', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: true });
    s.open();
    const input = document.querySelector('.fs__search-input') as HTMLInputElement;
    input.value = 'ban';
    input.dispatchEvent(new Event('input'));
    s.close();
    s.open();
    expect(getVisibleOptions()).toHaveLength(5);
  });

  it('emits search event via emitter', () => {
    const handler = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: true });
    s.on('search', handler);
    s.open();
    const input = document.querySelector('.fs__search-input') as HTMLInputElement;
    input.value = 'x';
    input.dispatchEvent(new Event('input'));
    expect(handler).toHaveBeenCalledWith({ query: 'x' });
  });

  it('search input click does not close dropdown', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: true });
    s.open();
    const input = document.querySelector('.fs__search-input') as HTMLInputElement;
    const ev = new MouseEvent('mousedown', { bubbles: true });
    input.dispatchEvent(ev);
    expect(s.element.classList.contains('fs--open')).toBe(true);
  });
});
