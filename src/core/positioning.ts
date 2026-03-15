import {
  computePosition,
  flip as flipMiddleware,
  shift,
  offset,
  size,
  autoUpdate,
  type Middleware,
} from '@floating-ui/dom';

import type { SelectConfig } from '../types';

const CONTENT_MARGIN = 10;

export class Positioning {
  private cleanup: (() => void) | null = null;
  private savedOverflow = '';

  attach(
    trigger: HTMLElement,
    dropdown: HTMLElement,
    config: SelectConfig,
    getSelectedEl: () => HTMLElement | null,
    onReady?: () => void,
  ): void {
    this.detach();

    if (config.positioning === 'aligned') {
      this.lockBodyScroll();
      this.attachAligned(trigger, dropdown, getSelectedEl, onReady);
    } else {
      this.attachDropdown(trigger, dropdown, config);
      onReady?.();
    }
  }

  detach(): void {
    this.cleanup?.();
    this.cleanup = null;
    this.unlockBodyScroll();
  }

  destroy(): void {
    this.detach();
  }

  private lockBodyScroll(): void {
    this.savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    document.body.style.overflow = this.savedOverflow;
    this.savedOverflow = '';
  }

  private attachDropdown(trigger: HTMLElement, dropdown: HTMLElement, config: SelectConfig): void {
    dropdown.style.position = 'absolute';

    const mw: Middleware[] = [offset(6)];
    if (config.flip) {
      mw.push(flipMiddleware({ fallbackStrategy: 'bestFit' }));
    }
    mw.push(shift({ padding: 8 }));
    mw.push(
      size({
        apply: ({ availableHeight }) => {
          dropdown.style.maxHeight = `${Math.min(config.maxHeight, availableHeight - 8)}px`;
        },
        padding: 8,
      }),
    );

    this.cleanup = autoUpdate(trigger, dropdown, () => {
      void computePosition(trigger, dropdown, {
        placement: 'bottom-start',
        middleware: mw,
      }).then(({ x, y, placement }) => {
        const triggerRect = trigger.getBoundingClientRect();
        dropdown.style.left = `${x}px`;
        dropdown.style.top = `${y}px`;
        dropdown.style.width = `${triggerRect.width}px`;
        dropdown.dataset.side = placement?.startsWith('top') ? 'top' : 'bottom';
      });
    });
  }

  /**
   * Radix-style item-aligned positioning.
   *
   * The wrapper uses `margin: CONTENT_MARGIN 0` and `maxHeight: availableHeight`
   * so it is always constrained to the viewport. The height is computed once
   * on open: either the full content height (if it fits) or availableHeight,
   * whichever is smaller. Scroll arrows handle navigation within the list.
   */
  private attachAligned(
    trigger: HTMLElement,
    wrapper: HTMLElement,
    getSelectedEl: () => HTMLElement | null,
    onReady?: () => void,
  ): void {
    const content = wrapper.querySelector<HTMLElement>('.fs__dropdown') ?? wrapper;
    const list = content.querySelector<HTMLElement>('.fs__list');

    if (!list) {
      onReady?.();
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const contentWidth = Math.max(triggerRect.width, 180);

    wrapper.style.height = '';
    wrapper.style.maxHeight = '';
    wrapper.style.minHeight = '';
    wrapper.style.top = '';
    wrapper.style.bottom = '';
    wrapper.style.margin = '';
    list.scrollTop = 0;

    const selectedEl = getSelectedEl();

    const left = clamp(
      triggerRect.left,
      CONTENT_MARGIN,
      Math.max(CONTENT_MARGIN, viewportW - contentWidth - CONTENT_MARGIN),
    );
    wrapper.style.width = `${contentWidth}px`;
    wrapper.style.left = `${left}px`;

    const availableHeight = window.innerHeight - CONTENT_MARGIN * 2;
    const listScrollH = list.scrollHeight;

    const contentStyles = window.getComputedStyle(content);
    const contentBorderTop = parseInt(contentStyles.borderTopWidth, 10) || 0;
    const contentBorderBottom = parseInt(contentStyles.borderBottomWidth, 10) || 0;
    const contentPaddingTop = parseInt(contentStyles.paddingTop, 10) || 0;
    const contentPaddingBottom = parseInt(contentStyles.paddingBottom, 10) || 0;

    const fullContentHeight =
      contentBorderTop + contentPaddingTop + listScrollH + contentPaddingBottom + contentBorderBottom;

    if (!selectedEl) {
      const wrapperH = Math.min(availableHeight, fullContentHeight);
      const wrapperTop = clamp(
        triggerRect.top,
        CONTENT_MARGIN,
        window.innerHeight - wrapperH - CONTENT_MARGIN,
      );
      wrapper.style.top = `${wrapperTop}px`;
      wrapper.style.height = `${wrapperH}px`;
      wrapper.style.maxHeight = `${availableHeight}px`;
    } else {
      const listStyles = window.getComputedStyle(list);
      const listPaddingTop = parseInt(listStyles.paddingTop, 10) || 0;
      const listPaddingBottom = parseInt(listStyles.paddingBottom, 10) || 0;

      const selectedItemHalfH = selectedEl.offsetHeight / 2;
      const itemOffsetMiddle = selectedEl.offsetTop + selectedItemHalfH;

      const contentTopToItemMiddle =
        contentBorderTop + contentPaddingTop + itemOffsetMiddle;
      const itemMiddleToContentBottom = fullContentHeight - contentTopToItemMiddle;

      const triggerMidY = triggerRect.top + triggerRect.height / 2;
      const topEdgeToTriggerMiddle = triggerMidY - CONTENT_MARGIN;
      const triggerMiddleToBottomEdge = availableHeight - topEdgeToTriggerMiddle;

      const minContentHeight = Math.min(
        selectedEl.offsetHeight * 5,
        fullContentHeight,
      );

      const willAlignWithoutTopOverflow = contentTopToItemMiddle <= topEdgeToTriggerMiddle;

      let wrapperH: number;
      let wrapperTop: number;
      let scrollTop = 0;

      if (willAlignWithoutTopOverflow) {
        const listOffsetBottom =
          content.clientHeight - list.offsetTop - list.offsetHeight;
        const clampedTriggerMiddleToBottomEdge = Math.max(
          triggerMiddleToBottomEdge,
          selectedItemHalfH + listPaddingBottom + listOffsetBottom + contentBorderBottom,
        );
        wrapperH = contentTopToItemMiddle + clampedTriggerMiddleToBottomEdge;
        wrapperTop = triggerMidY - contentTopToItemMiddle;
      } else {
        const clampedTopEdgeToTriggerMiddle = Math.max(
          topEdgeToTriggerMiddle,
          contentBorderTop + list.offsetTop + listPaddingTop + selectedItemHalfH,
        );
        wrapperH = clampedTopEdgeToTriggerMiddle + itemMiddleToContentBottom;
        wrapperTop = CONTENT_MARGIN;
        scrollTop = contentTopToItemMiddle - topEdgeToTriggerMiddle + list.offsetTop;
      }

      wrapperH = Math.min(wrapperH, fullContentHeight, availableHeight);
      wrapperH = Math.max(wrapperH, minContentHeight);
      wrapperTop = clamp(wrapperTop, CONTENT_MARGIN, window.innerHeight - wrapperH - CONTENT_MARGIN);

      wrapper.style.top = `${wrapperTop}px`;
      wrapper.style.height = `${wrapperH}px`;
      wrapper.style.minHeight = `${minContentHeight}px`;
      wrapper.style.maxHeight = `${availableHeight}px`;

      if (scrollTop > 0) {
        void list.offsetHeight;
        list.scrollTop = Math.max(0, scrollTop);
      }
    }

    const onResize = (): void => {
      this.attachAligned(trigger, wrapper, getSelectedEl);
    };
    window.addEventListener('resize', onResize);
    const prevCleanup = this.cleanup;
    this.cleanup = () => {
      window.removeEventListener('resize', onResize);
      prevCleanup?.();
    };

    onReady?.();
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
