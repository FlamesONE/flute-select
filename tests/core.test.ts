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
import {
  createAnchor, createNativeSelect, FRUITS, EMPTY,
  clickTrigger, clickOutside, assertOpen, assertClosed, assertTriggerLabel,
  assertPlaceholder, getDropdown, getVisibleOptions, getTrigger,
} from './helpers';

describe('Rendering & Initial State', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => { anchor = createAnchor(); });
  afterEach(() => { FluteSelect.destroyAll(); document.body.innerHTML = ''; });

  it('creates DOM after anchor element', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    expect(s.element).toBeInstanceOf(HTMLElement);
    expect(anchor.nextElementSibling).toBe(s.element);
  });

  it('shows placeholder when no value', () => {
    FluteSelect.create(anchor, { options: FRUITS, placeholder: 'Pick...' });
    assertPlaceholder(anchor.nextElementSibling as HTMLElement, 'Pick...');
  });

  it('shows selected label in trigger', () => {
    FluteSelect.create(anchor, { options: FRUITS, value: 'banana' });
    assertTriggerLabel(anchor.nextElementSibling as HTMLElement, 'Banana');
  });

  it('applies combobox ARIA on trigger', () => {
    FluteSelect.create(anchor, { options: FRUITS });
    const trigger = getTrigger(anchor.nextElementSibling as HTMLElement);
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('applies listbox role on dropdown', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    expect(getDropdown()?.getAttribute('role')).toBe('listbox');
  });

  it('applies option role and aria-selected on items', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'apple' });
    s.open();
    const opts = getVisibleOptions();
    expect(opts.every((o) => o.getAttribute('role') === 'option')).toBe(true);
    expect(opts[0]!.getAttribute('aria-selected')).toBe('true');
    expect(opts[1]!.getAttribute('aria-selected')).toBe('false');
  });

  it('disabled prevents open', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, disabled: true });
    expect(s.element.classList.contains('fs--disabled')).toBe(true);
    s.open();
    assertClosed(s.element);
  });

  it('handles empty options list without crash', () => {
    const s = FluteSelect.create(anchor, { options: EMPTY });
    s.open();
    assertOpen(s.element);
    expect(getVisibleOptions()).toHaveLength(0);
    expect(document.querySelector('.fs__status--empty')).not.toBeNull();
  });

  it('throws for invalid selector', () => {
    expect(() => FluteSelect.create('#nonexistent')).toThrow(/not found/);
  });
});

describe('Open & Close', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => { anchor = createAnchor(); });
  afterEach(() => { FluteSelect.destroyAll(); document.body.innerHTML = ''; });

  it('trigger click opens', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    clickTrigger(s.element);
    assertOpen(s.element);
  });

  it('second trigger click closes', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    clickTrigger(s.element);
    clickTrigger(s.element);
    assertClosed(s.element);
  });

  it('outside click closes', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    clickOutside();
    assertClosed(s.element);
  });

  it('double open is no-op', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open(); s.open();
    assertOpen(s.element);
  });

  it('close when closed is no-op', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.close();
    assertClosed(s.element);
  });

  it('toggle works', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.toggle(); assertOpen(s.element);
    s.toggle(); assertClosed(s.element);
  });

  it('disable() closes open dropdown', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    s.disable();
    assertClosed(s.element);
    expect(s.element.classList.contains('fs--disabled')).toBe(true);
  });

  it('enable() allows reopening', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, disabled: true });
    s.enable();
    s.open();
    assertOpen(s.element);
  });
});

describe('Lifecycle & Registry', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => { anchor = createAnchor(); });
  afterEach(() => { FluteSelect.destroyAll(); document.body.innerHTML = ''; });

  it('destroy removes DOM and unregisters', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    const el = s.element;
    s.destroy();
    expect(document.body.contains(el)).toBe(false);
    expect(FluteSelect.get(anchor)).toBeUndefined();
  });

  it('destroy restores native <select>', () => {
    const native = createNativeSelect([{ value: 'a', label: 'A' }]);
    const s = FluteSelect.fromElement(native);
    expect(native.style.display).toBe('none');
    s.destroy();
    expect(native.style.display).toBe('');
  });

  it('re-create on same element destroys previous', () => {
    const s1 = FluteSelect.create(anchor, { options: FRUITS, value: 'apple' });
    const s2 = FluteSelect.create(anchor, { options: FRUITS, value: 'banana' });
    expect(FluteSelect.get(anchor)).toBe(s2);
    expect(document.body.contains(s1.element)).toBe(false);
  });

  it('refresh preserves value', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'grape' });
    s.refresh();
    expect(s.getValue()).toBe('grape');
  });

  it('destroyAll cleans everything', () => {
    const a1 = createAnchor(); const a2 = createAnchor();
    FluteSelect.create(a1, { options: FRUITS });
    FluteSelect.create(a2, { options: FRUITS });
    FluteSelect.destroyAll();
    expect(FluteSelect.get(a1)).toBeUndefined();
    expect(FluteSelect.get(a2)).toBeUndefined();
  });

  it('initAll finds data-flute-select elements', () => {
    for (let i = 0; i < 3; i++) {
      const d = document.createElement('div');
      d.setAttribute('data-flute-select', '');
      document.body.appendChild(d);
    }
    expect(FluteSelect.initAll()).toHaveLength(3);
  });
});

describe('Native <select>', () => {
  afterEach(() => { FluteSelect.destroyAll(); document.body.innerHTML = ''; });

  it('reads options and selected value', () => {
    const native = createNativeSelect([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta', selected: true },
    ]);
    const s = FluteSelect.fromElement(native);
    expect(s.getValue()).toBe('b');
  });

  it('reads optgroups', () => {
    const native = createNativeSelect([
      { value: 'x', label: 'X', group: 'Letters' },
      { value: '1', label: 'One', group: 'Numbers' },
    ]);
    const s = FluteSelect.fromElement(native);
    s.open();
    expect(document.querySelectorAll('.fs__group-label')).toHaveLength(2);
  });

  it('syncs value back to native <select> on change', () => {
    const native = createNativeSelect([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]);
    const handler = vi.fn();
    native.addEventListener('change', handler);
    const s = FluteSelect.fromElement(native);
    s.setValue('b');
    expect(Array.from(native.selectedOptions).map((o) => o.value)).toEqual(['b']);
    expect(handler).toHaveBeenCalled();
  });
});
