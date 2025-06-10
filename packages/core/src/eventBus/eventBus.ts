import { nanoid } from 'nanoid';
import { AppEvent, EventType, EventData } from '../types/events';
import { logger, logEvent } from '../utils/logger';

type EventSource = 'user' | 'system' | 'api';

// Type-safe event bus implementation
class EventBus {
  private handlers = new Map<EventType | '*', Set<(event: AppEvent) => void>>();
  private debug: boolean = import.meta.env.DEV;

  /**
   * Emit an event to all registered handlers
   * @param type The event type (must be a valid AppEvent type or '*' for global handlers)
   * @param data The event data (must match the expected data for the event type)
   * @param source The source of the event (defaults to 'system')
   */
  emit<T extends EventType>(
    type: T,
    data: EventData<T>,
    source: EventSource = 'system',
    userId?: string
  ): void {
    // Create a well-formed event object
    const event: AppEvent = {
      id: nanoid(),
      type,
      timestamp: Date.now(),
      source,
      userId,
      data,
    } as AppEvent;

    logEvent(`emit_${type}`, data);

    if (this.debug) {
      logger.debug(`📡 EventBus: Emitting ${type}`, event);
    }

    try {
      // Call specific handlers for this event type
      const specificHandlers = this.handlers.get(type);
      if (specificHandlers) {
        specificHandlers.forEach(handler => {
          try {
            handler(event);
          } catch (error) {
            logger.error(`❌ EventBus: Error in event handler for ${type}:`, error);
          }
        });
      }

      // Call global handlers (for all events)
      const globalHandlers = this.handlers.get('*');
      if (globalHandlers) {
        globalHandlers.forEach(handler => {
          try {
            handler(event);
          } catch (error) {
            logger.error(`❌ EventBus: Error in global event handler for ${type}:`, error);
          }
        });
      }
    } catch (error) {
      logger.error(`❌ EventBus: Error processing event ${type}:`, error);
    }
  }

  /**
   * Register an event handler
   * @param type The event type to listen for (or '*' for all events)
   * @param handler The handler function
   * @returns A function to unregister the handler
   */
  on<T extends EventType | '*'>(
    type: T,
    handler: (event: T extends '*' ? AppEvent : Extract<AppEvent, { type: T }>) => void
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    const handlers = this.handlers.get(type)!;
    handlers.add(handler as (event: AppEvent) => void);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as (event: AppEvent) => void);
      if (handlers.size === 0) {
        this.handlers.delete(type);
      }
    };
  }

  /**
   * Unregister an event handler
   * @param type The event type
   * @param handler The handler function to remove
   */
  off<T extends EventType | '*'>(
    type: T,
    handler: (event: T extends '*' ? AppEvent : Extract<AppEvent, { type: T }>) => void
  ): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler as (event: AppEvent) => void);
      if (handlers.size === 0) {
        this.handlers.delete(type);
      }
    }
  }

  /**
   * Register a one-time event handler
   * @param type The event type to listen for
   * @param handler The handler function
   * @returns A function to unregister the handler (which will be called automatically after the first event)
   */
  once<T extends EventType>(
    type: T,
    handler: (event: Extract<AppEvent, { type: T }>) => void
  ): () => void {
    // Create a type-safe wrapper for the handler
    const wrapper = (event: AppEvent) => {
      if (event.type === type) {
        // Remove the handler immediately
        this.off(type, wrapper as unknown as (event: T extends '*' ? AppEvent : Extract<AppEvent, { type: T }>) => void);
        // Call the original handler with properly typed event
        handler(event as Extract<AppEvent, { type: T }>);
      }
    };
    
    // Register the wrapper with type assertion to satisfy TypeScript
    return this.on(type, wrapper as unknown as (event: T extends '*' ? AppEvent : Extract<AppEvent, { type: T }>) => void);
  }
}

export const eventBus = new EventBus();
