import { eventBus } from '../eventBus/eventBus';
import { AppEvent, Thanks } from '../types';
import { logger } from '../utils';
import {
  isThanksFetchSuccessEvent,
  isThanksFetchFailedEvent,
  isThanksCreatedEvent,
  isThanksCreateFailedEvent,
  isThanksUpdatedEvent,
  isThanksUpdateFailedEvent,
  isThanksDeletedEvent,
  isThanksDeleteFailedEvent,
} from '../types/events';

// Initialize thanks event listeners
export function initializeThanksListeners(
  setThanksLoading: (isLoading: boolean) => void,
  setThanksError: (error: string | null) => void,
  setThanks: (thanks: Thanks[]) => void,
  addThanks: (thanks: Thanks) => void,
  updateThanks: (thanks: Thanks) => void,
  removeThanks: (thanksId: string) => void
) {
  logger.info('🙏 Store: Initializing thanks event listeners');

  // Handle thanks operation requests (set loading state)
  eventBus.on('thanks.fetch.requested', (event: AppEvent) => {
    if (event.type !== 'thanks.fetch.requested') {
      logger.error(
        '🙏 Store: Received invalid thanks.fetch.requested event',
        { event }
      );
      return;
    }

    logger.debug('🙏 Store: Thanks fetch requested, setting loading state');
    setThanksLoading(true);
    setThanksError(null);
  });

  eventBus.on('thanks.create.requested', (event: AppEvent) => {
    if (event.type !== 'thanks.create.requested') {
      logger.error(
        '🙏 Store: Received invalid thanks.create.requested event',
        { event }
      );
      return;
    }

    logger.debug('🙏 Store: Thanks create requested, setting loading state');
    setThanksLoading(true);
    setThanksError(null);
  });

  eventBus.on('thanks.update.requested', (event: AppEvent) => {
    if (event.type !== 'thanks.update.requested') {
      logger.error(
        '🙏 Store: Received invalid thanks.update.requested event',
        { event }
      );
      return;
    }

    logger.debug('🙏 Store: Thanks update requested, setting loading state');
    setThanksLoading(true);
    setThanksError(null);
  });

  eventBus.on('thanks.delete.requested', (event: AppEvent) => {
    if (event.type !== 'thanks.delete.requested') {
      logger.error(
        '🙏 Store: Received invalid thanks.delete.requested event',
        { event }
      );
      return;
    }

    logger.debug('🙏 Store: Thanks delete requested, setting loading state');
    setThanksLoading(true);
    setThanksError(null);
  });

  // Handle successful thanks operations
  eventBus.on('thanks.fetch.success', (event: AppEvent) => {
    if (!isThanksFetchSuccessEvent(event)) {
      logger.error('🙏 Store: Received invalid thanks.fetch.success event', {
        event,
      });
      return;
    }

    logger.debug('🙏 Store: Handling successful thanks fetch', {
      count: event.data.thanks.length,
    });
    setThanks(event.data.thanks);
    setThanksLoading(false);
    setThanksError(null);
  });

  eventBus.on('thanks.created', (event: AppEvent) => {
    if (!isThanksCreatedEvent(event)) {
      logger.error('🙏 Store: Received invalid thanks.created event', {
        event,
      });
      return;
    }

    logger.debug('🙏 Store: Handling successful thanks creation', {
      thanksId: event.data.id,
      message: event.data.message,
    });
    addThanks(event.data);
    setThanksLoading(false);
    setThanksError(null);
  });

  eventBus.on('thanks.updated', (event: AppEvent) => {
    if (!isThanksUpdatedEvent(event)) {
      logger.error('🙏 Store: Received invalid thanks.updated event', {
        event,
      });
      return;
    }

    logger.debug('🙏 Store: Handling successful thanks update', {
      thanksId: event.data.id,
      message: event.data.message,
    });
    updateThanks(event.data);
    setThanksLoading(false);
    setThanksError(null);
  });

  eventBus.on('thanks.deleted', (event: AppEvent) => {
    if (!isThanksDeletedEvent(event)) {
      logger.error('🙏 Store: Received invalid thanks.deleted event', {
        event,
      });
      return;
    }

    logger.debug('🙏 Store: Handling successful thanks deletion', {
      thanksId: event.data.thanksId,
    });
    removeThanks(event.data.thanksId);
    setThanksLoading(false);
    setThanksError(null);
  });

  // Handle failed thanks operations
  eventBus.on('thanks.fetch.failed', (event: AppEvent) => {
    if (!isThanksFetchFailedEvent(event)) {
      logger.error('🙏 Store: Received invalid thanks.fetch.failed event', {
        event,
      });
      return;
    }

    logger.debug('🙏 Store: Handling failed thanks fetch', {
      error: event.data.error,
    });
    setThanksLoading(false);
    setThanksError(event.data.error);
  });

  eventBus.on('thanks.create.failed', (event: AppEvent) => {
    if (!isThanksCreateFailedEvent(event)) {
      logger.error('🙏 Store: Received invalid thanks.create.failed event', {
        event,
      });
      return;
    }

    logger.debug('🙏 Store: Handling failed thanks creation', {
      error: event.data.error,
    });
    setThanksLoading(false);
    setThanksError(event.data.error);
  });

  eventBus.on('thanks.update.failed', (event: AppEvent) => {
    if (!isThanksUpdateFailedEvent(event)) {
      logger.error('🙏 Store: Received invalid thanks.update.failed event', {
        event,
      });
      return;
    }

    logger.debug('🙏 Store: Handling failed thanks update', {
      error: event.data.error,
    });
    setThanksLoading(false);
    setThanksError(event.data.error);
  });

  eventBus.on('thanks.delete.failed', (event: AppEvent) => {
    if (!isThanksDeleteFailedEvent(event)) {
      logger.error('🙏 Store: Received invalid thanks.delete.failed event', {
        event,
      });
      return;
    }

    logger.debug('🙏 Store: Handling failed thanks deletion', {
      thanksId: event.data.thanksId,
      error: event.data.error,
    });
    setThanksLoading(false);
    setThanksError(event.data.error);
  });

  logger.info('✅ Store: Thanks event listeners initialized');
}