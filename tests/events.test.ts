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
import { createAnchor, FRUITS, getTrigger } from './helpers';

describe('Events — onChange', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => { anchor = createAnchor(); });
  afterEach(() => { FluteSelect.destroyAll(); document.body.innerHTML = ''; });

  it('fires with value and option on setValue', () => {
    const onChange = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS, onChange });
    s.setValue('apple');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('apple', expect.objectContaining({ value: 'apple', label: 'Apple' }));
  });

  it('silent=true suppresses onChange', () => {
    const onChange = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS, onChange });
    s.setValue('apple', true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('fires with array in multi mode', () => {
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

describe('Events — onOpen / onClose', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => { anchor = createAnchor(); });
  afterEach(() => { FluteSelect.destroyAll(); document.body.innerHTML = ''; });

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
});

describe('Events — on / off', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => { anchor = createAnchor(); });
  afterEach(() => { FluteSelect.destroyAll(); document.body.innerHTML = ''; });

  it('on() registers and off() unregisters handler', () => {
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

  it('off() is chainable', () => {
    const handler = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS });
    const result = s.on('change', handler).off('change', handler);
    expect(result).toBe(s);
  });
});

describe('Events — CustomEvent dispatch', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => { anchor = createAnchor(); });
  afterEach(() => { FluteSelect.destroyAll(); document.body.innerHTML = ''; });

  it('fs:change dispatches on container with detail', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    const handler = vi.fn();
    s.element.addEventListener('fs:change', handler);
    s.setValue('grape');
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.value).toBe('grape');
    expect(detail.option).toEqual(expect.objectContaining({ value: 'grape' }));
  });

  it('fs:open dispatches on open', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    const handler = vi.fn();
    s.element.addEventListener('fs:open', handler);
    s.open();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('fs:close dispatches on close', () => {
    const s = FluteSelect.create(anchor, { options: FRUITS });
    const handler = vi.fn();
    s.element.addEventListener('fs:close', handler);
    s.open();
    s.close();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('Events — Error handling', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => { anchor = createAnchor(); });
  afterEach(() => { FluteSelect.destroyAll(); document.body.innerHTML = ''; });

  it('error in handler does not crash other handlers', () => {
    const badHandler = vi.fn(() => { throw new Error('boom'); });
    const goodHandler = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.on('change', badHandler);
    s.on('change', goodHandler);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    s.setValue('apple');
    expect(goodHandler).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('Events — focus / blur', () => {
  let anchor: HTMLDivElement;
  beforeEach(() => { anchor = createAnchor(); });
  afterEach(() => { FluteSelect.destroyAll(); document.body.innerHTML = ''; });

  it('focus event fires on trigger focus', () => {
    const handler = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.on('focus', handler);
    const trigger = getTrigger(s.element);
    trigger.dispatchEvent(new Event('focus'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('blur event fires on trigger blur', () => {
    const handler = vi.fn();
    const s = FluteSelect.create(anchor, { options: FRUITS });
    s.on('blur', handler);
    const trigger = getTrigger(s.element);
    trigger.dispatchEvent(new Event('blur'));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
