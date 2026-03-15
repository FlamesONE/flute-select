import type { SelectState } from './state';

export interface KeyboardCallbacks {
  select(value: string): void;
  create(value: string): void;
  close(): void;
  focusTrigger(): void;
}

export class KeyboardHandler {
  private readonly state: SelectState;
  private readonly callbacks: KeyboardCallbacks;
  private readonly isSearchable: boolean;
  private readonly isCreatable: boolean;
  private readonly onHighlightChange: () => void;

  constructor(
    state: SelectState,
    callbacks: KeyboardCallbacks,
    isSearchable: boolean,
    isCreatable: boolean,
    onHighlightChange: () => void,
  ) {
    this.state = state;
    this.callbacks = callbacks;
    this.isSearchable = isSearchable;
    this.isCreatable = isCreatable;
    this.onHighlightChange = onHighlightChange;
  }

  handle(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.moveHighlight(1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.moveHighlight(-1);
        break;

      case 'Home':
        e.preventDefault();
        this.highlightFirst();
        break;

      case 'End':
        e.preventDefault();
        this.highlightLast();
        break;

      case 'Enter':
        e.preventDefault();
        this.confirmSelection();
        break;

      case 'Escape':
        e.preventDefault();
        this.callbacks.close();
        this.callbacks.focusTrigger();
        break;

      case 'Tab':
        this.callbacks.close();
        break;

      default:
        if (!this.isSearchable && e.key.length === 1) {
          this.typeAhead(e.key);
        }
        break;
    }
  }

  private moveHighlight(direction: 1 | -1): void {
    const opts = this.state.filteredOptions;
    let idx = this.state.highlighted + direction;

    while (idx >= 0 && idx < opts.length) {
      if (!opts[idx]?.disabled) {
        this.state.highlighted = idx;
        this.onHighlightChange();
        return;
      }
      idx += direction;
    }
  }

  private highlightFirst(): void {
    const idx = this.state.filteredOptions.findIndex((o) => !o.disabled);
    if (idx >= 0) {
      this.state.highlighted = idx;
      this.onHighlightChange();
    }
  }

  private highlightLast(): void {
    const opts = this.state.filteredOptions;
    for (let i = opts.length - 1; i >= 0; i--) {
      if (!opts[i]?.disabled) {
        this.state.highlighted = i;
        this.onHighlightChange();
        return;
      }
    }
  }

  private confirmSelection(): void {
    const opt = this.state.getFilteredAt(this.state.highlighted);

    if (opt && !opt.disabled) {
      this.callbacks.select(opt.value);
      return;
    }

    if (this.isCreatable && this.state.searchQuery) {
      this.callbacks.create(this.state.searchQuery);
    }
  }

  private typeAhead(char: string): void {
    const opts = this.state.filteredOptions;
    const lc = char.toLowerCase();

    for (let i = this.state.highlighted + 1; i < opts.length; i++) {
      if (opts[i]?.label.toLowerCase().startsWith(lc) && !opts[i]?.disabled) {
        this.state.highlighted = i;
        this.onHighlightChange();
        return;
      }
    }

    for (let i = 0; i <= this.state.highlighted; i++) {
      if (opts[i]?.label.toLowerCase().startsWith(lc) && !opts[i]?.disabled) {
        this.state.highlighted = i;
        this.onHighlightChange();
        return;
      }
    }
  }
}
