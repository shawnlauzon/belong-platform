import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logger } from "@belongnetwork/core";
import { useSupabase } from "../../auth/providers/CurrentUserProvider";
import { createResourceService } from "../services/resource.service";
import { queryKeys, STANDARD_CACHE_TIME } from "../../shared";
import type {
  Resource,
  ResourceInfo,
  ResourceData,
  ResourceFilter,
} from "@belongnetwork/types";

/**
 * Comprehensive hook for resource operations including fetching, creating, updating, and filtering.
 * 
 * This hook provides all resource-related functionality for managing community resources
 * such as offers and requests. Supports filtering by category, community, and location.
 * Must be used within a BelongProvider context.
 * 
 * @returns Resource queries, mutations, and utility functions
 * 
 * @example
 * ```tsx
 * function ResourceList() {
 *   const { 
 *     fetchResources, 
 *     createResource, 
 *     updateResource,
 *     resourcesQuery 
 *   } = useResources();
 * 
 *   // Load resources manually
 *   const handleLoad = () => {
 *     fetchResources();
 *   };
 * 
 *   // Create a new resource
 *   const handleCreate = async () => {
 *     try {
 *       const resource = await createResource.mutateAsync({
 *         type: 'offer',
 *         category: 'household',
 *         title: 'Free Moving Boxes',
 *         description: 'Clean boxes from recent move',
 *         communityId: 'community-123',
 *         isActive: true
 *       });
 *       console.log('Created resource:', resource.title);
 *     } catch (error) {
 *       console.error('Failed to create resource:', error);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleLoad}>Load Resources</button>
 *       <button onClick={handleCreate}>Add Resource</button>
 *       {resourcesQuery.data?.map(resource => (
 *         <div key={resource.id}>{resource.title}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @category React Hooks
 */
export function useResources() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const resourceService = createResourceService(supabase);

  // List resources query - disabled by default to prevent automatic fetching
  const resourcesQuery = useQuery<ResourceInfo[], Error>({
    queryKey: queryKeys.resources.all,
    queryFn: () => resourceService.fetchResources(),
    staleTime: STANDARD_CACHE_TIME,
    enabled: false, // Prevent automatic fetching
  });

  // Note: Individual query hooks should be called separately by consumers
  // These factory functions violated Rules of Hooks and have been removed

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ResourceData) => resourceService.createResource(data),
    onSuccess: (newResource) => {
      // Invalidate all resources queries
      queryClient.invalidateQueries({ queryKey: ["resources"] });

      // Update the cache for this specific resource
      queryClient.setQueryData(
        queryKeys.resources.byId(newResource.id),
        newResource,
      );

      logger.info(
        "📚 API: Successfully created resource via consolidated hook",
        {
          id: newResource.id,
          title: newResource.title,
        },
      );
    },
    onError: (error) => {
      logger.error("📚 API: Failed to create resource via consolidated hook", {
        error,
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ResourceData> }) =>
      resourceService.updateResource(id, data),
    onSuccess: (updatedResource) => {
      // Invalidate all resources queries
      queryClient.invalidateQueries({ queryKey: ["resources"] });

      // Update the cache for this specific resource
      queryClient.setQueryData(
        queryKeys.resources.byId(updatedResource.id),
        updatedResource,
      );

      logger.info(
        "📚 API: Successfully updated resource via consolidated hook",
        {
          id: updatedResource.id,
          title: updatedResource.title,
        },
      );
    },
    onError: (error) => {
      logger.error("📚 API: Failed to update resource via consolidated hook", {
        error,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => resourceService.deleteResource(id),
    onSuccess: async (_, resourceId) => {
      // CRITICAL FIX: Remove ALL resources-related cache data synchronously first
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === "resources" || key[0] === "resource";
        },
      });

      // Then invalidate to trigger fresh fetches
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === "resources" || key[0] === "resource";
        },
      });

      logger.info(
        "📚 API: Successfully deleted resource via consolidated hook",
        {
          id: resourceId,
        },
      );
    },
    onError: (error) => {
      logger.error("📚 API: Failed to delete resource via consolidated hook", {
        error,
      });
    },
  });

  // Handle list query errors
  if (resourcesQuery.error) {
    logger.error("📚 API: Error fetching resources via consolidated hook", {
      error: resourcesQuery.error,
    });
  }

  return {
    // Unified React Query status properties (query + mutations)
    isPending: resourcesQuery.isFetching || 
               (createMutation && createMutation.isPending) || 
               (updateMutation && updateMutation.isPending) || 
               (deleteMutation && deleteMutation.isPending) || 
               false,
    isError: resourcesQuery.isError || (createMutation?.isError || false) || (updateMutation?.isError || false) || (deleteMutation?.isError || false),
    isSuccess: resourcesQuery.isSuccess || (createMutation?.isSuccess || false) || (updateMutation?.isSuccess || false) || (deleteMutation?.isSuccess || false),
    isFetching: resourcesQuery.isFetching, // Only for query operations
    error: resourcesQuery.error || createMutation?.error || updateMutation?.error || deleteMutation?.error,

    // List fetch operation
    list: async (filters?: ResourceFilter) => {
      const result = await queryClient.fetchQuery({
        queryKey: filters
          ? queryKeys.resources.filtered(filters)
          : queryKeys.resources.all,
        queryFn: () => resourceService.fetchResources(filters),
        staleTime: STANDARD_CACHE_TIME,
      });
      return result;
    },

    // Individual item fetch operation
    byId: async (id: string) => {
      const result = await queryClient.fetchQuery({
        queryKey: queryKeys.resources.byId(id),
        queryFn: () => resourceService.fetchResourceById(id),
        staleTime: STANDARD_CACHE_TIME,
      });
      return result;
    },

    // Mutations (with defensive null checks for testing environments)
    create: createMutation?.mutateAsync || (() => Promise.reject(new Error('Create mutation not ready'))),
    update: (id: string, data: Partial<ResourceData>) =>
      updateMutation?.mutateAsync ? updateMutation.mutateAsync({ id, data }) : Promise.reject(new Error('Update mutation not ready')),
    delete: deleteMutation?.mutateAsync || (() => Promise.reject(new Error('Delete mutation not ready'))),

    // Individual mutation objects for specific access when needed
    createMutation,
    updateMutation,
    deleteMutation,

    // Raw queries for advanced usage
    resourcesQuery,
  };
}

