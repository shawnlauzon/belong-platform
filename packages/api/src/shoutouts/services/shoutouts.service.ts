import { logger } from "@belongnetwork/core";
import type {
  Shoutout,
  ShoutoutData,
  ShoutoutInfo,
  ShoutoutFilter,
} from "@belongnetwork/types";
import {
  toDomainShoutout,
  toShoutoutInfo,
  forDbInsert,
  forDbUpdate,
} from "../transformers/shoutoutsTransformer";
import { createUserService } from "../../users/services/user.service";
import { createResourceService } from "../../resources/services/resource.service";
import { requireAuthentication } from "../../shared/auth-helpers";
import { ERROR_CODES } from "../../constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@belongnetwork/types/database";

/**
 * Validates shoutout creation business rules
 */
function validateShoutoutsCreation(data: ShoutoutsData, currentUserId: string): void {
  // Rule: User cannot thank themselves
  if (data.fromUserId === data.toUserId) {
    throw new Error("Cannot thank yourself");
  }
}

/**
 * Validates shoutout update business rules
 */
function validateShoutoutsUpdate(
  existingShoutouts: any,
  updateData: Partial<ShoutoutsData>,
  currentUserId: string
): void {
  // Rule: Cannot change the sender of shoutout
  if (updateData.fromUserId && updateData.fromUserId !== existingShoutouts.from_user_id) {
    throw new Error("Cannot change the sender of shoutout");
  }

  // Rule: Cannot change receiver to yourself (the sender)
  if (updateData.toUserId && updateData.toUserId === existingShoutouts.from_user_id) {
    throw new Error("Cannot change receiver to yourself");
  }
}

export const createShoutoutsService = (supabase: SupabaseClient<Database>) => ({
  async fetchShoutouts(filters?: ShoutoutsFilter): Promise<ShoutoutsInfo[]> {
    logger.debug("📢 Shoutouts Service: Fetching shoutout", { filters });

    try {
      let query = supabase
        .from("shoutouts")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply filters if provided
      if (filters) {
        if (filters.sentBy) {
          query = query.eq("from_user_id", filters.sentBy);
        }
        if (filters.receivedBy) {
          query = query.eq("to_user_id", filters.receivedBy);
        }
        if (filters.resourceId) {
          query = query.eq("resource_id", filters.resourceId);
        }
      }

      const { data, error } = await query;

      if (error) {
        logger.error("📢 Shoutouts Service: Failed to fetch shoutout", { error });
        throw error;
      }

      if (!data) {
        return [];
      }

      // For ShoutoutsInfo[], we need to get communityId from resources
      const resourceIds = Array.from(new Set(data.map((t) => t.resource_id)));

      // Fetch resources to get community IDs using resource service
      const resourceService = createResourceService(supabase);
      const resources = await Promise.all(
        resourceIds.map((id) => resourceService.fetchResourceById(id)),
      );
      const resourceMap = new Map(
        resources.filter(Boolean).map((resource) => [resource!.id, resource!]),
      );

      // Convert to ShoutoutsInfo objects
      const shoutout = data
        .map((dbShoutouts) => {
          try {
            const resource = resourceMap.get(dbShoutouts.resource_id);
            if (!resource) {
              logger.warn("📢 Shoutouts Service: Resource not found for shoutout", {
                shoutoutId: dbShoutouts.id,
                resourceId: dbShoutouts.resource_id,
              });
              return null;
            }

            return toShoutoutsInfo(
              dbShoutouts,
              dbShoutouts.from_user_id,
              dbShoutouts.to_user_id,
              dbShoutouts.resource_id,
              resource.community?.id || "",
            );
          } catch (error) {
            logger.error("📢 Shoutouts Service: Error transforming shoutout", {
              shoutoutId: dbShoutouts.id,
              error: error instanceof Error ? error.message : "Unknown error",
            });
            return null;
          }
        })
        .filter((shoutout): shoutout is ShoutoutsInfo => shoutout !== null);

      logger.debug("📢 Shoutouts Service: Successfully fetched shoutout", {
        count: shoutout.length,
        filters,
      });

      return shoutout;
    } catch (error) {
      logger.error("📢 Shoutouts Service: Error fetching shoutout", {
        filters,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async fetchShoutoutsById(id: string): Promise<Shoutouts | null> {
    logger.debug("📢 Shoutouts Service: Fetching shoutout by ID", { id });

    try {
      const { data, error } = await supabase
        .from("shoutouts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === ERROR_CODES.NOT_FOUND) {
          // Not found
          logger.debug("📢 Shoutouts Service: Shoutouts not found", { id });
          return null;
        }
        logger.error("📢 Shoutouts Service: Failed to fetch shoutout", {
          id,
          error,
        });
        throw error;
      }

      // Fetch fromUser, toUser, and resource using services
      const userService = createUserService(supabase);
      const resourceService = createResourceService(supabase);

      const [fromUser, toUser, resource] = await Promise.all([
        userService.fetchUserById(data.from_user_id),
        userService.fetchUserById(data.to_user_id),
        resourceService.fetchResourceById(data.resource_id),
      ]);

      if (!fromUser || !toUser || !resource) {
        throw new Error("Required related entities not found");
      }

      const shoutout = toDomainShoutouts(data, { fromUser, toUser, resource });

      logger.debug("📢 Shoutouts Service: Successfully fetched shoutout", {
        id,
        fromUserId: shoutout.fromUser.id,
        toUserId: shoutout.toUser.id,
        resourceId: shoutout.resource.id,
      });

      return shoutout;
    } catch (error) {
      logger.error("📢 Shoutouts Service: Error fetching shoutout", {
        id,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async createShoutout(data: ShoutoutData): Promise<Shoutout> {
    logger.debug("📢 Shoutouts Service: Creating shoutout", { data });

    try {
      // Get current user
      const userId = await requireAuthentication(supabase, "create shoutout");

      // Validate business rules before database operation
      validateShoutoutCreation(data, userId);

      // Transform to database format
      const dbShoutout = forDbInsert(data, userId);

      // Insert into database
      const { data: createdShoutout, error } = await supabase
        .from("shoutouts")
        .insert([dbShoutout])
        .select("*")
        .single();

      if (error) {
        logger.error("📢 Shoutouts Service: Failed to create shoutout", { error });
        throw error;
      }

      // Fetch fromUser, toUser, and resource from cache
      const userService = createUserService(supabase);
      const resourceService = createResourceService(supabase);

      const [fromUser, toUser, resource] = await Promise.all([
        userService.fetchUserById(createdShoutouts.from_user_id),
        userService.fetchUserById(createdShoutouts.to_user_id),
        resourceService.fetchResourceById(createdShoutouts.resource_id),
      ]);

      if (!fromUser || !toUser || !resource) {
        throw new Error("Required related entities not found");
      }

      const shoutout = toDomainShoutouts(createdShoutouts, {
        fromUser,
        toUser,
        resource,
      });

      logger.info("📢 Shoutouts Service: Successfully created shoutout", {
        id: shoutout.id,
        fromUserId: shoutout.fromUser.id,
        toUserId: shoutout.toUser.id,
        resourceId: shoutout.resource.id,
      });

      return shoutout;
    } catch (error) {
      logger.error("📢 Shoutouts Service: Error creating shoutout", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async updateShoutouts(id: string, data: Partial<ShoutoutsData>): Promise<Shoutouts> {
    logger.debug("📢 Shoutouts Service: Updating shoutout", { id, data });

    try {
      // Get current user
      const userId = await requireAuthentication(supabase, "update shoutout");

      // Fetch existing shoutout to validate business rules
      const { data: existingShoutouts, error: fetchError } = await supabase
        .from("shoutouts")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) {
        if (fetchError.code === ERROR_CODES.NOT_FOUND) {
          logger.debug("📢 Shoutouts Service: Shoutouts not found for update", { id });
          throw new Error("Shoutouts not found");
        }
        logger.error("📢 Shoutouts Service: Failed to fetch shoutout for update", {
          id,
          error: fetchError,
        });
        throw fetchError;
      }

      // Validate business rules before database operation
      validateShoutoutsUpdate(existingShoutouts, data, userId);

      // Transform to database format
      const dbUpdate = forDbUpdate(data);

      // Update in database
      const { data: updatedShoutouts, error } = await supabase
        .from("shoutouts")
        .update(dbUpdate)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        logger.error("📢 Shoutouts Service: Failed to update shoutout", {
          id,
          error,
        });
        throw error;
      }

      // Fetch fromUser, toUser, and resource from cache
      const userService = createUserService(supabase);
      const resourceService = createResourceService(supabase);

      const [fromUser, toUser, resource] = await Promise.all([
        userService.fetchUserById(updatedShoutouts.from_user_id),
        userService.fetchUserById(updatedShoutouts.to_user_id),
        resourceService.fetchResourceById(updatedShoutouts.resource_id),
      ]);

      if (!fromUser || !toUser || !resource) {
        throw new Error("Required related entities not found");
      }

      const shoutout = toDomainShoutouts(updatedShoutouts, {
        fromUser,
        toUser,
        resource,
      });

      logger.info("📢 Shoutouts Service: Successfully updated shoutout", {
        id: shoutout.id,
        message: shoutout.message,
      });

      return shoutout;
    } catch (error) {
      logger.error("📢 Shoutouts Service: Error updating shoutout", {
        id,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async deleteShoutouts(id: string): Promise<void> {
    logger.debug("📢 Shoutouts Service: Deleting shoutout", { id });

    try {
      // Get current user
      const userId = await requireAuthentication(supabase, "delete shoutout");

      // First, fetch the existing shoutout to verify ownership
      const { data: existingShoutouts, error: fetchError } = await supabase
        .from("shoutouts")
        .select("from_user_id")
        .eq("id", id)
        .single();

      if (fetchError) {
        if (fetchError.code === ERROR_CODES.NOT_FOUND) {
          // Shoutouts not found - we can consider this a success
          logger.debug("📢 Shoutouts Service: Shoutouts not found for deletion", {
            id,
          });
          return;
        }

        logger.error("📢 Shoutouts Service: Failed to fetch shoutout for deletion", {
          id,
          error: fetchError.message,
          code: fetchError.code,
        });
        throw fetchError;
      }

      // Check if the current user is the sender
      if (existingShoutouts.from_user_id !== userId) {
        logger.error(
          "📢 Shoutouts Service: User is not authorized to delete this shoutout",
          {
            userId,
            fromUserId: existingShoutouts.from_user_id,
            shoutoutId: id,
          },
        );
        throw new Error("You are not authorized to delete this shoutout");
      }

      // Perform the delete
      const { error: deleteError } = await supabase
        .from("shoutouts")
        .delete()
        .eq("id", id);

      if (deleteError) {
        logger.error("📢 Shoutouts Service: Failed to delete shoutout", {
          id,
          error: deleteError.message,
          code: deleteError.code,
        });
        throw deleteError;
      }

      logger.info("📢 Shoutouts Service: Successfully deleted shoutout", { id });
      return;
    } catch (error) {
      logger.error("📢 Shoutouts Service: Error deleting shoutout", {
        id,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
});
