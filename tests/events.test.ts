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
import { createAnchor, FRUITS } from './helpers';

describe('FluteSelect — events', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = createAnchor();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('onChange fires on setValue', () => {
    const onChange = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS, onChange });
    s.setValue('apple');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('apple', expect.objectContaining({ value: 'apple' }));
  });

  it('onChange does not fire with silent=true', () => {
    const onChange = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS, onChange });
    s.setValue('apple', true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('onOpen fires on open', () => {
    const onOpen = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS, onOpen });
    s.open();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('onClose fires on close', () => {
    const onClose = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS, onClose });
    s.open();
    s.close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('on/off manages custom handlers', () => {
    const handler = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.on('change', handler);
    s.setValue('apple');
    expect(handler).toHaveBeenCalledTimes(1);

    s.off('change', handler);
    s.setValue('banana');
    expect(handler).toHaveBeenCalledTimes(1); // not called again
  });

  it('on() is chainable', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    const result = s.on('open', () => {}).on('close', () => {});
    expect(result).toBe(s);
  });

  it('dispatches fs:change CustomEvent on container', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    const handler = vi.fn();
    s.element.addEventListener('fs:change', handler);
    s.setValue('grape');
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.value).toBe('grape');
  });

  it('error in handler does not crash other handlers', () => {
    const badHandler = vi.fn(() => {
      throw new Error('boom');
    });
    const goodHandler = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.on('change', badHandler);
    s.on('change', goodHandler);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    s.setValue('apple');
    expect(goodHandler).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it('focus and blur events fire', () => {
    const focusHandler = vi.fn();
    const blurHandler = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.on('focus', focusHandler);
    s.on('blur', blurHandler);

    const trigger = s.element.querySelector('button') as HTMLElement;
    trigger.dispatchEvent(new Event('focus'));
    expect(focusHandler).toHaveBeenCalledTimes(1);

    trigger.dispatchEvent(new Event('blur'));
    expect(blurHandler).toHaveBeenCalledTimes(1);
  });

  it('onChange fires with option objects in multi mode', () => {
    const onChange = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS, multiple: true, onChange });
    s.setValue(['apple', 'cherry']);
    expect(onChange).toHaveBeenCalledWith(
      ['apple', 'cherry'],
      expect.arrayContaining([
        expect.objectContaining({ value: 'apple' }),
        expect.objectContaining({ value: 'cherry' }),
      ]),
    );
  });
});
