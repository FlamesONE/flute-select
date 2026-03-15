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
  clickTrigger,
  assertOpen,
  assertClosed,
  assertSelectedValues,
  assertTriggerLabel,
  assertPlaceholder,
  getVisibleOptions,
  getTags,
} from './helpers';

describe('Selection — Single mode', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('click selects and closes', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    getVisibleOptions()[2]!.click(); // cherry
    expect(s.getValue()).toBe('cherry');
    assertClosed(s.element);
  });

  it('setValue / getValue', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.setValue('banana');
    expect(s.getValue()).toBe('banana');
    assertTriggerLabel(s.element, 'Banana');
  });

  it('clear resets to empty', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'grape' });
    s.clear();
    expect(s.getValue()).toBe('');
    assertPlaceholder(s.element, 'Select...');
  });

  it('clicking same value re-selects (no toggle in single mode)', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, closeOnSelect: false });
    s.open();
    getVisibleOptions()[0]!.click(); // apple
    expect(s.getValue()).toBe('apple');
    // Click apple again
    getVisibleOptions()[0]!.click();
    expect(s.getValue()).toBe('apple'); // still selected, not toggled off
  });

  it('closeOnSelect=false keeps dropdown open', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, closeOnSelect: false });
    s.open();
    getVisibleOptions()[0]!.click();
    assertOpen(s.element);
  });

  it('hasValue() returns correct result', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'cherry' });
    expect(s.hasValue('cherry')).toBe(true);
    expect(s.hasValue('banana')).toBe(false);
  });

  it('getSelectedOptions() returns full objects', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'grape' });
    const selected = s.getSelectedOptions();
    expect(selected).toHaveLength(1);
    expect(selected[0]!.value).toBe('grape');
    expect(selected[0]!.label).toBe('Grape');
  });

  it('has-value CSS class is added when value exists', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'apple' });
    expect(s.element.classList.contains('fs--has-value')).toBe(true);
  });

  it('has-value CSS class is removed on clear', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'apple' });
    s.clear();
    expect(s.element.classList.contains('fs--has-value')).toBe(false);
  });

  it('setValue replaces previous value', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'apple' });
    s.setValue('banana');
    expect(s.getValue()).toBe('banana');
  });
});

describe('Selection — Multi mode', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('click toggles selection', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, multiple: true });
    s.open();
    getVisibleOptions()[0]!.click(); // select apple
    expect(s.getValue()).toEqual(['apple']);
    getVisibleOptions()[0]!.click(); // deselect apple
    expect((s.getValue() as string[]).includes('apple')).toBe(false);
  });

  it('does not close on select by default', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, multiple: true });
    s.open();
    getVisibleOptions()[0]!.click();
    assertOpen(s.element);
  });

  it('closeOnSelect=true closes dropdown', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, multiple: true, closeOnSelect: true });
    s.open();
    getVisibleOptions()[0]!.click();
    assertClosed(s.element);
  });

  it('renders tags with remove buttons', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      multiple: true,
      value: ['apple', 'grape'],
    });
    const tags = getTags(s.element);
    expect(tags).toHaveLength(2);
    expect(tags[0]!.querySelector('.fs__tag-label')?.textContent).toBe('Apple');
    expect(tags[1]!.querySelector('.fs__tag-label')?.textContent).toBe('Grape');
    expect(tags[0]!.querySelector('.fs__tag-remove')).not.toBeNull();
  });

  it('tag remove deselects value', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      multiple: true,
      value: ['apple', 'banana'],
    });
    const removeBtn = s.element.querySelector('.fs__tag-remove') as HTMLElement;
    removeBtn.click();
    expect(s.getValue() as string[]).toHaveLength(1);
  });

  it('maxItems prevents excess selections', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      multiple: true,
      maxItems: 2,
      value: ['apple', 'banana'],
    });
    s.open();
    const cherry = getVisibleOptions().find((o) => o.getAttribute('data-value') === 'cherry');
    cherry?.click();
    expect(s.getValue() as string[]).toHaveLength(2);
    expect(s.getValue() as string[]).not.toContain('cherry');
  });

  it('selectAll selects all non-disabled options', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS_WITH_DISABLED, multiple: true });
    s.selectAll();
    const val = s.getValue() as string[];
    expect(val).toContain('apple');
    expect(val).toContain('cherry');
    expect(val).not.toContain('banana'); // disabled
  });

  it('selectAll respects maxItems', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, multiple: true, maxItems: 2 });
    s.selectAll();
    expect(s.getValue() as string[]).toHaveLength(2);
  });

  it('deselectAll clears all', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      multiple: true,
      value: ['apple', 'banana'],
    });
    s.deselectAll();
    expect(s.getValue()).toEqual([]);
  });

  it('getValue returns array (empty when nothing selected)', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, multiple: true });
    expect(s.getValue()).toEqual([]);
  });

  it('getValue returns array of selected values', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      multiple: true,
      value: ['apple', 'cherry'],
    });
    expect(s.getValue()).toEqual(['apple', 'cherry']);
  });

  it('hasValue() works in multi mode', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      multiple: true,
      value: ['apple', 'cherry'],
    });
    expect(s.hasValue('apple')).toBe(true);
    expect(s.hasValue('banana')).toBe(false);
  });

  it('getSelectedOptions() returns full objects in multi mode', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      multiple: true,
      value: ['apple', 'cherry'],
    });
    const selected = s.getSelectedOptions();
    expect(selected).toHaveLength(2);
    expect(selected[0]!.label).toBe('Apple');
    expect(selected[1]!.label).toBe('Cherry');
  });

  it('has-value class management in multi mode', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, multiple: true });
    expect(s.element.classList.contains('fs--has-value')).toBe(false);
    s.setValue(['apple']);
    expect(s.element.classList.contains('fs--has-value')).toBe(true);
    s.clear();
    expect(s.element.classList.contains('fs--has-value')).toBe(false);
  });
});
