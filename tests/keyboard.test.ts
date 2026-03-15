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
  FRUITS_WITH_DISABLED,
  EMPTY,
  clickTrigger,
  pressKey,
  assertOpen,
  assertClosed,
  assertHighlightedValue,
  assertNoHighlight,
  getHighlighted,
  getTrigger,
  getVisibleOptions,
  getSearchInput,
  typeInSearch,
} from './helpers';

describe('Keyboard — ArrowDown', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('opens dropdown when trigger is focused and clicked', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    clickTrigger(s.element);
    assertOpen(s.element);
  });

  it('highlights first option on first press', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('ArrowDown');
    assertHighlightedValue('apple');
  });

  it('moves highlight down on subsequent presses', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('ArrowDown');
    pressKey('ArrowDown');
    assertHighlightedValue('banana');
  });

  it('skips disabled options', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS_WITH_DISABLED });
    s.open();
    pressKey('ArrowDown'); // apple
    pressKey('ArrowDown'); // banana disabled -> cherry
    assertHighlightedValue('cherry');
  });

  it('stops at last option', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    for (let i = 0; i < 20; i++) pressKey('ArrowDown');
    assertHighlightedValue('pineapple');
  });
});

describe('Keyboard — ArrowUp', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('moves highlight up', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('ArrowDown'); // apple
    pressKey('ArrowDown'); // banana
    pressKey('ArrowUp'); // apple
    assertHighlightedValue('apple');
  });

  it('stops at top (does not wrap)', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('ArrowDown'); // apple (idx 0)
    pressKey('ArrowUp'); // tries -1, fails -> stays at 0
    assertHighlightedValue('apple');
  });

  it('from no highlight does nothing', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('ArrowUp');
    assertNoHighlight();
  });
});

describe('Keyboard — Home / End', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('Home jumps to first non-disabled option', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('End');
    pressKey('Home');
    assertHighlightedValue('apple');
  });

  it('End jumps to last non-disabled option', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('End');
    assertHighlightedValue('pineapple');
  });

  it('Home skips disabled first option', () => {
    const opts = [
      { value: 'a', label: 'A', disabled: true },
      { value: 'b', label: 'B' },
      { value: 'c', label: 'C' },
    ];
    const s = FluteSelect.create(anchor, { options: opts });
    s.open();
    pressKey('Home');
    assertHighlightedValue('b');
  });

  it('End skips disabled last option', () => {
    const opts = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
      { value: 'c', label: 'C', disabled: true },
    ];
    const s = FluteSelect.create(anchor, { options: opts });
    s.open();
    pressKey('End');
    assertHighlightedValue('b');
  });
});

describe('Keyboard — Enter', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('selects highlighted option', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('ArrowDown');
    pressKey('ArrowDown'); // banana
    pressKey('Enter');
    expect(s.getValue()).toBe('banana');
  });

  it('closes dropdown in single mode', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('ArrowDown');
    pressKey('Enter');
    assertClosed(s.element);
  });

  it('keeps open in multi mode (default closeOnSelect)', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, multiple: true });
    s.open();
    pressKey('ArrowDown');
    pressKey('Enter');
    assertOpen(s.element);
    expect(s.getValue()).toEqual(['apple']);
  });

  it('does nothing when no option is highlighted and not creatable', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('Enter');
    expect(s.getValue()).toBe('');
    assertOpen(s.element);
  });

  it('creates option when no highlight + creatable + search query', async () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      searchable: true,
      creatable: true,
    });
    s.open();
    const input = getSearchInput()!;
    typeInSearch(input, 'kiwi');
    pressKey('Enter');
    await vi.waitFor(() => {
      expect(s.getValue()).toBe('kiwi');
    });
  });
});

describe('Keyboard — Escape', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('closes dropdown', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('Escape');
    assertClosed(s.element);
  });

  it('restores focus to trigger', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    const trigger = getTrigger(s.element);
    const spy = vi.spyOn(trigger, 'focus');
    pressKey('Escape');
    expect(spy).toHaveBeenCalled();
  });
});

describe('Keyboard — Tab', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('closes dropdown without preventing default', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    const spy = vi.spyOn(ev, 'preventDefault');
    document.dispatchEvent(ev);
    assertClosed(s.element);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('Keyboard — Type-ahead (non-searchable)', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('highlights matching option by first letter', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: false });
    s.open();
    pressKey('c');
    assertHighlightedValue('cherry');
  });

  it('wraps around to beginning', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: false });
    s.open();
    pressKey('End'); // pineapple (last)
    pressKey('a'); // wrap -> apple
    assertHighlightedValue('apple');
  });

  it('does not fire in searchable mode', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, searchable: true });
    s.open();
    pressKey('c');
    assertNoHighlight();
  });

  it('skips disabled options in type-ahead', () => {
    const opts = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta', disabled: true },
      { value: 'c', label: 'Bravo' },
    ];
    const s = FluteSelect.create(anchor, { options: opts, searchable: false });
    s.open();
    pressKey('b'); // Beta is disabled -> Bravo
    assertHighlightedValue('c');
  });
});

describe('Keyboard — Empty list', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('all navigation keys are no-ops', () => {
    const s = FluteSelect.create(anchor, { options: EMPTY });
    s.open();
    pressKey('ArrowDown');
    pressKey('ArrowUp');
    pressKey('Home');
    pressKey('End');
    pressKey('Enter');
    assertNoHighlight();
    assertOpen(s.element);
  });
});

describe('Keyboard — aria-activedescendant', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('updates on highlight change', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    const trigger = getTrigger(s.element);
    expect(trigger.hasAttribute('aria-activedescendant')).toBe(false);

    pressKey('ArrowDown');
    const highlighted = getHighlighted();
    expect(highlighted).not.toBeNull();
    expect(trigger.getAttribute('aria-activedescendant')).toBe(highlighted!.id);
  });

  it('clears when highlight is removed (close)', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    pressKey('ArrowDown');
    s.close();
    const trigger = getTrigger(s.element);
    // After close, highlighted resets to -1, aria-activedescendant removed on next render
    s.open();
    expect(getHighlighted()).toBeNull();
  });
});
