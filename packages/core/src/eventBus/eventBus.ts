import { nanoid } from 'nanoid';
import { AppEvent } from '~/types/events';
import { logger, logEvent } from '~/utils/logger';

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

    logEvent(`emit_${type}`, event.data);

    if (this.debug) {
      logger.debug(`📡 EventBus: Emitting ${type}`, event);
    }

    const callbacks = this.events.get(type) || [];
    callbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        logger.error(`❌ EventBus: Error in event handler for ${type}:`, error);
      }
    });

    // Global listeners
    const globalCallbacks = this.events.get('*') || [];
    globalCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        logger.error('❌ EventBus: Error in global event handler:', error);
      }
    });
  }

  on(type: string, callback: EventCallback) {
    logger.trace(`📡 EventBus: Registering listener for ${type}`);

    const callbacks = this.events.get(type) || [];
    callbacks.push(callback);
    this.events.set(type, callbacks);

    // Return unsubscribe function
    return () => {
      logger.trace(`📡 EventBus: Unregistering listener for ${type}`);
      const updatedCallbacks = (this.events.get(type) || []).filter(
        (cb) => cb !== callback
      );
      this.events.set(type, updatedCallbacks);
    };
  }

  once(type: string, callback: EventCallback) {
    logger.trace(`📡 EventBus: Registering one-time listener for ${type}`);

    const onceCallback: EventCallback = (event) => {
      this.off(type, onceCallback);
      callback(event);
    };
    this.on(type, onceCallback);
  }

  off(type: string, callback?: EventCallback) {
    if (callback) {
      logger.trace(`📡 EventBus: Removing specific listener for ${type}`);
      const callbacks = this.events.get(type) || [];
      const filtered = callbacks.filter((cb) => cb !== callback);
      this.events.set(type, filtered);
    } else {
      logger.trace(`📡 EventBus: Removing all listeners for ${type}`);
      this.events.delete(type);
    }
  }
}

export const eventBus = new EventBus();
