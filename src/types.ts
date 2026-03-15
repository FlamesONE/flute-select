export interface SelectOption {
  value: string;
  label: string;
  html?: string;
  disabled?: boolean;
  image?: string;
  icon?: string;
  description?: string;
  data?: Record<string, unknown>;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectSeparator {
  separator: true;
}

export type SelectItem = SelectOption | SelectGroup | SelectSeparator;

export type PositionMode = 'dropdown' | 'aligned';
export type SelectSize = 'sm' | 'md' | 'lg';

export interface LazyConfig {
  pageSize: number;
  searchParam: string;
  pageParam: string;
  pageSizeParam: string;
  dataPath: string;
  totalPath: string;
  lastPagePath: string;
  headers: Record<string, string>;
  transformResponse: ((data: unknown) => SelectOption[]) | null;
  debounce: number;
  loadOnInit: boolean;
}

export interface SelectConfig {
  options: SelectItem[];
  source: string;
  lazy: Partial<LazyConfig>;
  multiple: boolean;
  searchable: boolean;
  placeholder: string;
  searchPlaceholder: string;
  positioning: PositionMode;
  size: SelectSize;
  clearable: boolean;
  creatable: boolean;
  createLabel: string;
  disabled: boolean;
  maxItems: number;
  maxHeight: number;
  closeOnSelect: boolean | null;
  name: string;
  value: string | string[];
  cssClass: string;
  flip: boolean;
  animationDuration: number;
  zIndex: number;
  portalTo: HTMLElement | string | null;
  emptyText: string;
  loadingText: string;

  renderOption: ((option: SelectOption, state: OptionRenderState) => string) | null;
  renderSelected: ((option: SelectOption) => string) | null;
  renderTag: ((option: SelectOption) => string) | null;
  renderEmpty: ((query: string) => string) | null;

  onChange: ((value: string | string[], option?: SelectOption | SelectOption[]) => void) | null;
  onOpen: (() => void) | null;
  onClose: (() => void) | null;
  onSearch: ((query: string) => void) | null;
  onCreate: ((value: string) => SelectOption | Promise<SelectOption>) | null;
}

export interface OptionRenderState {
  selected: boolean;
  highlighted: boolean;
}

export interface EventMap {
  change: { value: string | string[]; option?: SelectOption | SelectOption[] };
  open: undefined;
  close: undefined;
  search: { query: string };
  create: { option: SelectOption };
  load: { options: SelectOption[]; page: number };
  focus: undefined;
  blur: undefined;
}

export type EventName = keyof EventMap;

export type EventHandler<K extends EventName> = (data: EventMap[K]) => void;

export interface LoadResult {
  options: SelectOption[];
  hasMore: boolean;
}
