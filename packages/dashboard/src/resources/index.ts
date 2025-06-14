// Re-export resource CRUD hooks from the API package
export {
  useResources,
  useResource,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
  fetchResources,
  fetchResourceById,
  createResource,
  updateResource,
  deleteResource
} from '@belongnetwork/api';

// Re-export resource types
export type {
  Resource,
  CreateResourceData,
  UpdateResourceData,
  ResourceFilter,
  ResourceCategory,
  MeetupFlexibility
} from '@belongnetwork/types';