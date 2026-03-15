import type {
  SelectConfig,
  SelectItem,
  SelectOption,
  SelectGroup,
  SelectSeparator,
} from '../types';

export function isGroup(item: SelectItem): item is SelectGroup {
  return 'options' in item && Array.isArray((item as unknown as SelectGroup).options);
}

export function isSeparator(item: SelectItem): item is SelectSeparator {
  return 'separator' in item && (item as unknown as SelectSeparator).separator === true;
}

export interface ParsedOptions {
  flat: SelectOption[];
  groups: Map<string, SelectOption[]>;
  separatorIndices: Set<number>;
}

export function parseItems(items: SelectItem[]): ParsedOptions {
  const flat: SelectOption[] = [];
  const groups = new Map<string, SelectOption[]>();
  const separatorIndices = new Set<number>();

  for (const item of items) {
    if (isSeparator(item)) {
      separatorIndices.add(flat.length);
    } else if (isGroup(item)) {
      groups.set(item.label, item.options);
      flat.push(...item.options);
    } else {
      flat.push(item);
    }
  }

  return { flat, groups, separatorIndices };
}

export class SelectState {
  isOpen = false;
  readonly selected = new Set<string>();
  highlighted = -1;
  searchQuery = '';
  allOptions: SelectOption[] = [];
  filteredOptions: SelectOption[] = [];
  groups = new Map<string, SelectOption[]>();
  separatorIndices = new Set<number>();
  loading = false;
  page = 1;
  hasMore = false;
  disabled = false;

  constructor(config: SelectConfig) {
    const { flat, groups, separatorIndices } = parseItems(config.options);
    this.allOptions = flat;
    this.filteredOptions = flat;
    this.groups = groups;
    this.separatorIndices = separatorIndices;
    this.disabled = config.disabled;
    this.hasMore = !!config.source;

    this.initValue(config.value);
  }

  private initValue(value: string | string[]): void {
    if (!value) {
      return;
    }
    const vals = Array.isArray(value) ? value : [value];
    for (const v of vals) {
      if (v) {
        this.selected.add(v);
      }
    }
  }

  findOption(value: string): SelectOption | undefined {
    return this.allOptions.find((o) => o.value === value);
  }

  getSelectedOptions(): SelectOption[] {
    return this.allOptions.filter((o) => this.selected.has(o.value));
  }

  getFilteredAt(index: number): SelectOption | undefined {
    return this.filteredOptions[index];
  }

  replaceOptions(items: SelectItem[]): void {
    const { flat, groups, separatorIndices } = parseItems(items);
    this.allOptions = flat;
    this.groups = groups;
    this.separatorIndices = separatorIndices;
    this.filteredOptions = flat;
    this.page = 1;
    this.hasMore = false;

    const validValues = new Set(flat.map((o) => o.value));
    for (const v of this.selected) {
      if (!validValues.has(v)) {
        this.selected.delete(v);
      }
    }
  }

  appendOptions(options: SelectOption[]): void {
    this.allOptions = [...this.allOptions, ...options];
    this.filteredOptions = this.allOptions;
  }

  resetSearch(): void {
    this.searchQuery = '';
    this.filteredOptions = this.allOptions;
    this.highlighted = -1;
  }
}
