import { eventBus } from 'src/eventBus/eventBus';
import { AppEvent, Resource } from 'src/types';
import { logger } from 'src/utils';
import {
  isResourceFetchSuccessEvent,
  isResourceFetchFailedEvent,
  isResourceCreatedEvent,
  isResourceCreateFailedEvent,
  isResourceUpdatedEvent,
  isResourceUpdateFailedEvent,
  isResourceDeletedEvent,
  isResourceDeleteFailedEvent,
} from 'src/types/events';

// Initialize resource event listeners
export function initializeResourceListeners(
  setResourcesLoading: (isLoading: boolean) => void,
  setResourcesError: (error: string | null) => void,
  setResources: (resources: Resource[]) => void,
  addResource: (resource: Resource) => void,
  updateResourceInList: (resource: Resource) => void,
  removeResource: (resourceId: string) => void
) {
  logger.info('📦 Store: Initializing resource event listeners');

  // Handle resource operation requests (set loading state)
  eventBus.on('resource.fetch.requested', (event: AppEvent) => {
    if (event.type !== 'resource.fetch.requested') {
      logger.error(
        '📦 Store: Received invalid resource.fetch.requested event',
        { event }
      );
      return;
    }

    logger.debug('📦 Store: Resource fetch requested, setting loading state');
    setResourcesLoading(true);
    setResourcesError(null);
  });

  eventBus.on('resource.create.requested', (event: AppEvent) => {
    if (event.type !== 'resource.create.requested') {
      logger.error(
        '📦 Store: Received invalid resource.create.requested event',
        { event }
      );
      return;
    }

    logger.debug('📦 Store: Resource create requested, setting loading state');
    setResourcesLoading(true);
    setResourcesError(null);
  });

  eventBus.on('resource.update.requested', (event: AppEvent) => {
    if (event.type !== 'resource.update.requested') {
      logger.error(
        '📦 Store: Received invalid resource.update.requested event',
        { event }
      );
      return;
    }

    logger.debug('📦 Store: Resource update requested, setting loading state');
    setResourcesLoading(true);
    setResourcesError(null);
  });

  eventBus.on('resource.delete.requested', (event: AppEvent) => {
    if (event.type !== 'resource.delete.requested') {
      logger.error(
        '📦 Store: Received invalid resource.delete.requested event',
        { event }
      );
      return;
    }

    logger.debug('📦 Store: Resource delete requested, setting loading state');
    setResourcesLoading(true);
    setResourcesError(null);
  });

  // Handle successful resource operations
  eventBus.on('resource.fetch.success', (event: AppEvent) => {
    if (!isResourceFetchSuccessEvent(event)) {
      logger.error('📦 Store: Received invalid resource.fetch.success event', {
        event,
      });
      return;
    }

    logger.debug(
      '📦 Store: Received resource.fetch.success event, data:',
      event.data.resources
    );
    logger.debug('📦 Store: Handling successful resource fetch', {
      count: event.data.resources.length,
    });
    setResources(event.data.resources);
    setResourcesLoading(false);
    setResourcesError(null);
  });

  eventBus.on('resource.created', (event: AppEvent) => {
    if (!isResourceCreatedEvent(event)) {
      logger.error('📦 Store: Received invalid resource.created event', {
        event,
      });
      return;
    }

    logger.debug('📦 Store: Handling successful resource creation', {
      resourceId: event.data.id,
      title: event.data.title,
    });
    addResource(event.data);
    setResourcesLoading(false);
    setResourcesError(null);
  });

  eventBus.on('resource.updated', (event: AppEvent) => {
    if (!isResourceUpdatedEvent(event)) {
      logger.error('📦 Store: Received invalid resource.updated event', {
        event,
      });
      return;
    }

    logger.debug('📦 Store: Handling successful resource update', {
      resourceId: event.data.id,
      title: event.data.title,
    });
    updateResourceInList(event.data);
    setResourcesLoading(false);
    setResourcesError(null);
  });

  eventBus.on('resource.deleted', (event: AppEvent) => {
    if (!isResourceDeletedEvent(event)) {
      logger.error('📦 Store: Received invalid resource.deleted event', {
        event,
      });
      return;
    }

    logger.debug('📦 Store: Handling successful resource deletion', {
      resourceId: event.data.resourceId,
    });
    removeResource(event.data.resourceId);
    setResourcesLoading(false);
    setResourcesError(null);
  });

  // Handle failed resource operations
  eventBus.on('resource.fetch.failed', (event: AppEvent) => {
    if (!isResourceFetchFailedEvent(event)) {
      logger.error('📦 Store: Received invalid resource.fetch.failed event', {
        event,
      });
      return;
    }

    logger.debug('📦 Store: Handling failed resource fetch', {
      error: event.data.error,
    });
    setResourcesLoading(false);
    setResourcesError(event.data.error);
  });

  eventBus.on('resource.create.failed', (event: AppEvent) => {
    if (!isResourceCreateFailedEvent(event)) {
      logger.error('📦 Store: Received invalid resource.create.failed event', {
        event,
      });
      return;
    }

    logger.debug('📦 Store: Handling failed resource creation', {
      error: event.data.error,
    });
    setResourcesLoading(false);
    setResourcesError(event.data.error);
  });

  eventBus.on('resource.update.failed', (event: AppEvent) => {
    if (!isResourceUpdateFailedEvent(event)) {
      logger.error('📦 Store: Received invalid resource.update.failed event', {
        event,
      });
      return;
    }

    logger.debug('📦 Store: Handling failed resource update', {
      error: event.data.error,
    });
    setResourcesLoading(false);
    setResourcesError(event.data.error);
  });

  eventBus.on('resource.delete.failed', (event: AppEvent) => {
    if (!isResourceDeleteFailedEvent(event)) {
      logger.error('📦 Store: Received invalid resource.delete.failed event', {
        event,
      });
      return;
    }

    logger.debug('📦 Store: Handling failed resource deletion', {
      resourceId: event.data.resourceId,
      error: event.data.error,
    });
    setResourcesLoading(false);
    setResourcesError(event.data.error);
  });

  logger.info('✅ Store: Resource event listeners initialized');
}
