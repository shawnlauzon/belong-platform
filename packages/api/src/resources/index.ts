// Hooks
export { useResources, useResource } from './hooks/useResources';
export { useCreateResource } from './hooks/useCreateResource';
export { useUpdateResource } from './hooks/useUpdateResource';
export { useDeleteResource } from './hooks/useDeleteResource';

// Implementation functions
export { fetchResources, fetchResourceById } from './impl/fetchResources';
export { createResource } from './impl/createResource';
export { updateResource } from './impl/updateResource';
export { deleteResource } from './impl/deleteResource';
// Types and constants
export type { Resource, CreateResourceData, UpdateResourceData, ResourceFilter } from '@belongnetwork/types';
export { RESOURCE_CATEGORIES } from '@belongnetwork/types';
// Export error messages
export { RESOURCE_ERROR_MESSAGES } from './impl/resourceTransformer';
