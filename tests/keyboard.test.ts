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
import { createAnchor, FRUITS, FRUITS_WITH_DISABLED, pressKey } from './helpers';

describe('FluteSelect — keyboard navigation', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('ArrowDown highlights next option', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('ArrowDown');
    const highlighted = document.querySelector('.fs__option--highlighted');
    expect(highlighted?.getAttribute('data-value')).toBe('apple');
  });

  it('ArrowDown then ArrowDown moves to second', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('ArrowDown');
    pressKey('ArrowDown');
    const highlighted = document.querySelector('.fs__option--highlighted');
    expect(highlighted?.getAttribute('data-value')).toBe('banana');
  });

  it('ArrowDown skips disabled options', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS_WITH_DISABLED });
    s.open();
    pressKey('ArrowDown'); // apple (index 0)
    pressKey('ArrowDown'); // banana is disabled → cherry (index 2)
    const highlighted = document.querySelector('.fs__option--highlighted');
    expect(highlighted?.getAttribute('data-value')).toBe('cherry');
  });

  it('ArrowUp moves highlight up', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('ArrowDown'); // apple
    pressKey('ArrowDown'); // banana
    pressKey('ArrowUp'); // apple
    const highlighted = document.querySelector('.fs__option--highlighted');
    expect(highlighted?.getAttribute('data-value')).toBe('apple');
  });

  it('Home jumps to first non-disabled option', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('ArrowDown');
    pressKey('ArrowDown');
    pressKey('ArrowDown');
    pressKey('Home');
    const highlighted = document.querySelector('.fs__option--highlighted');
    expect(highlighted?.getAttribute('data-value')).toBe('apple');
  });

  it('End jumps to last non-disabled option', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('End');
    const highlighted = document.querySelector('.fs__option--highlighted');
    expect(highlighted?.getAttribute('data-value')).toBe('pineapple');
  });

  it('Enter selects the highlighted option', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('ArrowDown'); // apple
    pressKey('ArrowDown'); // banana
    pressKey('Enter');
    expect(s.getValue()).toBe('banana');
  });

  it('Escape closes the dropdown', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('Escape');
    expect(s.element.classList.contains('fs--open')).toBe(false);
  });

  it('Tab closes the dropdown', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('Tab');
    expect(s.element.classList.contains('fs--open')).toBe(false);
  });

  it('type-ahead jumps to matching option (non-searchable)', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: false });
    s.open();
    pressKey('c'); // cherry
    const highlighted = document.querySelector('.fs__option--highlighted');
    expect(highlighted?.getAttribute('data-value')).toBe('cherry');
  });

  it('type-ahead wraps around', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: false });
    s.open();
    pressKey('End'); // go to end
    pressKey('a'); // should wrap to apple
    const highlighted = document.querySelector('.fs__option--highlighted');
    expect(highlighted?.getAttribute('data-value')).toBe('apple');
  });

  it('ArrowDown does not go past last item', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('End');
    pressKey('ArrowDown');
    const highlighted = document.querySelector('.fs__option--highlighted');
    expect(highlighted?.getAttribute('data-value')).toBe('pineapple');
  });

  it('ArrowUp from -1 does nothing', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('ArrowUp');
    const highlighted = document.querySelector('.fs__option--highlighted');
    expect(highlighted).toBeNull();
  });

  it('Enter with no highlight and creatable creates option', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      searchable: true,
      creatable: true,
    });
    s.open();
    const input = document.querySelector('.fs__search-input') as HTMLInputElement;
    input.value = 'kiwi';
    input.dispatchEvent(new Event('input'));
    pressKey('Enter');
    expect(s.getValue()).toBe('kiwi');
  });
});
