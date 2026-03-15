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
import { createAnchor, createNativeSelect, FRUITS, clickTrigger, getDropdown } from './helpers';

describe('FluteSelect — core lifecycle', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = createAnchor();
  });

  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('creates an instance and inserts DOM after the anchor', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    expect(s.element).toBeInstanceOf(HTMLElement);
    expect(s.element.classList.contains('fs')).toBe(true);
    expect(anchor.nextElementSibling).toBe(s.element);
  });

  it('creates via string selector', () => {
    const s = FluteSelect.create(`#${anchor.id}`, { options: FRUITS });
    expect(s).toBeDefined();
  });

  it('throws for unknown selector', () => {
    expect(() => FluteSelect.create('#does-not-exist')).toThrow(/not found/);
  });

  it('replaces existing instance on same element', () => {
    const s1 = FluteSelect.create(anchor, { options: FRUITS, value: 'apple' });
    const s2 = FluteSelect.create(anchor, { options: FRUITS, value: 'banana' });
    expect(FluteSelect.get(anchor)).toBe(s2);
    expect(s2.getValue()).toBe('banana');
    expect(document.body.contains(s1.element)).toBe(false);
  });

  it('opens and closes the dropdown', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    expect(s.element.classList.contains('fs--open')).toBe(true);
    expect(getDropdown()).not.toBeNull();

    s.close();
    expect(s.element.classList.contains('fs--open')).toBe(false);
    expect(getDropdown()).toBeNull();
  });

  it('toggles the dropdown', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.toggle();
    expect(getDropdown()).not.toBeNull();
    s.toggle();
    expect(getDropdown()).toBeNull();
  });

  it('clicking trigger toggles open state', () => {
    FluteSelect.create(anchor, { options: FRUITS });
    const container = anchor.nextElementSibling as HTMLElement;
    clickTrigger(container);
    expect(getDropdown()).not.toBeNull();
    clickTrigger(container);
    expect(getDropdown()).toBeNull();
  });

  it('does not open when disabled', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, disabled: true });
    s.open();
    expect(getDropdown()).toBeNull();
  });

  it('disable() closes an open dropdown', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    s.disable();
    expect(getDropdown()).toBeNull();
    expect(s.element.classList.contains('fs--disabled')).toBe(true);
  });

  it('enable() re-enables interaction', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, disabled: true });
    s.enable();
    s.open();
    expect(getDropdown()).not.toBeNull();
  });

  it('destroy() removes DOM and unregisters', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    const el = s.element;
    s.destroy();
    expect(document.body.contains(el)).toBe(false);
    expect(FluteSelect.get(anchor)).toBeUndefined();
  });

  it('destroy() restores native <select> visibility', () => {
    const native = createNativeSelect([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', selected: true },
    ]);
    expect(native.style.display).toBe('');
    const s = FluteSelect.fromElement(native);
    expect(native.style.display).toBe('none');
    s.destroy();
    expect(native.style.display).toBe('');
  });

  it('refresh() preserves value and re-renders', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'grape' });
    s.refresh();
    expect(s.getValue()).toBe('grape');
  });

  it('focus() moves focus to the trigger', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    const focusSpy = vi.spyOn(s.element.querySelector('button')!, 'focus');
    s.focus();
    expect(focusSpy).toHaveBeenCalled();
  });

  it('double open is a no-op', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    s.open();
    expect(s.element.classList.contains('fs--open')).toBe(true);
  });

  it('double close is a no-op', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.close();
    expect(s.element.classList.contains('fs--open')).toBe(false);
  });

  it('click outside closes the dropdown', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(getDropdown()).toBeNull();
  });
});

describe('FluteSelect — fromElement (native <select>)', () => {
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('reads options and selected value from <select>', () => {
    const native = createNativeSelect([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta', selected: true },
      { value: 'c', label: 'Charlie' },
    ]);
    const s = FluteSelect.fromElement(native);
    expect(s.getValue()).toBe('b');
    expect(s.getOption('a')?.label).toBe('Alpha');
  });

  it('reads optgroups', () => {
    const native = createNativeSelect([
      { value: 'x', label: 'X', group: 'Letters' },
      { value: 'y', label: 'Y', group: 'Letters' },
      { value: '1', label: 'One', group: 'Numbers' },
    ]);
    const s = FluteSelect.fromElement(native);
    s.open();
    const groups = document.querySelectorAll('.fs__group-label');
    expect(groups.length).toBe(2);
    expect(groups[0]!.textContent).toBe('Letters');
    expect(groups[1]!.textContent).toBe('Numbers');
  });

  it('reads disabled and multiple attributes from <select>', () => {
    const sel = document.createElement('select');
    sel.multiple = true;
    sel.disabled = true;
    const o1 = document.createElement('option');
    o1.value = 'a';
    o1.textContent = 'A';
    sel.appendChild(o1);
    document.body.appendChild(sel);

    const s = FluteSelect.fromElement(sel);
    expect(s.element.classList.contains('fs--disabled')).toBe(true);
  });
});

describe('FluteSelect — static registry', () => {
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('get() returns the instance', () => {
    const anchor = createAnchor();
    const s = FluteSelect.create(anchor, { options: FRUITS });
    expect(FluteSelect.get(anchor)).toBe(s);
  });

  it('destroyAll() cleans everything', () => {
    const a1 = createAnchor();
    const a2 = createAnchor();
    FluteSelect.create(a1, { options: FRUITS });
    FluteSelect.create(a2, { options: FRUITS });
    FluteSelect.destroyAll();
    expect(FluteSelect.get(a1)).toBeUndefined();
    expect(FluteSelect.get(a2)).toBeUndefined();
  });

  it('initAll() initializes data-flute-select elements', () => {
    const d1 = document.createElement('div');
    d1.setAttribute('data-flute-select', '');
    d1.setAttribute('data-placeholder', 'One');
    document.body.appendChild(d1);

    const d2 = document.createElement('div');
    d2.setAttribute('data-flute-select', '');
    document.body.appendChild(d2);

    const instances = FluteSelect.initAll();
    expect(instances).toHaveLength(2);
  });
});
