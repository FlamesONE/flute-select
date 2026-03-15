import { vi } from 'vitest';

// --- IntersectionObserver ---

type IOCallback = (entries: IntersectionObserverEntry[]) => void;

export class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  callback: IOCallback;
  elements: Element[] = [];

  constructor(callback: IOCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element): void {
    this.elements.push(el);
  }

  unobserve(el: Element): void {
    this.elements = this.elements.filter((e) => e !== el);
  }

  disconnect(): void {
    this.elements = [];
  }

  /** Test helper: simulate intersection */
  trigger(isIntersecting = true): void {
    this.callback([{ isIntersecting, target: this.elements[0] } as IntersectionObserverEntry]);
  }
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// --- MutationObserver ---

export class MockMutationObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => [] as MutationRecord[]);
  constructor(_callback: MutationCallback) {}
}

Object.defineProperty(window, 'MutationObserver', {
  writable: true,
  value: MockMutationObserver,
});

// --- requestAnimationFrame (synchronous for tests) ---

window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
  cb(0);
  return 0;
};
window.cancelAnimationFrame = vi.fn();

// --- Element mocks ---

Element.prototype.scrollIntoView = vi.fn();

Element.prototype.getBoundingClientRect = vi.fn(
  () =>
    ({
      top: 100,
      left: 100,
      bottom: 140,
      right: 300,
      width: 200,
      height: 40,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    }) as DOMRect,
);

// --- Global fetch mock ---

const mockFetch = vi.fn();
Object.defineProperty(window, 'fetch', { writable: true, value: mockFetch });

export { mockFetch };
