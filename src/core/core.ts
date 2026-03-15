import { DEFAULTS } from '../constants';
import { resolveElement, resolvePortal } from '../utils/dom';
import { Emitter } from '../utils/emitter';
import { FormBridge } from '../plugins/form';
import { KeyboardHandler } from './keyboard';
import { LazyLoader } from '../plugins/lazy';
import { Positioning } from './positioning';
import { Renderer } from './renderer';
import { Debouncer, filterOptions } from '../utils/search';
import { SelectState } from './state';
import { Registry } from '../plugins/registry';
import type {
  SelectConfig,
  SelectItem,
  SelectOption,
  EventName,
  EventHandler,
  PositionMode,
} from '../types';

let uid = 0;

export class FluteSelect {
  readonly id: string;
  readonly originalElement: HTMLElement;

  private readonly config: SelectConfig;
  private readonly state: SelectState;
  private readonly emitter = new Emitter();
  private readonly renderer: Renderer;
  private readonly positioning = new Positioning();
  private form: FormBridge;
  private readonly debouncer = new Debouncer();
  private keyboard: KeyboardHandler | null = null;
  private readonly loader: LazyLoader | null = null;
  private scrollObserver: IntersectionObserver | null = null;

  private readonly boundKeydown: (e: KeyboardEvent) => void;
  private readonly boundClickOutside: (e: MouseEvent) => void;

  static create(ref: string | HTMLElement, config?: Partial<SelectConfig>): FluteSelect {
    const el =
      resolveElement(typeof ref === 'string' ? ref : ref) ?? (typeof ref === 'string' ? null : ref);
    if (!el) {
      throw new Error(
        `[FluteSelect] Element not found: ${typeof ref === 'string' ? ref : 'HTMLElement'}`,
      );
    }

    const existing = Registry.get(el);
    if (existing) {
      existing.destroy();
    }

    return new FluteSelect(el, config);
  }

  static fromElement(ref: string | HTMLElement): FluteSelect {
    const el =
      resolveElement(typeof ref === 'string' ? ref : ref) ?? (typeof ref === 'string' ? null : ref);
    if (!el) {
      throw new Error(
        `[FluteSelect] Element not found: ${typeof ref === 'string' ? ref : 'HTMLElement'}`,
      );
    }
    return FluteSelect.create(el, FluteSelect.parseDataAttrs(el));
  }

  static initAll(selector = '[data-flute-select]'): FluteSelect[] {
    return Array.from(document.querySelectorAll<HTMLElement>(selector)).map((el) =>
      FluteSelect.fromElement(el),
    );
  }

  static get(ref: string | HTMLElement): FluteSelect | undefined {
    const el = resolveElement(typeof ref === 'string' ? ref : ref);
    return el ? Registry.get(el) : undefined;
  }

  static destroyAll(): void {
    Registry.destroyAll();
  }

  static enableHtmx(options?: Parameters<typeof Registry.enableHtmx>[0]): void {
    Registry.enableHtmx(options);
  }

  static destroyIn(root: HTMLElement): void {
    Registry.destroyIn(root);
  }

  static initIn(root: HTMLElement, selector?: string): void {
    Registry.initIn(root, selector);
  }

  static getAll(): Map<HTMLElement, FluteSelect> {
    return Registry.getAll();
  }

  static observe(root?: HTMLElement): void {
    Registry.observe(root);
  }

  static stopObserving(): void {
    Registry.stopObserving();
  }

  private constructor(el: HTMLElement, config?: Partial<SelectConfig>) {
    this.id = `fs-${++uid}`;
    this.originalElement = el;
    this.config = { ...DEFAULTS, ...config } as SelectConfig;
    this.state = new SelectState(this.config);

    this.renderer = new Renderer(this.config, this.state);
    this.form = new FormBridge(this.renderer.container ?? document.createElement('div'));

    this.boundKeydown = (e: KeyboardEvent) => this.keyboard?.handle(e);
    this.boundClickOutside = (e: MouseEvent) => this.onClickOutside(e);

    this.build();
    Registry.register(this.originalElement, this);

    if (this.config.source) {
      this.loader = new LazyLoader(this.config.source, this.config.lazy);
      if (this.loader.shouldLoadOnInit) {
        void this.loadRemote();
      }
    }
  }

  open(): void {
    if (this.state.disabled || this.state.isOpen) {
      return;
    }
    this.state.isOpen = true;

    if (this.loader && this.state.allOptions.length === 0 && !this.state.loading) {
      void this.loadRemote();
    }

    this.renderer.renderOptions();

    if (this.renderer.searchInput) {
      this.renderer.searchInput.value = '';
      this.state.resetSearch();
    }

    const isAligned = this.config.positioning === 'aligned';

    if (isAligned) {
      this.renderer.showWrapper();

      const onPositioned = (): void => {
        this.renderer.setOpen(true);
        this.renderer.setupScrollArrows();
        if (this.renderer.searchInput) {
          this.renderer.searchInput.focus();
        }
      };

      this.positioning.attach(
        this.renderer.trigger,
        this.renderer.dropdown,
        this.config,
        () => this.renderer.getSelectedOptionEl(),
        onPositioned,
      );
    } else {
      this.renderer.setOpen(true);

      this.positioning.attach(this.renderer.trigger, this.renderer.dropdown, this.config, () =>
        this.renderer.getSelectedOptionEl(),
      );

      requestAnimationFrame(() => {
        this.renderer.scrollToSelected();
      });
    }

    this.observeSentinel();

    document.addEventListener('keydown', this.boundKeydown);
    document.addEventListener('mousedown', this.boundClickOutside);

    this.emitter.emit('open', undefined);
    this.config.onOpen?.();
    this.renderer.container.dispatchEvent(new CustomEvent('fs:open', { bubbles: true }));
  }

  close(): void {
    if (!this.state.isOpen) {
      return;
    }
    this.state.isOpen = false;
    this.state.highlighted = -1;

    this.renderer.setOpen(false);
    this.renderer.hideWrapper();
    this.renderer.teardownScrollArrows();
    this.positioning.detach();
    this.disconnectSentinelObserver();

    if (this.renderer.searchInput) {
      this.renderer.searchInput.value = '';
    }
    this.state.resetSearch();

    document.removeEventListener('keydown', this.boundKeydown);
    document.removeEventListener('mousedown', this.boundClickOutside);

    this.emitter.emit('close', undefined);
    this.config.onClose?.();
    this.renderer.container.dispatchEvent(new CustomEvent('fs:close', { bubbles: true }));
  }

  toggle(): void {
    if (this.state.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  getValue(): string | string[] {
    const values = Array.from(this.state.selected);
    return this.config.multiple ? values : (values[0] ?? '');
  }

  setValue(value: string | string[], silent = false): void {
    const vals = Array.isArray(value) ? value : [value];
    this.state.selected.clear();
    for (const v of vals) {
      if (v) {
        this.state.selected.add(v);
      }
    }
    this.afterSelectionChange(silent);
  }

  clear(silent = false): void {
    this.state.selected.clear();
    this.afterSelectionChange(silent);
  }

  addOption(option: SelectOption, groupLabel?: string): void {
    this.state.allOptions.push(option);
    if (groupLabel) {
      const group = this.state.groups.get(groupLabel) ?? [];
      group.push(option);
      this.state.groups.set(groupLabel, group);
    }
    this.state.filteredOptions = filterOptions(this.state.allOptions, this.state.searchQuery);
    if (this.state.isOpen) {
      this.renderer.renderOptions();
    }
  }

  removeOption(value: string): void {
    this.state.allOptions = this.state.allOptions.filter((o) => o.value !== value);
    for (const [key, opts] of this.state.groups) {
      this.state.groups.set(
        key,
        opts.filter((o) => o.value !== value),
      );
    }
    this.state.selected.delete(value);
    this.state.filteredOptions = filterOptions(this.state.allOptions, this.state.searchQuery);
    this.afterSelectionChange(false);
  }

  updateOptions(items: SelectItem[]): void {
    this.state.replaceOptions(items);
    this.afterSelectionChange(false);
  }

  enable(): void {
    this.state.disabled = false;
    this.renderer.setDisabled(false);
  }

  disable(): void {
    this.state.disabled = true;
    this.close();
    this.renderer.setDisabled(true);
  }

  get isOpen(): boolean {
    return this.state.isOpen;
  }

  get isDisabled(): boolean {
    return this.state.disabled;
  }

  get options(): SelectOption[] {
    return [...this.state.allOptions];
  }

  get count(): number {
    return this.state.allOptions.length;
  }

  get selectedCount(): number {
    return this.state.selected.size;
  }

  selectAll(): void {
    if (!this.config.multiple) {
      return;
    }
    for (const opt of this.state.allOptions) {
      if (!opt.disabled) {
        if (this.config.maxItems > 0 && this.state.selected.size >= this.config.maxItems) {
          break;
        }
        this.state.selected.add(opt.value);
      }
    }
    this.afterSelectionChange(false);
  }

  deselectAll(silent = false): void {
    this.state.selected.clear();
    this.afterSelectionChange(silent);
  }

  async loadOptions(
    url: string,
    opts?: {
      headers?: Record<string, string>;
      transform?: (data: unknown) => SelectOption[];
      dataPath?: string;
    },
  ): Promise<SelectOption[]> {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...opts?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json: unknown = await response.json();
    let options: SelectOption[];

    if (opts?.transform) {
      options = opts.transform(json);
    } else {
      const path = opts?.dataPath ?? 'data';
      let data: unknown = json;
      for (const key of path.split('.')) {
        data = (data as Record<string, unknown>)?.[key];
      }
      options = Array.isArray(data) ? (data as SelectOption[]) : [];
    }

    this.updateOptions(options);
    return options;
  }

  search(query: string): void {
    if (!this.state.isOpen) {
      this.open();
    }
    if (this.renderer.searchInput) {
      this.renderer.searchInput.value = query;
    }
    this.handleSearch(query);
  }

  hasValue(value: string): boolean {
    return this.state.selected.has(value);
  }

  focus(): void {
    this.renderer.trigger.focus();
  }

  refresh(): void {
    const value = this.getValue();
    const wasOpen = this.state.isOpen;
    this.close();
    this.build();
    this.setValue(value, true);
    if (wasOpen) {
      this.open();
    }
  }

  destroy(): void {
    this.close();
    this.positioning.destroy();
    this.loader?.destroy();
    this.debouncer.destroy();
    this.emitter.removeAll();
    this.form.destroy();
    this.renderer.destroy();
    this.disconnectSentinelObserver();

    if (this.originalElement.tagName === 'SELECT') {
      this.originalElement.style.display = '';
    }

    Registry.unregister(this.originalElement);
  }

  on<K extends EventName>(event: K, handler: EventHandler<K>): this {
    this.emitter.on(event, handler);
    return this;
  }

  off<K extends EventName>(event: K, handler: EventHandler<K>): this {
    this.emitter.off(event, handler);
    return this;
  }

  getOption(value: string): SelectOption | undefined {
    return this.state.findOption(value);
  }

  getSelectedOptions(): SelectOption[] {
    return this.state.getSelectedOptions();
  }

  get element(): HTMLElement {
    return this.renderer.container;
  }

  private build(): void {
    try {
      this.renderer.destroy();
    } catch {
      // first build
    }

    if (this.originalElement.tagName === 'SELECT') {
      this.originalElement.style.display = 'none';
    }

    const elements = this.renderer.buildContainer(this.id);
    this.form = new FormBridge(elements.container);

    this.originalElement.insertAdjacentElement('afterend', elements.container);
    const portal = resolvePortal(this.config.portalTo);
    portal.appendChild(elements.dropdown);

    this.keyboard = new KeyboardHandler(
      this.state,
      {
        select: (v) => this.selectByValue(v),
        create: (v) => void this.handleCreate(v),
        close: () => this.close(),
        focusTrigger: () => this.focus(),
      },
      this.config.searchable,
      this.config.creatable,
      () => {
        this.renderer.updateHighlight();
        this.renderer.scrollToHighlighted();
      },
    );

    this.bindDomEvents();
    this.form.sync(this.config.name, this.state.selected, this.config.multiple);
    this.renderer.updateTriggerDisplay();
  }

  private bindDomEvents(): void {
    this.renderer.trigger.addEventListener('click', () => this.toggle());
    this.renderer.trigger.addEventListener('focus', () => this.emitter.emit('focus', undefined));
    this.renderer.trigger.addEventListener('blur', () => this.emitter.emit('blur', undefined));

    if (this.renderer.searchInput) {
      this.renderer.searchInput.addEventListener('input', (e) => {
        this.handleSearch((e.target as HTMLInputElement).value);
      });
      this.renderer.searchInput.addEventListener('mousedown', (e) => e.stopPropagation());
    }

    const clearBtn = this.renderer.trigger.querySelector('[aria-label="Clear"]');
    clearBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clear();
    });

    this.renderer.list.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      const optionEl = target.closest<HTMLElement>('[data-value]');
      if (optionEl?.dataset.value) {
        e.stopPropagation();
        this.selectByValue(optionEl.dataset.value);
        return;
      }

      const createEl = target.closest<HTMLElement>('[data-create]');
      if (createEl?.dataset.create) {
        e.stopPropagation();
        void this.handleCreate(createEl.dataset.create);
        return;
      }
    });

    this.renderer.list.addEventListener(
      'mouseenter',
      (e) => {
        const target = (e.target as HTMLElement).closest<HTMLElement>('[data-index]');
        if (target?.dataset.index) {
          this.state.highlighted = parseInt(target.dataset.index, 10);
          this.renderer.updateHighlight();
        }
      },
      true,
    );

    this.renderer.triggerLabel.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const removeBtn = target.closest<HTMLElement>(`.fs__tag-remove`);
      if (removeBtn?.dataset.value) {
        e.stopPropagation();
        this.deselectByValue(removeBtn.dataset.value);
      }
    });
  }

  private selectByValue(value: string): void {
    if (this.config.multiple) {
      if (this.state.selected.has(value)) {
        this.state.selected.delete(value);
      } else {
        if (this.config.maxItems > 0 && this.state.selected.size >= this.config.maxItems) {
          return;
        }
        this.state.selected.add(value);
      }
    } else {
      this.state.selected.clear();
      this.state.selected.add(value);
    }

    const shouldClose = this.config.closeOnSelect ?? !this.config.multiple;
    if (shouldClose) {
      this.close();
      this.focus();
    } else if (this.state.isOpen) {
      this.renderer.renderOptions();
      this.observeSentinel();
    }

    this.afterSelectionChange(false);
  }

  private deselectByValue(value: string): void {
    this.state.selected.delete(value);
    if (this.state.isOpen) {
      this.renderer.renderOptions();
    }
    this.afterSelectionChange(false);
  }

  private afterSelectionChange(silent: boolean): void {
    this.renderer.updateTriggerDisplay();
    this.form.sync(this.config.name, this.state.selected, this.config.multiple);
    this.form.syncNativeSelect(this.originalElement, this.state.selected);

    if (this.state.isOpen) {
      this.renderer.renderOptions();
      this.observeSentinel();
    }

    if (!silent) {
      const value = this.getValue();
      const option = this.config.multiple
        ? this.getSelectedOptions()
        : this.state.findOption(value as string);
      this.emitter.emit('change', { value, option });
      this.config.onChange?.(value, option);

      this.renderer.container.dispatchEvent(
        new CustomEvent('fs:change', { detail: { value, option }, bubbles: true }),
      );
    }
  }

  private handleSearch(query: string): void {
    this.state.searchQuery = query;
    this.emitter.emit('search', { query });
    this.config.onSearch?.(query);

    if (this.loader) {
      this.debouncer.schedule(() => {
        this.state.page = 1;
        this.state.allOptions = [];
        void this.loadRemote();
      }, this.loader.debounceMs);
    } else {
      this.state.filteredOptions = filterOptions(this.state.allOptions, query);
      this.state.highlighted = -1;
      this.renderer.renderOptions();
    }
  }

  private async loadRemote(): Promise<void> {
    if (!this.loader || this.state.loading) {
      return;
    }

    this.state.loading = true;
    this.renderer.renderOptions();

    try {
      const result = await this.loader.load(this.state.page, this.state.searchQuery);
      this.state.appendOptions(result.options);
      this.state.hasMore = result.hasMore;
      this.emitter.emit('load', { options: result.options, page: this.state.page });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.error('[FluteSelect] Failed to load remote options:', err);
    } finally {
      this.state.loading = false;
      this.renderer.renderOptions();
      this.observeSentinel();
    }
  }

  private observeSentinel(): void {
    this.disconnectSentinelObserver();

    const sentinel = this.renderer.getSentinel();
    if (!sentinel || !this.state.hasMore || this.state.loading) {
      return;
    }

    this.scrollObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && this.state.hasMore && !this.state.loading) {
          this.state.page++;
          void this.loadRemote();
        }
      },
      { root: this.renderer.list, threshold: 0 },
    );

    this.scrollObserver.observe(sentinel);
  }

  private disconnectSentinelObserver(): void {
    this.scrollObserver?.disconnect();
    this.scrollObserver = null;
  }

  private async handleCreate(value: string): Promise<void> {
    let newOption: SelectOption;
    if (this.config.onCreate) {
      newOption = await this.config.onCreate(value);
    } else {
      newOption = { value, label: value };
    }

    this.addOption(newOption);
    this.selectByValue(newOption.value);
    this.emitter.emit('create', { option: newOption });

    if (this.renderer.searchInput) {
      this.renderer.searchInput.value = '';
      this.state.resetSearch();
    }
  }

  private onClickOutside(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!this.renderer.container.contains(target) && !this.renderer.dropdown.contains(target)) {
      this.close();
    }
  }

  private static parseDataAttrs(el: HTMLElement): Partial<SelectConfig> {
    const c: Partial<SelectConfig> = {};
    const d = el.dataset;

    if (d.placeholder) {
      c.placeholder = d.placeholder;
    }
    if (d.searchable !== undefined) {
      c.searchable = d.searchable !== 'false';
    }
    if (d.multiple !== undefined) {
      c.multiple = d.multiple !== 'false';
    }
    if (d.clearable !== undefined) {
      c.clearable = d.clearable !== 'false';
    }
    if (d.creatable !== undefined) {
      c.creatable = d.creatable !== 'false';
    }
    if (d.positioning) {
      c.positioning = d.positioning as PositionMode;
    }
    if (d.size) {
      c.size = d.size as SelectConfig['size'];
    }
    if (d.source) {
      c.source = d.source;
    }
    if (d.name) {
      c.name = d.name;
    }
    if (d.maxItems) {
      c.maxItems = parseInt(d.maxItems, 10);
    }
    if (d.maxHeight) {
      c.maxHeight = parseInt(d.maxHeight, 10);
    }
    if (d.cssClass) {
      c.cssClass = d.cssClass;
    }

    if (d.value) {
      try {
        c.value = JSON.parse(d.value) as string | string[];
      } catch {
        c.value = d.value;
      }
    }

    if (el.tagName === 'SELECT') {
      const sel = el as HTMLSelectElement;
      c.name = c.name || sel.getAttribute('name') || '';
      c.multiple = c.multiple || sel.hasAttribute('multiple');
      c.disabled = sel.hasAttribute('disabled');
      c.options = [];

      for (const child of Array.from(sel.children)) {
        if (child.tagName === 'OPTGROUP') {
          const group = child as HTMLOptGroupElement;
          c.options.push({
            label: group.label,
            options: Array.from(group.querySelectorAll('option')).map((o) =>
              FluteSelect.parseNativeOption(o),
            ),
          });
        } else if (child.tagName === 'OPTION') {
          c.options.push(FluteSelect.parseNativeOption(child as HTMLOptionElement));
        }
      }

      const selectedValues = Array.from(sel.selectedOptions)
        .map((o) => o.value)
        .filter(Boolean);
      if (selectedValues.length > 0) {
        c.value = c.multiple ? selectedValues : selectedValues[0];
      }
    }

    return c;
  }

  private static parseNativeOption(opt: HTMLOptionElement): SelectOption {
    return {
      value: opt.value,
      label: opt.textContent?.trim() || opt.value,
      disabled: opt.disabled,
      image: opt.dataset.image,
      icon: opt.dataset.icon,
      description: opt.dataset.description,
      html: opt.dataset.html,
    };
  }
}

Registry.setFactory((el) => FluteSelect.fromElement(el));
