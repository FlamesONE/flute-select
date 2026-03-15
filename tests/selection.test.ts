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
import { createAnchor, FRUITS, FRUITS_WITH_DISABLED, getVisibleOptions } from './helpers';

describe('FluteSelect — single select', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('setValue / getValue', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.setValue('cherry');
    expect(s.getValue()).toBe('cherry');
  });

  it('setValue replaces previous value (single mode)', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'apple' });
    s.setValue('banana');
    expect(s.getValue()).toBe('banana');
  });

  it('clear() empties selection', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'grape' });
    s.clear();
    expect(s.getValue()).toBe('');
  });

  it('clicking an option selects it and closes (single mode)', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.open();
    const opts = getVisibleOptions();
    expect(opts.length).toBe(5);
    opts[2]!.click(); // cherry
    expect(s.getValue()).toBe('cherry');
    expect(s.element.classList.contains('fs--open')).toBe(false);
  });

  it('shows selected label in trigger', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'banana' });
    const label = s.element.querySelector('.fs__trigger-label');
    expect(label?.textContent).toBe('Banana');
  });

  it('shows placeholder when empty', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, placeholder: 'Pick...' });
    const label = s.element.querySelector('.fs__trigger-label');
    expect(label?.textContent).toBe('Pick...');
    expect(label?.classList.contains('fs__trigger-label--empty')).toBe(true);
  });

  it('shows checkmark on selected option', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'apple' });
    s.open();
    const selected = document.querySelector('.fs__option--selected');
    expect(selected).not.toBeNull();
    expect(selected?.querySelector('.fs__option-check')).not.toBeNull();
    expect(selected?.getAttribute('data-value')).toBe('apple');
  });

  it('disabled option has disabled class', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS_WITH_DISABLED });
    s.open();
    const opts = getVisibleOptions();
    const disabledOpt = opts.find((o) => o.getAttribute('data-value') === 'banana');
    expect(disabledOpt?.classList.contains('fs__option--disabled')).toBe(true);
  });

  it('setValue with silent=true does not fire onChange', () => {
    const onChange = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS, onChange });
    s.setValue('apple', true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clear with silent=true does not fire onChange', () => {
    const onChange = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'apple', onChange });
    s.clear(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closeOnSelect=false keeps dropdown open in single mode', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, closeOnSelect: false });
    s.open();
    const opts = getVisibleOptions();
    opts[0]!.click();
    expect(s.element.classList.contains('fs--open')).toBe(true);
  });

  it('has-value class is added when value exists', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'apple' });
    expect(s.element.classList.contains('fs--has-value')).toBe(true);
  });

  it('has-value class is removed on clear', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'apple' });
    s.clear();
    expect(s.element.classList.contains('fs--has-value')).toBe(false);
  });
});

describe('FluteSelect — multi-select', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('multiple values via setValue', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, multiple: true });
    s.setValue(['apple', 'cherry']);
    expect(s.getValue()).toEqual(['apple', 'cherry']);
  });

  it('clicking toggles selection in multi mode', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, multiple: true });
    s.open();
    getVisibleOptions()[0]!.click(); // select apple
    expect(s.getValue()).toEqual(['apple']);
    // After re-render, get fresh options and deselect
    getVisibleOptions()[0]!.click();
    expect((s.getValue() as string[]).includes('apple')).toBe(false);
  });

  it('does not close on select in multi mode', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, multiple: true });
    s.open();
    getVisibleOptions()[0]!.click();
    expect(s.element.classList.contains('fs--open')).toBe(true);
  });

  it('renders tags for selected values', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      multiple: true,
      value: ['apple', 'grape'],
    });
    const tags = s.element.querySelectorAll('.fs__tag');
    expect(tags.length).toBe(2);
    expect(tags[0]!.querySelector('.fs__tag-label')?.textContent).toBe('Apple');
    expect(tags[1]!.querySelector('.fs__tag-label')?.textContent).toBe('Grape');
  });

  it('tag remove button deselects the option', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      multiple: true,
      value: ['apple', 'banana'],
    });
    const removeBtn = s.element.querySelector('.fs__tag-remove') as HTMLElement;
    expect(removeBtn).not.toBeNull();
    removeBtn.click();
    expect((s.getValue() as string[]).length).toBe(1);
  });

  it('maxItems prevents adding more selections', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      multiple: true,
      maxItems: 2,
      value: ['apple', 'banana'],
    });
    s.open();
    const opts = getVisibleOptions();
    const cherryOpt = opts.find((o) => o.getAttribute('data-value') === 'cherry');
    cherryOpt?.click();
    expect((s.getValue() as string[]).length).toBe(2);
  });

  it('getSelectedOptions returns full option objects', () => {
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

  it('closeOnSelect=true closes dropdown in multi mode', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      multiple: true,
      closeOnSelect: true,
    });
    s.open();
    getVisibleOptions()[0]!.click();
    expect(s.element.classList.contains('fs--open')).toBe(false);
  });

  it('getValue returns empty array when nothing selected (multi)', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, multiple: true });
    expect(s.getValue()).toEqual([]);
  });
});
