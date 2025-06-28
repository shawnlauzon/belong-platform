import { logger } from "@belongnetwork/core";
import type {
  Community,
  CommunityData,
  CommunityInfo,
  CommunityMembership,
  User,
} from "@belongnetwork/types";
import { requireAuthentication } from "../../shared/auth-helpers";
import { ERROR_CODES } from "../../constants";
import {
  toCommunityInfo,
  toDomainCommunity,
  forDbInsert,
} from "../transformers/communityTransformer";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@belongnetwork/types/database";

export const createCommunityService = (supabase: SupabaseClient<Database>) => ({
  async fetchCommunities(options?: {
    includeDeleted?: boolean;
  }): Promise<CommunityInfo[]> {
    logger.debug("🏘️ API: Fetching communities", { options });

    try {
      let query = supabase
        .from("communities")
        .select("*")
        .order("created_at", { ascending: false });

      // By default, only fetch active communities
      if (!options?.includeDeleted) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        logger.error("🏘️ API: Failed to fetch communities", { error });
        throw error;
      }

      const communities: CommunityInfo[] = (data || []).map((dbCommunity) =>
        toCommunityInfo(dbCommunity),
      );

      logger.debug("🏘️ API: Successfully fetched communities", {
        count: communities.length,
        includeDeleted: options?.includeDeleted,
      });
      return communities;
    } catch (error) {
      logger.error("🏘️ API: Error fetching communities", { error });
      throw error;
    }
  },

  async fetchCommunityById(
    id: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Community | null> {
    logger.debug("🏘️ API: Fetching community by ID", { id, options });

    try {
      let query = supabase
        .from("communities")
        .select("*, organizer:profiles!communities_organizer_id_fkey(*)")
        .eq("id", id);

      // By default, only fetch active communities
      if (!options?.includeDeleted) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === ERROR_CODES.NOT_FOUND) {
          return null; // Community not found
        }
        throw error;
      }

      const community = toDomainCommunity(data);
      logger.debug("🏘️ API: Successfully fetched community", {
        id,
        name: community.name,
        isActive: community.isActive,
      });
      return community;
    } catch (error) {
      logger.error("🏘️ API: Error fetching community by ID", { id, error });
      throw error;
    }
  },

  async createCommunity(data: CommunityData): Promise<Community> {
    logger.debug("🏘️ API: Creating community", { name: data.name });

    try {
      await requireAuthentication(supabase, "create community");

      const { data: newCommunity, error } = await supabase
        .from("communities")
        .insert(forDbInsert(data))
        .select("id")
        .single();

      if (error) {
        logger.error("🏘️ API: Failed to create community", { error });
        throw error;
      }

      // For now, return a simplified community object
      // In the future, we can fetch the full community with organizer data
      const organizer: User = {
        id: data.organizerId,
        email: "",
        firstName: "",
        lastName: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const community: Community = {
        id: newCommunity.id,
        name: data.name,
        description: data.description,
        level: data.level,
        timeZone: data.timeZone,
        organizer,
        parentId: data.parentId || null,
        hierarchyPath: data.hierarchyPath,
        memberCount: data.memberCount,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info("🏘️ API: Successfully created community", {
        id: community.id,
        name: community.name,
      });
      return community;
    } catch (error) {
      logger.error("🏘️ API: Error creating community", { error });
      throw error;
    }
  },

  async updateCommunity(
    updateData: Partial<CommunityData> & { id: string },
  ): Promise<Community> {
    logger.debug("🏘️ API: Updating community", { id: updateData.id });

    try {
      const userId = await requireAuthentication(supabase, "update community");

      const { error } = await supabase
        .from("communities")
        .update({
          name: updateData.name,
          description: updateData.description,
          level: updateData.level,
          time_zone: updateData.timeZone,
          hierarchy_path: updateData.hierarchyPath
            ? JSON.stringify(updateData.hierarchyPath)
            : undefined,
        })
        .eq("id", updateData.id);

      if (error) {
        logger.error("🏘️ API: Failed to update community", { error });
        throw error;
      }

      // Return a simplified community object
      const organizer: User = {
        id: userId,
        email: "",
        firstName: "",
        lastName: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const community: Community = {
        id: updateData.id,
        name: updateData.name || "",
        description: updateData.description,
        level: updateData.level || "neighborhood",
        timeZone: updateData.timeZone || "America/New_York",
        organizer,
        parentId: updateData.parentId || null,
        hierarchyPath: updateData.hierarchyPath || [],
        memberCount: updateData.memberCount || 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info("🏘️ API: Successfully updated community", {
        id: community.id,
        name: community.name,
      });
      return community;
    } catch (error) {
      logger.error("🏘️ API: Error updating community", { error });
      throw error;
    }
  },

  async deleteCommunity(id: string): Promise<{ success: boolean }> {
    logger.debug("🏘️ API: Deleting community", { id });

    try {
      const userId = await requireAuthentication(supabase, "delete community");

      const { error } = await supabase
        .from("communities")
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
        })
        .eq("id", id);

      if (error) {
        logger.error("🏘️ API: Failed to delete community", { error });
        throw error;
      }

      logger.info("🏘️ API: Successfully deleted community", { id });
      return { success: true };
    } catch (error) {
      logger.error("🏘️ API: Error deleting community", { error });
      throw error;
    }
  },

  async joinCommunity(
    communityId: string,
    role: "member" | "admin" | "organizer" = "member",
  ): Promise<CommunityMembership> {
    logger.debug("🏘️ API: Joining community", { communityId, role });

    try {
      // Get current user
      const userId = await requireAuthentication(supabase, "join community");

      // Check if user is already a member
      const { data: existingMembership, error: checkError } = await supabase
        .from("community_memberships")
        .select("*")
        .eq("user_id", userId)
        .eq("community_id", communityId)
        .single();

      if (checkError && checkError.code !== ERROR_CODES.NOT_FOUND) {
        // ERROR_CODES.NOT_FOUND is "No rows found" - which is what we want
        logger.error("🏘️ API: Failed to check existing membership", {
          error: checkError,
        });
        throw checkError;
      }

      if (existingMembership) {
        logger.info("🏘️ API: User is already a member of this community", {
          userId,
          communityId,
        });
        throw new Error("User is already a member of this community");
      }

      // Create membership data
      const membershipData = {
        userId,
        communityId,
        role,
      };

      // Transform to database format
      const dbMembership = {
        user_id: userId,
        community_id: communityId,
        role: role,
      };

      // Insert membership
      const { data: createdMembership, error } = await supabase
        .from("community_memberships")
        .insert([dbMembership])
        .select("user_id, community_id, role, joined_at")
        .single();

      if (error) {
        logger.error("🏘️ API: Failed to create community membership", {
          error,
        });
        throw error;
      }

      // Transform to domain model
      const membership = {
        id: `${createdMembership.user_id}-${createdMembership.community_id}`,
        userId: createdMembership.user_id,
        communityId: createdMembership.community_id,
        role: createdMembership.role as "member" | "admin" | "organizer",
        joinedAt: new Date(createdMembership.joined_at),
      };

      logger.info("🏘️ API: Successfully joined community", {
        userId,
        communityId,
        role,
      });

      return membership;
    } catch (error) {
      logger.error("🏘️ API: Error joining community", { error, communityId });
      throw error;
    }
  },

  async leaveCommunity(communityId: string): Promise<void> {
    logger.debug("🏘️ API: Leaving community", { communityId });

    try {
      // Get current user
      const userId = await requireAuthentication(supabase, "leave community");

      // Check if user is a member
      const { data: existingMembership, error: checkError } = await supabase
        .from("community_memberships")
        .select("*")
        .eq("user_id", userId)
        .eq("community_id", communityId)
        .single();

      if (checkError) {
        if (checkError.code === "PGRST116") {
          // No rows found - user is not a member
          logger.info("🏘️ API: User is not a member of this community", {
            userId,
            communityId,
          });
          throw new Error("User is not a member of this community");
        }
        logger.error("🏘️ API: Failed to check existing membership", {
          error: checkError,
        });
        throw checkError;
      }

      // Check if user is the organizer - they cannot leave their own community
      const { data: community, error: communityError } = await supabase
        .from("communities")
        .select("organizer_id")
        .eq("id", communityId)
        .single();

      if (communityError) {
        logger.error("🏘️ API: Failed to fetch community details", {
          error: communityError,
        });
        throw communityError;
      }

      if (community.organizer_id === userId) {
        logger.info("🏘️ API: Organizer cannot leave their own community", {
          userId,
          communityId,
        });
        throw new Error("Organizer cannot leave their own community");
      }

      // Delete membership
      const { error: deleteError } = await supabase
        .from("community_memberships")
        .delete()
        .eq("user_id", userId)
        .eq("community_id", communityId);

      if (deleteError) {
        logger.error("🏘️ API: Failed to delete community membership", {
          error: deleteError,
        });
        throw deleteError;
      }

      logger.info("🏘️ API: Successfully left community", {
        userId,
        communityId,
      });
    } catch (error) {
      logger.error("🏘️ API: Error leaving community", { error, communityId });
      throw error;
    }
  },

  async fetchCommunityMemberships(
    communityId: string,
  ): Promise<CommunityMembership[]> {
    logger.debug("🏘️ API: Fetching community memberships", { communityId });

    try {
      const { data, error } = await supabase
        .from("community_memberships")
        .select("user_id, community_id, role, joined_at")
        .eq("community_id", communityId)
        .order("joined_at", { ascending: false });

      if (error) {
        logger.error("🏘️ API: Failed to fetch community memberships", {
          error,
        });
        throw error;
      }

      const memberships = (data || []).map((dbMembership: any) => ({
        id: `${dbMembership.user_id}-${dbMembership.community_id}`,
        userId: dbMembership.user_id,
        communityId: dbMembership.community_id,
        role: dbMembership.role as "member" | "admin" | "organizer",
        joinedAt: new Date(dbMembership.joined_at),
      }));

      logger.debug("🏘️ API: Successfully fetched community memberships", {
        communityId,
        count: memberships.length,
      });

      return memberships;
    } catch (error) {
      logger.error("🏘️ API: Error fetching community memberships", {
        error,
        communityId,
      });
      throw error;
    }
  },

  async fetchUserMemberships(userId?: string): Promise<CommunityMembership[]> {
    logger.debug("🏘️ API: Fetching user memberships", { userId });

    try {
      let targetUserId = userId;

      // If no userId provided, get current user
      if (!targetUserId) {
        targetUserId = await requireAuthentication(supabase, "fetch user communities");
      }

      const { data, error } = await supabase
        .from("community_memberships")
        .select("user_id, community_id, role, joined_at")
        .eq("user_id", targetUserId)
        .order("joined_at", { ascending: false });

      if (error) {
        logger.error("🏘️ API: Failed to fetch user memberships", { error });
        throw error;
      }

      const memberships = (data || []).map((dbMembership: any) => ({
        id: `${dbMembership.user_id}-${dbMembership.community_id}`,
        userId: dbMembership.user_id,
        communityId: dbMembership.community_id,
        role: dbMembership.role as "member" | "admin" | "organizer",
        joinedAt: new Date(dbMembership.joined_at),
      }));

      logger.debug("🏘️ API: Successfully fetched user memberships", {
        userId: targetUserId,
        count: memberships.length,
      });

      return memberships;
    } catch (error) {
      logger.error("🏘️ API: Error fetching user memberships", {
        error,
        userId,
      });
      throw error;
    }
  },
});
