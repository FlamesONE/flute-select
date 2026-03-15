import type { EventHandler, EventName } from '../types';

export class Emitter {
  private readonly handlers = new Map<string, Set<EventHandler<EventName>>>();

  on<K extends EventName>(event: K, handler: EventHandler<K>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<EventName>);
  }

  off<K extends EventName>(event: K, handler: EventHandler<K>): void {
    this.handlers.get(event)?.delete(handler as EventHandler<EventName>);
  }

  emit<K extends EventName>(event: K, data: import('../types').EventMap[K]): void {
    this.handlers.get(event)?.forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.error(`[FluteSelect] Error in "${event}" handler:`, err);
      }
    });
  }

  removeAll(): void {
    this.handlers.clear();
  }
}
