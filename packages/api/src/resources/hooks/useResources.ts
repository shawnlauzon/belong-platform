import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logger } from "@belongnetwork/core";
import { useSupabase } from "../../auth/providers/CurrentUserProvider";
import { createResourceService } from "../services/resource.service";
import { queryKeys } from "../../shared/queryKeys";
import type {
  Resource,
  ResourceInfo,
  ResourceData,
  ResourceFilter,
} from "@belongnetwork/types";

/**
 * Consolidated hook for all resource operations
 * Provides queries, mutations, and state management for resources
 */
export function useResources(filters?: ResourceFilter) {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const resourceService = createResourceService(supabase);

  // List resources query
  const resourcesQuery = useQuery<ResourceInfo[], Error>({
    queryKey: filters
      ? queryKeys.resources.filtered(filters)
      : queryKeys.resources.all,
    queryFn: () => resourceService.fetchResources(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query factory function
  const getResource = (id: string) => {
    return useQuery<Resource | null, Error>({
      queryKey: queryKeys.resources.byId(id),
      queryFn: () => resourceService.fetchResourceById(id),
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ResourceData) => resourceService.createResource(data),
    onSuccess: (newResource) => {
      // Invalidate the resources list to reflect the new resource
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.resources.byCommunity(
          newResource.community?.id || "",
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.resources.byOwner(newResource.owner.id),
      });

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
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.resources.byCommunity(
          updatedResource.community?.id || "",
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.resources.byOwner(updatedResource.owner.id),
      });

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
    onSuccess: (_, resourceId) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
      queryClient.removeQueries({
        queryKey: queryKeys.resources.byId(resourceId),
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
      filters,
    });
  }

  return {
    // Queries
    resources: resourcesQuery.data,
    isLoading: resourcesQuery.isLoading,
    error: resourcesQuery.error,
    getResource,

    // Mutations
    create: createMutation.mutateAsync,
    update: (id: string, data: Partial<ResourceData>) =>
      updateMutation.mutateAsync({ id, data }),
    delete: deleteMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Raw queries for advanced usage
    resourcesQuery,
  };
}
