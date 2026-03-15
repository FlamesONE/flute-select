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
import { createAnchor, createNativeSelect, FRUITS, getHiddenInputs } from './helpers';

describe('Form — Hidden inputs', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('creates hidden input with configured name', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, name: 'fruit', value: 'banana' });
    const inputs = getHiddenInputs(s.element);
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.name).toBe('fruit');
    expect(inputs[0]!.value).toBe('banana');
  });

  it('creates multiple inputs with [] suffix for multi-select', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      name: 'fruits',
      multiple: true,
      value: ['apple', 'cherry'],
    });
    const inputs = getHiddenInputs(s.element);
    expect(inputs).toHaveLength(2);
    expect(inputs[0]!.name).toBe('fruits[]');
    expect(inputs[0]!.value).toBe('apple');
    expect(inputs[1]!.name).toBe('fruits[]');
    expect(inputs[1]!.value).toBe('cherry');
  });

  it('updates hidden input on value change', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, name: 'f', value: 'apple' });
    s.setValue('grape');
    const inputs = getHiddenInputs(s.element);
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.value).toBe('grape');
  });

  it('creates empty hidden input when no value and name is set', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, name: 'f' });
    const inputs = getHiddenInputs(s.element);
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.value).toBe('');
  });

  it('does not create hidden input when no name', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, value: 'apple' });
    const inputs = getHiddenInputs(s.element);
    expect(inputs).toHaveLength(0);
  });
});

describe('Form — Clear button', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('clears value and updates hidden input', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      name: 'f',
      value: 'banana',
      clearable: true,
    });
    const clearBtn = s.element.querySelector('[aria-label="Clear"]') as HTMLElement;
    expect(clearBtn).not.toBeNull();
    clearBtn.click();
    expect(s.getValue()).toBe('');
    const inputs = getHiddenInputs(s.element);
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.value).toBe('');
  });
});

describe('Form — Native select sync', () => {
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('syncs value back to native select on change', () => {
    const native = createNativeSelect([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
      { value: 'c', label: 'C' },
    ]);
    const s = FluteSelect.fromElement(native);
    s.setValue('c');
    expect(Array.from(native.selectedOptions).map((o) => o.value)).toEqual(['c']);
  });

  it('fires change event on native select', () => {
    const native = createNativeSelect([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]);
    const handler = vi.fn();
    native.addEventListener('change', handler);
    const s = FluteSelect.fromElement(native);
    s.setValue('b');
    expect(handler).toHaveBeenCalled();
  });
});
