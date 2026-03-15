export { FluteSelect } from './core/core';
export type {
  SelectConfig,
  SelectOption,
  SelectItem,
  SelectGroup,
  SelectSeparator,
  PositionMode,
  SelectSize,
  LazyConfig,
  EventName,
  EventHandler,
  EventMap,
  LoadResult,
  OptionRenderState,
} from './types';

// Attach to window for IIFE builds
import { FluteSelect } from './core/core';

declare global {
  interface Window {
    FluteSelect: typeof FluteSelect;
  }
}

if (typeof window !== 'undefined') {
  window.FluteSelect = FluteSelect;
}
