import { logger } from "@belongnetwork/core";
import type {
  Thanks,
  ThanksData,
  ThanksInfo,
  ThanksFilter,
} from "@belongnetwork/types";
import {
  toDomainThanks,
  toThanksInfo,
  forDbInsert,
  forDbUpdate,
} from "../transformers/thanksTransformer";
import { createUserService } from "../../users/services/user.service";
import { createResourceService } from "../../resources/services/resource.service";
import { MESSAGE_AUTHENTICATION_REQUIRED } from "../../constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@belongnetwork/types/database";

/**
 * Validates thanks creation business rules
 */
function validateThanksCreation(data: ThanksData, currentUserId: string): void {
  // Rule: User cannot thank themselves
  if (data.fromUserId === data.toUserId) {
    throw new Error("Cannot thank yourself");
  }
}

/**
 * Validates thanks update business rules
 */
function validateThanksUpdate(
  existingThanks: any,
  updateData: Partial<ThanksData>,
  currentUserId: string
): void {
  // Rule: Cannot change the sender of thanks
  if (updateData.fromUserId && updateData.fromUserId !== existingThanks.from_user_id) {
    throw new Error("Cannot change the sender of thanks");
  }

  // Rule: Cannot change receiver to yourself (the sender)
  if (updateData.toUserId && updateData.toUserId === existingThanks.from_user_id) {
    throw new Error("Cannot change receiver to yourself");
  }
}

export const createThanksService = (supabase: SupabaseClient<Database>) => ({
  async fetchThanks(filters?: ThanksFilter): Promise<ThanksInfo[]> {
    logger.debug("🙏 Thanks Service: Fetching thanks", { filters });

    try {
      let query = supabase
        .from("thanks")
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
        logger.error("🙏 Thanks Service: Failed to fetch thanks", { error });
        throw error;
      }

      if (!data) {
        return [];
      }

      // For ThanksInfo[], we need to get communityId from resources
      const resourceIds = Array.from(new Set(data.map((t) => t.resource_id)));

      // Fetch resources to get community IDs using resource service
      const resourceService = createResourceService(supabase);
      const resources = await Promise.all(
        resourceIds.map((id) => resourceService.fetchResourceById(id)),
      );
      const resourceMap = new Map(
        resources.filter(Boolean).map((resource) => [resource!.id, resource!]),
      );

      // Convert to ThanksInfo objects
      const thanks = data
        .map((dbThanks) => {
          try {
            const resource = resourceMap.get(dbThanks.resource_id);
            if (!resource) {
              logger.warn("🙏 Thanks Service: Resource not found for thanks", {
                thanksId: dbThanks.id,
                resourceId: dbThanks.resource_id,
              });
              return null;
            }

            return toThanksInfo(
              dbThanks,
              dbThanks.from_user_id,
              dbThanks.to_user_id,
              dbThanks.resource_id,
              resource.community?.id || "",
            );
          } catch (error) {
            logger.error("🙏 Thanks Service: Error transforming thanks", {
              thanksId: dbThanks.id,
              error: error instanceof Error ? error.message : "Unknown error",
            });
            return null;
          }
        })
        .filter((thanks): thanks is ThanksInfo => thanks !== null);

      logger.debug("🙏 Thanks Service: Successfully fetched thanks", {
        count: thanks.length,
        filters,
      });

      return thanks;
    } catch (error) {
      logger.error("🙏 Thanks Service: Error fetching thanks", {
        filters,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async fetchThanksById(id: string): Promise<Thanks | null> {
    logger.debug("🙏 Thanks Service: Fetching thanks by ID", { id });

    try {
      const { data, error } = await supabase
        .from("thanks")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Not found
          logger.debug("🙏 Thanks Service: Thanks not found", { id });
          return null;
        }
        logger.error("🙏 Thanks Service: Failed to fetch thanks", {
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

      const thanks = toDomainThanks(data, { fromUser, toUser, resource });

      logger.debug("🙏 Thanks Service: Successfully fetched thanks", {
        id,
        fromUserId: thanks.fromUser.id,
        toUserId: thanks.toUser.id,
        resourceId: thanks.resource.id,
      });

      return thanks;
    } catch (error) {
      logger.error("🙏 Thanks Service: Error fetching thanks", {
        id,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async createThanks(data: ThanksData): Promise<Thanks> {
    logger.debug("🙏 Thanks Service: Creating thanks", { data });

    try {
      // Get current user
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData?.user?.id) {
        logger.error(
          "🙏 Thanks Service: User must be authenticated to create thanks",
          {
            error: userError,
          },
        );
        throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
      }

      const userId = userData.user.id;

      // Validate business rules before database operation
      validateThanksCreation(data, userId);

      // Transform to database format
      const dbThanks = forDbInsert(data, userId);

      // Insert into database
      const { data: createdThanks, error } = await supabase
        .from("thanks")
        .insert([dbThanks])
        .select("*")
        .single();

      if (error) {
        logger.error("🙏 Thanks Service: Failed to create thanks", { error });
        throw error;
      }

      // Fetch fromUser, toUser, and resource from cache
      const userService = createUserService(supabase);
      const resourceService = createResourceService(supabase);

      const [fromUser, toUser, resource] = await Promise.all([
        userService.fetchUserById(createdThanks.from_user_id),
        userService.fetchUserById(createdThanks.to_user_id),
        resourceService.fetchResourceById(createdThanks.resource_id),
      ]);

      if (!fromUser || !toUser || !resource) {
        throw new Error("Required related entities not found");
      }

      const thanks = toDomainThanks(createdThanks, {
        fromUser,
        toUser,
        resource,
      });

      logger.info("🙏 Thanks Service: Successfully created thanks", {
        id: thanks.id,
        fromUserId: thanks.fromUser.id,
        toUserId: thanks.toUser.id,
        resourceId: thanks.resource.id,
      });

      return thanks;
    } catch (error) {
      logger.error("🙏 Thanks Service: Error creating thanks", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async updateThanks(id: string, data: Partial<ThanksData>): Promise<Thanks> {
    logger.debug("🙏 Thanks Service: Updating thanks", { id, data });

    try {
      // Get current user
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData?.user?.id) {
        logger.error(
          "🙏 Thanks Service: User must be authenticated to update thanks",
          {
            error: userError,
          },
        );
        throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
      }

      const userId = userData.user.id;

      // Fetch existing thanks to validate business rules
      const { data: existingThanks, error: fetchError } = await supabase
        .from("thanks")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          logger.debug("🙏 Thanks Service: Thanks not found for update", { id });
          throw new Error("Thanks not found");
        }
        logger.error("🙏 Thanks Service: Failed to fetch thanks for update", {
          id,
          error: fetchError,
        });
        throw fetchError;
      }

      // Validate business rules before database operation
      validateThanksUpdate(existingThanks, data, userId);

      // Transform to database format
      const dbUpdate = forDbUpdate(data);

      // Update in database
      const { data: updatedThanks, error } = await supabase
        .from("thanks")
        .update(dbUpdate)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        logger.error("🙏 Thanks Service: Failed to update thanks", {
          id,
          error,
        });
        throw error;
      }

      // Fetch fromUser, toUser, and resource from cache
      const userService = createUserService(supabase);
      const resourceService = createResourceService(supabase);

      const [fromUser, toUser, resource] = await Promise.all([
        userService.fetchUserById(updatedThanks.from_user_id),
        userService.fetchUserById(updatedThanks.to_user_id),
        resourceService.fetchResourceById(updatedThanks.resource_id),
      ]);

      if (!fromUser || !toUser || !resource) {
        throw new Error("Required related entities not found");
      }

      const thanks = toDomainThanks(updatedThanks, {
        fromUser,
        toUser,
        resource,
      });

      logger.info("🙏 Thanks Service: Successfully updated thanks", {
        id: thanks.id,
        message: thanks.message,
      });

      return thanks;
    } catch (error) {
      logger.error("🙏 Thanks Service: Error updating thanks", {
        id,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async deleteThanks(id: string): Promise<void> {
    logger.debug("🙏 Thanks Service: Deleting thanks", { id });

    try {
      // Get current user
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData?.user?.id) {
        logger.error(
          "🙏 Thanks Service: User must be authenticated to delete thanks",
          {
            error: userError,
          },
        );
        throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
      }

      const userId = userData.user.id;

      // First, fetch the existing thanks to verify ownership
      const { data: existingThanks, error: fetchError } = await supabase
        .from("thanks")
        .select("from_user_id")
        .eq("id", id)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          // Thanks not found - we can consider this a success
          logger.debug("🙏 Thanks Service: Thanks not found for deletion", {
            id,
          });
          return;
        }

        logger.error("🙏 Thanks Service: Failed to fetch thanks for deletion", {
          id,
          error: fetchError.message,
          code: fetchError.code,
        });
        throw fetchError;
      }

      // Check if the current user is the sender
      if (existingThanks.from_user_id !== userId) {
        logger.error(
          "🙏 Thanks Service: User is not authorized to delete this thanks",
          {
            userId,
            fromUserId: existingThanks.from_user_id,
            thanksId: id,
          },
        );
        throw new Error("You are not authorized to delete this thanks");
      }

      // Perform the delete
      const { error: deleteError } = await supabase
        .from("thanks")
        .delete()
        .eq("id", id);

      if (deleteError) {
        logger.error("🙏 Thanks Service: Failed to delete thanks", {
          id,
          error: deleteError.message,
          code: deleteError.code,
        });
        throw deleteError;
      }

      logger.info("🙏 Thanks Service: Successfully deleted thanks", { id });
      return;
    } catch (error) {
      logger.error("🙏 Thanks Service: Error deleting thanks", {
        id,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
});
