import { CSS, ICONS } from '../constants';
import { el } from '../utils/dom';
import type { SelectConfig, SelectOption } from '../types';
import type { SelectState } from './state';

export interface RendererElements {
  container: HTMLElement;
  trigger: HTMLElement;
  triggerLabel: HTMLElement;
  dropdown: HTMLElement;
  list: HTMLElement;
  searchInput: HTMLInputElement | null;
}

export class Renderer {
  private readonly config: SelectConfig;
  private readonly state: SelectState;

  container!: HTMLElement;
  trigger!: HTMLElement;
  triggerLabel!: HTMLElement;
  dropdown!: HTMLElement;
  content!: HTMLElement;
  list!: HTMLElement;
  searchInput: HTMLInputElement | null = null;

  private scrollArrowUp: HTMLElement | null = null;
  private scrollArrowDown: HTMLElement | null = null;
  private scrollInterval: ReturnType<typeof setInterval> | null = null;
  private boundScrollUpdate: (() => void) | null = null;

  constructor(config: SelectConfig, state: SelectState) {
    this.config = config;
    this.state = state;
  }

  buildContainer(id: string): RendererElements {
    const isAligned = this.config.positioning === 'aligned';

    const classes = [
      CSS.container,
      this.config.cssClass,
      this.state.disabled ? CSS.disabled : '',
      isAligned ? 'fs--aligned' : '',
      this.config.size !== 'md' ? `fs--${this.config.size}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    this.container = el('div', { class: classes, id });

    this.trigger = el('button', {
      class: CSS.trigger,
      type: 'button',
      role: 'combobox',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-controls': `${id}-dropdown`,
      'aria-label': this.config.placeholder || 'Select',
      tabindex: '0',
    });

    this.triggerLabel = el('span', { class: CSS.triggerLabel });
    const arrow = el('span', { class: CSS.triggerArrow });
    arrow.innerHTML = ICONS.arrow;

    if (this.config.clearable) {
      const clearBtn = el('span', {
        class: CSS.triggerClear,
        role: 'button',
        'aria-label': 'Clear',
      });
      clearBtn.innerHTML = ICONS.clear;
      this.trigger.append(this.triggerLabel, clearBtn, arrow);
    } else {
      this.trigger.append(this.triggerLabel, arrow);
    }

    this.container.appendChild(this.trigger);

    this.content = el('div', {
      class: CSS.dropdown,
      id: `${id}-dropdown`,
      role: 'listbox',
      'aria-multiselectable': this.config.multiple ? 'true' : undefined,
    });

    if (isAligned) {
      this.dropdown = el('div', { class: 'fs__wrapper' });
      this.content.classList.add('fs__dropdown--aligned');
      this.dropdown.appendChild(this.content);
    } else {
      this.dropdown = this.content;
      this.content.style.maxHeight = `${this.config.maxHeight}px`;
      this.content.style.zIndex = String(this.config.zIndex);
    }

    // Copy cssClass to dropdown so theme classes (fs--light) work when portaled to body
    if (this.config.cssClass) {
      for (const cls of this.config.cssClass.split(/\s+/).filter(Boolean)) {
        this.dropdown.classList.add(cls);
      }
    }

    if (this.config.searchable) {
      const searchWrap = el('div', { class: CSS.search });
      this.searchInput = el('input', {
        class: CSS.searchInput,
        type: 'text',
        placeholder: this.config.searchPlaceholder,
        autocomplete: 'off',
        'aria-label': 'Search options',
      });
      searchWrap.appendChild(this.searchInput);
      this.content.appendChild(searchWrap);
    }

    this.list = el('div', { class: CSS.list });
    this.content.appendChild(this.list);

    return {
      container: this.container,
      trigger: this.trigger,
      triggerLabel: this.triggerLabel,
      dropdown: this.dropdown,
      list: this.list,
      searchInput: this.searchInput,
    };
  }

  renderOptions(): void {
    const { filteredOptions: opts } = this.state;
    this.list.innerHTML = '';

    if (this.state.loading && opts.length === 0) {
      this.list.appendChild(this.statusEl(this.config.loadingText, CSS.statusLoading));
      return;
    }

    if (opts.length === 0 && !this.state.loading) {
      this.renderEmptyState();
      return;
    }

    this.renderItemList();

    if (this.state.loading) {
      this.list.appendChild(this.statusEl(this.config.loadingText, CSS.statusLoading));
    }

    if (this.state.hasMore && !this.state.loading) {
      this.list.appendChild(el('div', { class: CSS.sentinel }));
    }
  }

  updateTriggerDisplay(): void {
    const { selected } = this.state;

    if (selected.size === 0) {
      this.triggerLabel.textContent = this.config.placeholder;
      this.triggerLabel.className = `${CSS.triggerLabel} ${CSS.triggerLabelEmpty}`;
      this.container.classList.remove(CSS.hasValue);
      return;
    }

    this.triggerLabel.className = CSS.triggerLabel;
    this.container.classList.add(CSS.hasValue);

    if (this.config.multiple) {
      this.renderTags();
    } else {
      this.renderSingleLabel();
    }
  }

  updateHighlight(): void {
    this.list.querySelectorAll(`.${CSS.optionHighlighted}`).forEach((node) => {
      node.classList.remove(CSS.optionHighlighted);
    });

    const target = this.list.querySelector(`[data-index="${this.state.highlighted}"]`);
    target?.classList.add(CSS.optionHighlighted);

    if (target?.id) {
      this.trigger.setAttribute('aria-activedescendant', target.id);
    } else {
      this.trigger.removeAttribute('aria-activedescendant');
    }
  }

  scrollToHighlighted(): void {
    const node = this.list.querySelector(`.${CSS.optionHighlighted}`);
    node?.scrollIntoView({ block: 'nearest' });
  }

  scrollToSelected(): void {
    const node = this.list.querySelector(`.${CSS.optionSelected}`);
    node?.scrollIntoView({ block: 'nearest' });
  }

  getSelectedOptionEl(): HTMLElement | null {
    return this.list.querySelector(`.${CSS.optionSelected}`);
  }

  getSentinel(): HTMLElement | null {
    return this.list.querySelector(`.${CSS.sentinel}`);
  }

  setOpen(isOpen: boolean): void {
    if (isOpen) {
      this.content.classList.add(CSS.dropdownOpen);
      this.container.classList.add(CSS.open);
      this.trigger.setAttribute('aria-expanded', 'true');
    } else {
      this.content.classList.remove(CSS.dropdownOpen);
      this.container.classList.remove(CSS.open);
      this.trigger.setAttribute('aria-expanded', 'false');
    }
  }

  showWrapper(): void {
    this.dropdown.style.display = 'flex';
  }

  hideWrapper(): void {
    if (this.dropdown !== this.content) {
      this.dropdown.style.display = 'none';
    }
  }

  setDisabled(disabled: boolean): void {
    if (disabled) {
      this.container.classList.add(CSS.disabled);
      this.trigger.setAttribute('aria-disabled', 'true');
    } else {
      this.container.classList.remove(CSS.disabled);
      this.trigger.removeAttribute('aria-disabled');
    }
  }

  setupScrollArrows(): void {
    this.teardownScrollArrows();

    if (this.config.positioning !== 'aligned') {
      return;
    }

    requestAnimationFrame(() => {
      const { scrollHeight, clientHeight } = this.list;
      if (scrollHeight <= clientHeight + 2) {
        return;
      }

      this.scrollArrowUp = el('div', {
        class: 'fs__scroll-btn fs__scroll-btn--up',
        'aria-hidden': 'true',
      });
      this.scrollArrowUp.innerHTML = ICONS.arrow;

      this.scrollArrowDown = el('div', {
        class: 'fs__scroll-btn fs__scroll-btn--down',
        'aria-hidden': 'true',
      });
      this.scrollArrowDown.innerHTML = ICONS.arrow;

      this.content.appendChild(this.scrollArrowUp);
      this.content.appendChild(this.scrollArrowDown);

      this.boundScrollUpdate = (): void => this.updateScrollArrows();
      this.list.addEventListener('scroll', this.boundScrollUpdate, { passive: true });

      const SCROLL_SPEED = 4;
      const startScroll = (dir: number): void => {
        this.stopScrollInterval();
        const tick = (): void => {
          this.list.scrollTop += dir * SCROLL_SPEED;
          this.updateScrollArrows();
          this.scrollInterval = requestAnimationFrame(tick) as unknown as ReturnType<
            typeof setInterval
          >;
        };
        tick();
      };

      const block = (e: Event): void => {
        e.preventDefault();
        e.stopPropagation();
      };

      for (const arrow of [this.scrollArrowUp, this.scrollArrowDown]) {
        arrow.addEventListener('mousedown', block);
        arrow.addEventListener('pointerdown', block);
      }

      this.scrollArrowUp.addEventListener('pointerenter', () => startScroll(-1));
      this.scrollArrowUp.addEventListener('pointerleave', () => this.stopScrollInterval());
      this.scrollArrowDown.addEventListener('pointerenter', () => startScroll(1));
      this.scrollArrowDown.addEventListener('pointerleave', () => this.stopScrollInterval());

      this.updateScrollArrows();
    });
  }

  teardownScrollArrows(): void {
    this.stopScrollInterval();
    if (this.boundScrollUpdate) {
      this.list.removeEventListener('scroll', this.boundScrollUpdate);
      this.boundScrollUpdate = null;
    }
    this.scrollArrowUp?.remove();
    this.scrollArrowDown?.remove();
    this.scrollArrowUp = null;
    this.scrollArrowDown = null;
  }

  updateScrollArrows(): void {
    if (!this.scrollArrowUp || !this.scrollArrowDown) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = this.list;
    const canUp = scrollTop > 1;
    const canDown = scrollHeight - clientHeight - scrollTop > 1;

    this.scrollArrowUp.style.display = canUp ? 'flex' : 'none';
    this.scrollArrowDown.style.display = canDown ? 'flex' : 'none';
  }

  private stopScrollInterval(): void {
    if (this.scrollInterval !== null) {
      cancelAnimationFrame(this.scrollInterval as unknown as number);
      this.scrollInterval = null;
    }
  }

  destroy(): void {
    this.teardownScrollArrows();
    this.container.remove();
    this.dropdown.remove();
  }

  private renderItemList(): void {
    const opts = this.state.filteredOptions;

    if (this.state.groups.size > 0 && !this.state.searchQuery) {
      this.renderGrouped(opts);
    } else {
      for (let i = 0; i < opts.length; i++) {
        if (this.state.separatorIndices.has(i) && !this.state.searchQuery) {
          this.list.appendChild(el('div', { class: CSS.separator, role: 'separator' }));
        }
        this.list.appendChild(this.optionEl(opts[i]!));
      }
    }

    if (this.config.creatable && this.state.searchQuery) {
      const exists = opts.some(
        (o) =>
          o.label.toLowerCase() === this.state.searchQuery.toLowerCase() ||
          o.value === this.state.searchQuery,
      );
      if (!exists) {
        this.list.appendChild(this.createOptionEl(this.state.searchQuery));
      }
    }
  }

  private renderGrouped(opts: SelectOption[]): void {
    const groupedValues = new Set<string>();

    for (const [label, groupOpts] of this.state.groups) {
      const visible = groupOpts.filter((o) => opts.includes(o));
      if (visible.length === 0) {
        continue;
      }

      const groupEl = el('div', { class: CSS.group, role: 'group', 'aria-label': label });
      const labelEl = el('div', { class: CSS.groupLabel });
      labelEl.textContent = label;
      groupEl.appendChild(labelEl);

      for (const opt of visible) {
        groupEl.appendChild(this.optionEl(opt));
        groupedValues.add(opt.value);
      }

      this.list.appendChild(groupEl);
    }

    for (const opt of opts) {
      if (!groupedValues.has(opt.value)) {
        this.list.appendChild(this.optionEl(opt));
      }
    }
  }

  private renderEmptyState(): void {
    if (this.config.renderEmpty) {
      this.list.innerHTML = this.config.renderEmpty(this.state.searchQuery);
      return;
    }

    if (this.config.creatable && this.state.searchQuery) {
      this.list.appendChild(this.createOptionEl(this.state.searchQuery));
      return;
    }

    this.list.appendChild(this.statusEl(this.config.emptyText, CSS.statusEmpty));
  }

  private optionEl(option: SelectOption): HTMLElement {
    const isSelected = this.state.selected.has(option.value);
    const idx = this.state.filteredOptions.indexOf(option);
    const isHighlighted = idx === this.state.highlighted;

    const classes = [
      CSS.option,
      isSelected ? CSS.optionSelected : '',
      isHighlighted ? CSS.optionHighlighted : '',
      option.disabled ? CSS.optionDisabled : '',
    ]
      .filter(Boolean)
      .join(' ');

    const optId = `${this.container.id}-opt-${idx}`;
    const node = el('div', {
      class: classes,
      id: optId,
      role: 'option',
      'aria-selected': isSelected ? 'true' : 'false',
      'aria-disabled': option.disabled ? 'true' : undefined,
      'data-value': option.value,
      'data-index': String(idx),
    });

    if (this.config.renderOption) {
      node.innerHTML = this.config.renderOption(option, {
        selected: isSelected,
        highlighted: isHighlighted,
      });
      return node;
    }

    if (option.html) {
      node.innerHTML = option.html;
      return node;
    }

    const content = el('div', { class: CSS.optionContent });

    if (option.image) {
      content.appendChild(el('img', { class: CSS.optionImage, src: option.image, alt: '' }));
    }

    if (option.icon) {
      const iconEl = el('span', { class: CSS.optionIcon });
      iconEl.innerHTML = option.icon;
      content.appendChild(iconEl);
    }

    const textWrap = el('div', { class: CSS.optionText });
    const label = el('span', { class: CSS.optionLabel });
    label.textContent = option.label;
    textWrap.appendChild(label);

    if (option.description) {
      const desc = el('span', { class: CSS.optionDesc });
      desc.textContent = option.description;
      textWrap.appendChild(desc);
    }

    content.appendChild(textWrap);
    node.appendChild(content);

    if (isSelected) {
      const check = el('span', { class: CSS.optionCheck });
      check.innerHTML = ICONS.check;
      node.appendChild(check);
    }

    return node;
  }

  private createOptionEl(value: string): HTMLElement {
    const node = el('div', {
      class: `${CSS.option} ${CSS.optionCreate}`,
      'data-create': value,
    });
    node.textContent = this.config.createLabel.replace('{value}', value);
    return node;
  }

  private statusEl(text: string, cssClass: string): HTMLElement {
    const node = el('div', { class: `${CSS.status} ${cssClass}` });
    node.textContent = text;
    return node;
  }

  private renderTags(): void {
    this.triggerLabel.innerHTML = '';
    const selected = this.state.getSelectedOptions();

    for (const opt of selected) {
      const tag = el('span', { class: CSS.tag });

      if (this.config.renderTag) {
        tag.innerHTML = this.config.renderTag(opt);
      } else {
        const label = el('span', { class: CSS.tagLabel });
        label.textContent = opt.label;

        const remove = el('span', { class: CSS.tagRemove, role: 'button' });
        remove.innerHTML = ICONS.removeTag;
        remove.dataset.value = opt.value;

        tag.append(label, remove);
      }

      this.triggerLabel.appendChild(tag);
    }
  }

  private renderSingleLabel(): void {
    const opt = this.state.allOptions.find((o) => this.state.selected.has(o.value));
    if (!opt) {
      return;
    }

    if (this.config.renderSelected) {
      this.triggerLabel.innerHTML = this.config.renderSelected(opt);
    } else {
      this.triggerLabel.textContent = opt.label;
    }
  }
}
