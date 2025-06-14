// Re-export community CRUD hooks from the API package
export {
  useCommunities,
  useCommunity,
  useCreateCommunity,
  useUpdateCommunity,
  useDeleteCommunity,
  fetchCommunities,
  fetchCommunityById,
  createCommunity,
  updateCommunity,
  deleteCommunity
} from '@belongnetwork/api';

// Re-export community types
export type {
  Community,
  CreateCommunityData,
  UpdateCommunityData
} from '@belongnetwork/types';