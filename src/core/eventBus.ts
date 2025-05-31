import { nanoid } from 'nanoid';
import { AppEvent, BaseEvent } from '@/types/events';

type EventCallback = (event: AppEvent) => void;

class EventBus {
  private events: Map<string, EventCallback[]> = new Map();
  private debug: boolean = import.meta.env.DEV;

  emit<T extends AppEvent>(type: T['type'], data: T['data']) {
    const event: AppEvent = {
      id: nanoid(),
      timestamp: Date.now(),
      source: 'user',
      type,
      data,
    } as T;

    if (this.debug) {
      console.log(`[EventBus] Emitting: ${type}`, event);
    }

    const callbacks = this.events.get(type) || [];
    callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error(`[EventBus] Error in event handler for ${type}:`, error);
      }
    });

    // Global listeners
    const globalCallbacks = this.events.get('*') || [];
    globalCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[EventBus] Error in global event handler:', error);
      }
    });
  }

  on(type: string, callback: EventCallback) {
    const callbacks = this.events.get(type) || [];
    callbacks.push(callback);
    this.events.set(type, callbacks);
    
    // Return unsubscribe function
    return () => {
      const updatedCallbacks = (this.events.get(type) || [])
        .filter(cb => cb !== callback);
      this.events.set(type, updatedCallbacks);
    };
  }

  once(type: string, callback: EventCallback) {
    const onceCallback: EventCallback = (event) => {
      this.off(type, onceCallback);
      callback(event);
    };
    this.on(type, onceCallback);
  }

  off(type: string, callback?: EventCallback) {
    if (callback) {
      const callbacks = this.events.get(type) || [];
      const filtered = callbacks.filter(cb => cb !== callback);
      this.events.set(type, filtered);
    } else {
      this.events.delete(type);
    }
  }
}

export const eventBus = new EventBus();