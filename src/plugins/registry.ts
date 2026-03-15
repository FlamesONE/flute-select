import type { FluteSelect } from '../core/core';

type SelectConstructor = (el: HTMLElement, config?: Record<string, unknown>) => FluteSelect;

interface SavedState {
  value: string | string[];
}

interface HtmxOptions {
  /** CSS selector for select elements (default: '[data-flute-select], select[data-flute-select]') */
  selector?: string;
  /** Whether to auto-reinitialize selects after HTMX swap (default: true) */
  autoInit?: boolean;
  /** Whether to save/restore values across swaps (default: true) */
  saveState?: boolean;
  /** Custom init callback — called for each new select after swap, receives (element, instance) */
  onInit?: (el: HTMLElement, instance: FluteSelect) => void;
  /** Custom cleanup callback — called before each select is destroyed on swap */
  onBeforeDestroy?: (el: HTMLElement, instance: FluteSelect) => void;
}

export class Registry {
  private static readonly instances = new Map<HTMLElement, FluteSelect>();
  private static htmxBound = false;
  private static observer: MutationObserver | null = null;
  private static fromElementFn: SelectConstructor | null = null;
  private static htmxSelector = '[data-flute-select], select[data-flute-select]';

  static setFactory(fn: SelectConstructor): void {
    Registry.fromElementFn = fn;
  }

  static register(el: HTMLElement, instance: FluteSelect): void {
    Registry.instances.set(el, instance);
  }

  static unregister(el: HTMLElement): void {
    Registry.instances.delete(el);
  }

  static get(el: HTMLElement): FluteSelect | undefined {
    return Registry.instances.get(el);
  }

  static has(el: HTMLElement): boolean {
    return Registry.instances.has(el);
  }

  static getAll(): Map<HTMLElement, FluteSelect> {
    return Registry.instances;
  }

  static destroyAll(): void {
    const all = Array.from(Registry.instances.values());
    for (const inst of all) {
      inst.destroy();
    }
  }

  /**
   * Destroy all FluteSelect instances within a DOM subtree.
   * Useful for manual cleanup before DOM manipulation.
   */
  static destroyIn(root: HTMLElement): void {
    Registry.destroyInSubtree(root);
  }

  /**
   * Initialize all uninitialized selects within a DOM subtree.
   * Useful for manual init after dynamic content insertion.
   */
  static initIn(root: HTMLElement, selector?: string): void {
    Registry.initInSubtree(root, selector);
  }

  static enableHtmx(options?: HtmxOptions): void {
    if (Registry.htmxBound) {
      return;
    }
    Registry.htmxBound = true;

    const opts: Required<HtmxOptions> = {
      selector: options?.selector ?? '[data-flute-select], select[data-flute-select]',
      autoInit: options?.autoInit ?? true,
      saveState: options?.saveState ?? true,
      onInit: options?.onInit ?? (() => {}),
      onBeforeDestroy: options?.onBeforeDestroy ?? (() => {}),
    };

    Registry.htmxSelector = opts.selector;

    document.body.addEventListener('htmx:beforeSwap', ((e: Event) => {
      const detail = (e as CustomEvent<{ target?: HTMLElement }>).detail;
      const target = detail?.target;
      if (!target) {
        return;
      }

      const nodes = Registry.findSelectNodes(target, opts.selector);
      for (const node of nodes) {
        const instance = Registry.instances.get(node);
        if (instance) {
          if (opts.saveState) {
            const saved: SavedState = { value: instance.getValue() };
            node.setAttribute('data-fs-saved', JSON.stringify(saved));
          }
          opts.onBeforeDestroy(node, instance);
          instance.destroy();
          if (node.tagName === 'SELECT') {
            (node as HTMLSelectElement).style.display = 'none';
          }
        }
      }
    }) as EventListener);

    document.body.addEventListener('htmx:afterSettle', ((e: Event) => {
      if (!opts.autoInit) {
        return;
      }

      const detail = (e as CustomEvent<{ target?: HTMLElement; elt?: HTMLElement }>).detail;
      const target = detail?.target ?? detail?.elt;
      if (!target || !Registry.fromElementFn) {
        return;
      }

      const nodes = Registry.findSelectNodes(target, opts.selector);
      for (const node of nodes) {
        if (Registry.instances.has(node)) {
          continue;
        }
        const instance = Registry.fromElementFn(node);
        if (opts.saveState) {
          const saved = node.getAttribute('data-fs-saved');
          if (saved) {
            try {
              const state = JSON.parse(saved) as SavedState;
              instance.setValue(state.value, true);
            } catch {
              // ignore malformed state
            }
            node.removeAttribute('data-fs-saved');
          }
        }
        opts.onInit(node, instance);
      }
    }) as EventListener);
  }

  /** Find all select-able nodes within a subtree */
  private static findSelectNodes(root: HTMLElement, selector: string): HTMLElement[] {
    const nodes: HTMLElement[] = [];
    if (root.matches(selector)) {
      nodes.push(root);
    }
    root.querySelectorAll<HTMLElement>(selector).forEach((n) => nodes.push(n));
    return nodes;
  }

  static observe(root: HTMLElement = document.body): void {
    if (Registry.observer) {
      return;
    }

    Registry.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof HTMLElement)) {
            continue;
          }
          Registry.initInSubtree(node);
        }
        for (const node of Array.from(mutation.removedNodes)) {
          if (!(node instanceof HTMLElement)) {
            continue;
          }
          Registry.destroyInSubtree(node);
        }
      }
    });

    Registry.observer.observe(root, { childList: true, subtree: true });
  }

  static stopObserving(): void {
    Registry.observer?.disconnect();
    Registry.observer = null;
  }

  private static initInSubtree(root: HTMLElement, selector?: string): void {
    if (!Registry.fromElementFn) {
      return;
    }
    const sel = selector ?? Registry.htmxSelector;
    const targets = root.matches(sel)
      ? [root]
      : Array.from(root.querySelectorAll<HTMLElement>(sel));

    for (const target of targets) {
      if (!Registry.instances.has(target)) {
        Registry.fromElementFn(target);
      }
    }
  }

  private static destroyInSubtree(root: HTMLElement): void {
    Registry.instances.forEach((instance, key) => {
      if (root.contains(key) || root === key) {
        instance.destroy();
      }
    });
  }
}
