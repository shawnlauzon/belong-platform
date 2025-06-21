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
export function useCommunities(options?: { includeDeleted?: boolean }) {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const communityService = createCommunityService(supabase);

  // List communities query
  const communitiesQuery = useQuery<CommunityInfo[], Error>({
    queryKey: queryKeys.communities.all,
    queryFn: () => communityService.fetchCommunities(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query factory functions
  const getCommunity = (id: string) => {
    return useQuery<Community | null, Error>({
      queryKey: queryKeys.communities.byId(id),
      queryFn: () => communityService.fetchCommunityById(id),
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    });
  };

  const getMemberships = (communityId: string) => {
    return useQuery<CommunityMembership[], Error>({
      queryKey: queryKeys.communities.memberships(communityId),
      queryFn: () => communityService.fetchCommunityMemberships(communityId),
      enabled: !!communityId,
      staleTime: 5 * 60 * 1000,
    });
  };

  const getUserMemberships = (userId: string) => {
    return useQuery<CommunityMembership[], Error>({
      queryKey: queryKeys.communities.userMemberships(userId),
      queryFn: () => communityService.fetchUserMemberships(userId),
      enabled: !!userId,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CommunityData) => communityService.createCommunity(data),
    onSuccess: (newCommunity) => {
      // Invalidate the communities list to reflect the new community
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });

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
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
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
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
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
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
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
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
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

  return {
    // Queries
    communities: communitiesQuery.data,
    isLoading: communitiesQuery.isLoading,
    error: communitiesQuery.error,
    getCommunity,
    getMemberships,
    getUserMemberships,

    // Mutations
    create: createMutation.mutateAsync,
    update: (id: string, data: Partial<CommunityData>) =>
      updateMutation.mutateAsync({ id, data }),
    delete: deleteMutation.mutateAsync,
    join: (communityId: string, role?: "member" | "admin" | "organizer") =>
      joinMutation.mutateAsync({ communityId, role }),
    leave: leaveMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isJoining: joinMutation.isPending,
    isLeaving: leaveMutation.isPending,

    // Raw queries for advanced usage
    communitiesQuery,
  };
}
