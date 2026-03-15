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
import { createAnchor, createNativeSelect, FRUITS } from './helpers';

describe('FluteSelect — form integration', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('creates hidden input with configured name', () => {
    FluteSelect.create(anchor, { options: FRUITS, name: 'fruit', value: 'banana' });
    const container = anchor.nextElementSibling as HTMLElement;
    const input = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.name).toBe('fruit');
    expect(input.value).toBe('banana');
  });

  it('creates multiple inputs with [] suffix for multi-select', () => {
    FluteSelect.create(anchor, {
      options: FRUITS,
      name: 'fruits',
      multiple: true,
      value: ['apple', 'cherry'],
    });
    const container = anchor.nextElementSibling as HTMLElement;
    const inputs = container.querySelectorAll('input[type="hidden"]');
    expect(inputs.length).toBe(2);
    expect((inputs[0] as HTMLInputElement).name).toBe('fruits[]');
    expect((inputs[0] as HTMLInputElement).value).toBe('apple');
    expect((inputs[1] as HTMLInputElement).name).toBe('fruits[]');
    expect((inputs[1] as HTMLInputElement).value).toBe('cherry');
  });

  it('updates hidden input on value change', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS, name: 'f', value: 'apple' });
    s.setValue('grape');
    const container = anchor.nextElementSibling as HTMLElement;
    const input = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(input.value).toBe('grape');
  });

  it('creates empty hidden input when no value and name is set', () => {
    FluteSelect.create(anchor, { options: FRUITS, name: 'f' });
    const container = anchor.nextElementSibling as HTMLElement;
    const input = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('does not create hidden input without name', () => {
    FluteSelect.create(anchor, { options: FRUITS, value: 'apple' });
    const container = anchor.nextElementSibling as HTMLElement;
    expect(container.querySelector('input[type="hidden"]')).toBeNull();
  });

  it('clearable button clears value and updates input', () => {
    const s = FluteSelect.create(anchor, {
      options: FRUITS,
      name: 'f',
      value: 'banana',
      clearable: true,
    });
    const clearBtn = s.element.querySelector('[aria-label="Clear"]') as HTMLElement;
    clearBtn.click();
    expect(s.getValue()).toBe('');
    const input = s.element.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('syncs native <select> on value change', () => {
    const native = createNativeSelect([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
      { value: 'c', label: 'C' },
    ]);
    const s = FluteSelect.fromElement(native);
    s.setValue('c');
    const selected = Array.from(native.selectedOptions).map((o) => o.value);
    expect(selected).toEqual(['c']);
  });

  it('native <select> change event fires on sync', () => {
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
