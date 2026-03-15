import type { FluteSelect } from '../core/core';

type SelectConstructor = (el: HTMLElement, config?: Record<string, unknown>) => FluteSelect;

interface SavedState {
  value: string | string[];
}

export class Registry {
  private static readonly instances = new Map<HTMLElement, FluteSelect>();
  private static htmxBound = false;
  private static observer: MutationObserver | null = null;
  private static fromElementFn: SelectConstructor | null = null;

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

  static destroyAll(): void {
    const all = Array.from(Registry.instances.values());
    for (const inst of all) {
      inst.destroy();
    }
  }

  static enableHtmx(): void {
    if (Registry.htmxBound) {
      return;
    }
    Registry.htmxBound = true;

    const SELECTOR = '[data-flute-select], select[data-flute-select]';

    document.body.addEventListener('htmx:beforeSwap', ((e: Event) => {
      const detail = (e as CustomEvent<{ target?: HTMLElement }>).detail;
      const target = detail?.target;
      if (!target) {
        return;
      }

      // Save state of all selects about to be swapped out
      const nodes = Registry.findSelectNodes(target, SELECTOR);
      for (const node of nodes) {
        const instance = Registry.instances.get(node);
        if (instance) {
          const saved: SavedState = { value: instance.getValue() };
          node.setAttribute('data-fs-saved', JSON.stringify(saved));
          instance.destroy();
        }
      }
    }) as EventListener);

    document.body.addEventListener('htmx:afterSettle', ((e: Event) => {
      const detail = (e as CustomEvent<{ target?: HTMLElement }>).detail;
      const target = detail?.target;
      if (!target || !Registry.fromElementFn) {
        return;
      }

      // Re-init selects in swapped content
      const nodes = Registry.findSelectNodes(target, SELECTOR);
      for (const node of nodes) {
        if (Registry.instances.has(node)) {
          continue;
        }
        const instance = Registry.fromElementFn(node);
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

  private static initInSubtree(root: HTMLElement): void {
    if (!Registry.fromElementFn) {
      return;
    }
    const targets = root.matches('[data-flute-select]')
      ? [root]
      : Array.from(root.querySelectorAll<HTMLElement>('[data-flute-select]'));

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
