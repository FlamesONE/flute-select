import type { SelectOption } from '../types';

export function filterOptions(options: SelectOption[], query: string): SelectOption[] {
  if (!query) {
    return options;
  }

  const q = query.toLowerCase();

  return options.filter((o) => {
    if (o.label.toLowerCase().includes(q)) {
      return true;
    }
    if (o.value.toLowerCase().includes(q)) {
      return true;
    }
    if (o.description?.toLowerCase().includes(q)) {
      return true;
    }
    return false;
  });
}

export class Debouncer {
  private timer: ReturnType<typeof setTimeout> | null = null;

  schedule(fn: () => void, delay: number): void {
    this.cancel();
    this.timer = setTimeout(fn, delay);
  }

  cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  destroy(): void {
    this.cancel();
  }
}
