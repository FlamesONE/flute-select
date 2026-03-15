export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string | undefined>,
  children?: (Node | string)[],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      if (val !== undefined) {
        node.setAttribute(key, val);
      }
    }
  }

  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        node.appendChild(document.createTextNode(child));
      } else {
        node.appendChild(child);
      }
    }
  }

  return node;
}

export function resolveElement(ref: string | HTMLElement): HTMLElement | null {
  if (typeof ref === 'string') {
    return document.querySelector<HTMLElement>(ref);
  }
  return ref;
}

export function resolvePortal(ref: HTMLElement | string | null): HTMLElement {
  if (!ref) {
    return document.body;
  }
  if (typeof ref === 'string') {
    return document.querySelector<HTMLElement>(ref) ?? document.body;
  }
  return ref;
}

export function getByPath(obj: unknown, path: string): unknown {
  let current: unknown = obj;
  for (const key of path.split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
