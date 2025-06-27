import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logger } from "@belongnetwork/core";
import { useSupabase } from "../../auth/providers/CurrentUserProvider";
import { createCommunityService } from "../services/community.service";
import { queryKeys } from "../../shared/queryKeys";
import type {
  Community,
  CommunityInfo,
  CommunityData,
  CommunityMembership,
} from "@belongnetwork/types";

type JoinCommunityInput = {
  communityId: string;
  role?: "member" | "admin" | "organizer";
};

/**
 * Consolidated hook for all community operations
 * Provides queries, mutations, and state management for communities
 */
export function useCommunities() {
  const queryClient = useQueryClient();
  if (!queryClient) {
    throw new Error("QueryClient not available. Make sure your component is wrapped with QueryClientProvider.");
  }
  const supabase = useSupabase();
  const communityService = createCommunityService(supabase);

  // List communities query - disabled by default to prevent automatic fetching
  const communitiesQuery = useQuery<CommunityInfo[], Error>({
    queryKey: queryKeys.communities.all,
    queryFn: () => communityService.fetchCommunities(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: false, // Prevent automatic fetching
  });

  // Note: Individual query hooks should be called separately by consumers
  // These factory functions violated Rules of Hooks and have been removed

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CommunityData) => communityService.createCommunity(data),
    onSuccess: (newCommunity) => {
      // Invalidate all communities queries
      queryClient.invalidateQueries({ queryKey: ["communities"] });

      logger.info(
        "🏘️ API: Successfully created community via consolidated hook",
        {
          id: newCommunity.id,
          name: newCommunity.name,
        },
      );
    },
    onError: (error) => {
      logger.error("🏘️ API: Failed to create community via consolidated hook", {
        error,
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CommunityData> }) =>
      communityService.updateCommunity({ id, ...data }),
    onSuccess: (updatedCommunity) => {
      // Invalidate all communities queries
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.byId(updatedCommunity.id),
      });

      logger.info(
        "🏘️ API: Successfully updated community via consolidated hook",
        {
          id: updatedCommunity.id,
          name: updatedCommunity.name,
        },
      );
    },
    onError: (error) => {
      logger.error("🏘️ API: Failed to update community via consolidated hook", {
        error,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => communityService.deleteCommunity(id),
    onSuccess: (_, communityId) => {
      // Invalidate all communities queries
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.removeQueries({
        queryKey: queryKeys.communities.byId(communityId),
      });

      logger.info(
        "🏘️ API: Successfully deleted community via consolidated hook",
        {
          id: communityId,
        },
      );
    },
    onError: (error) => {
      logger.error("🏘️ API: Failed to delete community via consolidated hook", {
        error,
      });
    },
  });

  // Join mutation
  const joinMutation = useMutation({
    mutationFn: ({ communityId, role = "member" }: JoinCommunityInput) =>
      communityService.joinCommunity(communityId, role),
    onSuccess: (newMembership) => {
      // Invalidate all communities queries
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.byId(newMembership.communityId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.memberships(newMembership.communityId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.userMemberships(newMembership.userId),
      });

      logger.info(
        "🏘️ API: Successfully joined community via consolidated hook",
        {
          communityId: newMembership.communityId,
          userId: newMembership.userId,
          role: newMembership.role,
        },
      );
    },
    onError: (error) => {
      logger.error("🏘️ API: Failed to join community via consolidated hook", {
        error,
      });
    },
  });

  // Leave mutation
  const leaveMutation = useMutation({
    mutationFn: (communityId: string) =>
      communityService.leaveCommunity(communityId),
    onSuccess: (_, communityId) => {
      // Invalidate all communities queries
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.byId(communityId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.memberships(communityId),
      });
      queryClient.invalidateQueries({
        queryKey: ["user-memberships"],
      });

      logger.info("🏘️ API: Successfully left community via consolidated hook", {
        communityId,
      });
    },
    onError: (error) => {
      logger.error("🏘️ API: Failed to leave community via consolidated hook", {
        error,
      });
    },
  });

  const result = {
    // Unified React Query status properties (query + mutations)
    isPending: communitiesQuery.isFetching || 
               (createMutation && createMutation.isPending) || 
               (updateMutation && updateMutation.isPending) || 
               (deleteMutation && deleteMutation.isPending) || 
               (joinMutation && joinMutation.isPending) || 
               (leaveMutation && leaveMutation.isPending) || 
               false,
    isError: communitiesQuery.isError || (createMutation?.isError || false) || (updateMutation?.isError || false) || (deleteMutation?.isError || false) || (joinMutation?.isError || false) || (leaveMutation?.isError || false),
    isSuccess: communitiesQuery.isSuccess || (createMutation?.isSuccess || false) || (updateMutation?.isSuccess || false) || (deleteMutation?.isSuccess || false) || (joinMutation?.isSuccess || false) || (leaveMutation?.isSuccess || false),
    isFetching: communitiesQuery.isFetching, // Only for query operations
    error: communitiesQuery.error || createMutation?.error || updateMutation?.error || deleteMutation?.error || joinMutation?.error || leaveMutation?.error,

    // Manual fetch operation
    retrieve: async (options?: { includeDeleted?: boolean }) => {
      const result = await queryClient.fetchQuery({
        queryKey: queryKeys.communities.all,
        queryFn: () => communityService.fetchCommunities(options),
        staleTime: 5 * 60 * 1000,
      });
      return result;
    },

    // Mutations (with defensive null checks for testing environments)
    create: createMutation?.mutateAsync || (() => Promise.reject(new Error('Create mutation not ready'))),
    update: (id: string, data: Partial<CommunityData>) =>
      updateMutation?.mutateAsync ? updateMutation.mutateAsync({ id, data }) : Promise.reject(new Error('Update mutation not ready')),
    delete: deleteMutation?.mutateAsync || (() => Promise.reject(new Error('Delete mutation not ready'))),
    join: (communityId: string, role?: "member" | "admin" | "organizer") =>
      joinMutation?.mutateAsync ? joinMutation.mutateAsync({ communityId, role }) : Promise.reject(new Error('Join mutation not ready')),
    leave: leaveMutation?.mutateAsync || (() => Promise.reject(new Error('Leave mutation not ready'))),

    // Individual mutation objects for specific access when needed
    createMutation,
    updateMutation,
    deleteMutation,
    joinMutation,
    leaveMutation,

    // Raw queries for advanced usage
    communitiesQuery,
  };
  
  return result;
}

/**
 * Hook to fetch a specific community by ID
 */
export function useCommunity(id: string) {
  const supabase = useSupabase();
  const communityService = createCommunityService(supabase);
  
  return useQuery<Community | null, Error>({
    queryKey: queryKeys.communities.byId(id),
    queryFn: () => communityService.fetchCommunityById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch memberships for a specific community
 */
export function useCommunityMemberships(communityId: string) {
  const supabase = useSupabase();
  const communityService = createCommunityService(supabase);
  
  return useQuery<CommunityMembership[], Error>({
    queryKey: queryKeys.communities.memberships(communityId),
    queryFn: () => communityService.fetchCommunityMemberships(communityId),
    enabled: !!communityId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch user memberships across all communities
 */
export function useUserMemberships(userId: string) {
  const supabase = useSupabase();
  const communityService = createCommunityService(supabase);
  
  return useQuery<CommunityMembership[], Error>({
    queryKey: queryKeys.communities.userMemberships(userId),
    queryFn: () => communityService.fetchUserMemberships(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
