import { logger } from "@belongnetwork/core";
import type {
  Event,
  EventData,
  EventInfo,
  EventFilter,
  EventAttendance,
  User,
} from "@belongnetwork/types";
import { EventAttendanceStatus } from "@belongnetwork/types";
import {
  toDomainEvent,
  toEventInfo,
  forDbInsert,
  forDbUpdate,
} from "../transformers/eventTransformer";
import {
  toDomainEventAttendance,
  forDbInsert as forDbAttendanceInsert,
} from "../transformers/eventAttendanceTransformer";
import { createUserService } from "../../users/services/user.service";
import { createCommunityService } from "../../communities/services/community.service";
import { MESSAGE_AUTHENTICATION_REQUIRED } from "../../constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@belongnetwork/types/database";

export const createEventService = (supabase: SupabaseClient<Database>) => ({
  async fetchEvents(filters?: EventFilter): Promise<EventInfo[]> {
    logger.debug("🎉 Event Service: Fetching events", { filters });

    try {
      // CRITICAL FIX: Always filter for active events first, then apply other filters
      let query = supabase
        .from("events")
        .select("*")
        .eq("is_active", true)  // Force active events only
        .order("start_date_time", { ascending: true });

      // Only allow explicit inactive filtering if specifically requested
      if (filters?.isActive === false) {
        query = supabase
          .from("events")
          .select("*")
          .eq("is_active", false)
          .order("start_date_time", { ascending: true });
      }

      // Apply other filters if provided
      if (filters) {
        if (filters.communityId) {
          query = query.eq("community_id", filters.communityId);
        }
        if (filters.organizerId) {
          query = query.eq("organizer_id", filters.organizerId);
        }
        if (filters.startDate) {
          query = query.gte("start_date_time", filters.startDate.toISOString());
        }
        if (filters.endDate) {
          query = query.lte("start_date_time", filters.endDate.toISOString());
        }
        if (filters.tags && filters.tags.length > 0) {
          query = query.overlaps("tags", filters.tags);
        }
        if (filters.searchTerm) {
          query = query.or(
            `title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`,
          );
        }
      }

      const { data, error } = await query;

      if (error) {
        logger.error("🎉 Event Service: Failed to fetch events", { error });
        throw error;
      }

      if (!data) {
        return [];
      }



      // Convert to EventInfo objects
      const events = data.map((dbEvent) =>
        toEventInfo(dbEvent, dbEvent.organizer_id, dbEvent.community_id),
      );

      // CRITICAL FIX: Filter out inactive events at the application level
      // This ensures soft-deleted events never appear regardless of database filtering issues
      const activeEvents = events.filter(event => event.isActive === true);

      logger.debug("🎉 Event Service: Successfully fetched events", {
        totalCount: events.length,
        activeCount: activeEvents.length,
        filteredOut: events.length - activeEvents.length,
        filters,
      });

      return activeEvents;
    } catch (error) {
      logger.error("🎉 Event Service: Error fetching events", {
        filters,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async fetchEventById(id: string): Promise<Event | null> {
    logger.debug("🎉 Event Service: Fetching event by ID", { id });

    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Not found
          logger.debug("🎉 Event Service: Event not found", { id });
          return null;
        }
        logger.error("🎉 Event Service: Failed to fetch event", { id, error });
        throw error;
      }

      // Fetch organizer and community using cache pattern
      const userService = createUserService(supabase);
      const communityService = createCommunityService(supabase);

      const [organizer, community] = await Promise.all([
        userService.fetchUserById(data.organizer_id),
        data.community_id
          ? communityService.fetchCommunityById(data.community_id)
          : Promise.resolve(null),
      ]);

      if (!organizer) {
        throw new Error("Organizer not found");
      }

      if (!community) {
        throw new Error("Community not found");
      }

      const event = toDomainEvent(data, { organizer, community });

      logger.debug("🎉 Event Service: Successfully fetched event", {
        id,
        organizerId: event.organizer.id,
        communityId: event.community?.id,
      });

      return event;
    } catch (error) {
      logger.error("🎉 Event Service: Error fetching event", {
        id,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async createEvent(data: EventData): Promise<Event> {
    logger.debug("🎉 Event Service: Creating event", {
      data: { ...data, location: "REDACTED" },
    });

    try {
      // Get current user
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData?.user?.id) {
        logger.error(
          "🎉 Event Service: User must be authenticated to create an event",
          {
            error: userError,
          },
        );
        throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
      }

      const userId = userData.user.id;

      // Transform to database format
      const dbEvent = forDbInsert(data, userId);

      // Insert into database
      const { data: createdEvent, error } = await supabase
        .from("events")
        .insert([dbEvent])
        .select("*")
        .single();

      if (error) {
        logger.error("🎉 Event Service: Failed to create event", { error });
        throw error;
      }

      // Fetch organizer and community from cache
      const userService = createUserService(supabase);
      const communityService = createCommunityService(supabase);

      const [organizer, community] = await Promise.all([
        userService.fetchUserById(createdEvent.organizer_id),
        createdEvent.community_id
          ? communityService.fetchCommunityById(createdEvent.community_id)
          : Promise.resolve(null),
      ]);

      if (!organizer) {
        throw new Error("Organizer not found");
      }

      if (!community) {
        throw new Error("Community not found");
      }

      const event = toDomainEvent(createdEvent, { organizer, community });

      logger.info("🎉 Event Service: Successfully created event", {
        id: event.id,
        title: event.title,
        organizerId: event.organizer.id,
        communityId: event.community?.id,
      });

      return event;
    } catch (error) {
      logger.error("🎉 Event Service: Error creating event", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async updateEvent(id: string, data: Partial<EventData>): Promise<Event> {
    logger.debug("🎉 Event Service: Updating event", { id, data });

    try {
      // Get current user
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData?.user?.id) {
        logger.error(
          "🎉 Event Service: User must be authenticated to update an event",
          {
            error: userError,
          },
        );
        throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
      }

      // Transform to database format
      const dbUpdate = forDbUpdate(data);

      // Update in database
      const { data: updatedEvent, error } = await supabase
        .from("events")
        .update(dbUpdate)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        logger.error("🎉 Event Service: Failed to update event", { id, error });
        throw error;
      }

      // Fetch organizer and community from cache
      const userService = createUserService(supabase);
      const communityService = createCommunityService(supabase);

      const [organizer, community] = await Promise.all([
        userService.fetchUserById(updatedEvent.organizer_id),
        updatedEvent.community_id
          ? communityService.fetchCommunityById(updatedEvent.community_id)
          : Promise.resolve(null),
      ]);

      if (!organizer) {
        throw new Error("Organizer not found");
      }

      if (!community) {
        throw new Error("Community not found");
      }

      const event = toDomainEvent(updatedEvent, { organizer, community });

      logger.info("🎉 Event Service: Successfully updated event", {
        id: event.id,
        title: event.title,
      });

      return event;
    } catch (error) {
      logger.error("🎉 Event Service: Error updating event", {
        id,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async deleteEvent(id: string): Promise<void> {
    logger.debug("🎉 Event Service: Deleting event", { id });

    try {
      // Get current user
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData?.user?.id) {
        logger.error(
          "🎉 Event Service: User must be authenticated to delete an event",
          {
            error: userError,
          },
        );
        throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
      }

      const userId = userData.user.id;

      // First, fetch the existing event to verify ownership
      const { data: existingEvent, error: fetchError } = await supabase
        .from("events")
        .select("organizer_id")
        .eq("id", id)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          // Event not found - we can consider this a success
          logger.debug("🎉 Event Service: Event not found for deletion", {
            id,
          });
          return;
        }

        logger.error("🎉 Event Service: Failed to fetch event for deletion", {
          id,
          error: fetchError.message,
          code: fetchError.code,
        });
        throw fetchError;
      }

      // Check if the current user is the organizer
      if (existingEvent.organizer_id !== userId) {
        logger.error(
          "🎉 Event Service: User is not authorized to delete this event",
          {
            userId,
            organizerId: existingEvent.organizer_id,
            eventId: id,
          },
        );
        throw new Error("You are not authorized to delete this event");
      }

      // Perform the soft delete (set is_active to false)
      const { error: deleteError } = await supabase
        .from("events")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (deleteError) {
        logger.error("🎉 Event Service: Failed to delete event", {
          id,
          error: deleteError.message,
          code: deleteError.code,
        });
        throw deleteError;
      }

      logger.info("🎉 Event Service: Successfully deleted event", { id });
      return;
    } catch (error) {
      logger.error("🎉 Event Service: Error deleting event", {
        id,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async joinEvent(
    eventId: string,
    status: EventAttendanceStatus = EventAttendanceStatus.ATTENDING,
  ): Promise<EventAttendance> {
    logger.debug("🎉 Event Service: Joining event", { eventId, status });

    try {
      // Get current user
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData?.user?.id) {
        logger.error(
          "🎉 Event Service: User must be authenticated to join an event",
          {
            error: userError,
          },
        );
        throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
      }

      const userId = userData.user.id;

      // Check if event exists and get its details
      const event = await this.fetchEventById(eventId);
      if (!event) {
        throw new Error("Event not found");
      }

      // Check capacity if maxAttendees is set
      if (event.maxAttendees && status === "attending") {
        const { data: currentAttendees, error: countError } = await supabase
          .from("event_attendances")
          .select("id", { count: "exact" })
          .eq("event_id", eventId)
          .eq("status", "attending");

        if (countError) {
          logger.error("🎉 Event Service: Failed to check event capacity", {
            eventId,
            error: countError,
          });
          throw countError;
        }

        if (currentAttendees && currentAttendees.length >= event.maxAttendees) {
          throw new Error("Event is at capacity");
        }
      }

      // Check if user is already attending
      const { data: existingAttendance, error: checkError } = await supabase
        .from("event_attendances")
        .select("*")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        logger.error("🎉 Event Service: Failed to check existing attendance", {
          eventId,
          userId,
          error: checkError,
        });
        throw checkError;
      }

      if (existingAttendance) {
        // Update existing attendance status
        const { data: updatedAttendance, error: updateError } = await supabase
          .from("event_attendances")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", existingAttendance.id)
          .select("*")
          .single();

        if (updateError) {
          logger.error("🎉 Event Service: Failed to update attendance status", {
            eventId,
            userId,
            error: updateError,
          });
          throw updateError;
        }

        // Return updated attendance
        const userService = createUserService(supabase);
        const user = await userService.fetchUserById(userId);
        if (!user) {
          throw new Error("User not found");
        }
        return toDomainEventAttendance(updatedAttendance, { user, event });
      }

      // Create new attendance
      const dbAttendance = forDbAttendanceInsert(
        {
          eventId,
          userId,
          status,
        },
        userId,
      );

      const { data: newAttendance, error: insertError } = await supabase
        .from("event_attendances")
        .insert([dbAttendance])
        .select("*")
        .single();

      if (insertError) {
        logger.error("🎉 Event Service: Failed to join event", {
          eventId,
          userId,
          error: insertError,
        });
        throw insertError;
      }

      // Fetch user for complete attendance object
      const userService = createUserService(supabase);
      const user = await userService.fetchUserById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      const attendance = toDomainEventAttendance(newAttendance, {
        user,
        event,
      });

      logger.info("🎉 Event Service: Successfully joined event", {
        eventId,
        userId,
        attendanceId: attendance.id,
        status: attendance.status,
      });

      return attendance;
    } catch (error) {
      logger.error("🎉 Event Service: Error joining event", {
        eventId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async leaveEvent(eventId: string): Promise<void> {
    logger.debug("🎉 Event Service: Leaving event", { eventId });

    try {
      // Get current user
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData?.user?.id) {
        logger.error(
          "🎉 Event Service: User must be authenticated to leave an event",
          {
            error: userError,
          },
        );
        throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
      }

      const userId = userData.user.id;

      // Delete the attendance record
      const { error: deleteError } = await supabase
        .from("event_attendances")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", userId);

      if (deleteError) {
        logger.error("🎉 Event Service: Failed to leave event", {
          eventId,
          userId,
          error: deleteError,
        });
        throw deleteError;
      }

      logger.info("🎉 Event Service: Successfully left event", {
        eventId,
        userId,
      });

      return;
    } catch (error) {
      logger.error("🎉 Event Service: Error leaving event", {
        eventId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async fetchEventAttendees(filters: {
    eventId?: string;
    userId?: string;
    status?: string;
  }): Promise<EventAttendance[]> {
    logger.debug("🎉 Event Service: Fetching event attendees", { filters });

    try {
      let query = supabase
        .from("event_attendances")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.eventId) {
        query = query.eq("event_id", filters.eventId);
      }
      if (filters.userId) {
        query = query.eq("user_id", filters.userId);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) {
        logger.error("🎉 Event Service: Failed to fetch event attendances", {
          filters,
          error,
        });
        throw error;
      }

      if (!data || data.length === 0) {
        logger.debug("🎉 Event Service: No attendees found", { filters });
        return [];
      }

      // Get unique user IDs
      const userIds = Array.from(new Set(data.map((a) => a.user_id)));

      // Fetch all users using the user service
      const userService = createUserService(supabase);
      const userPromises = userIds.map((id) => userService.fetchUserById(id));
      const users = await Promise.all(userPromises);

      // Create user map for quick lookup
      const userMap = new Map<string, User>();
      users.forEach((user) => {
        if (user) {
          userMap.set(user.id, user);
        }
      });

      // For fetchEventAttendees, we need the event for each attendance
      // This is inefficient but necessary for the domain model
      const eventIds = Array.from(new Set(data.map((a) => a.event_id)));
      const eventPromises = eventIds.map((id) => this.fetchEventById(id));
      const events = await Promise.all(eventPromises);

      // Create event map for quick lookup
      const eventMap = new Map<string, Event>();
      events.forEach((event) => {
        if (event) {
          eventMap.set(event.id, event);
        }
      });

      // Transform to EventAttendance objects
      const attendances = data
        .map((attendance) => {
          const user = userMap.get(attendance.user_id);
          const event = eventMap.get(attendance.event_id);

          if (!user) {
            logger.warn("🎉 Event Service: User not found for attendance", {
              userId: attendance.user_id,
              attendanceId: attendance.id,
            });
            return null;
          }

          if (!event) {
            logger.warn("🎉 Event Service: Event not found for attendance", {
              eventId: attendance.event_id,
              attendanceId: attendance.id,
            });
            return null;
          }

          return toDomainEventAttendance(attendance, { user, event });
        })
        .filter(
          (attendance): attendance is EventAttendance => attendance !== null,
        );

      logger.debug("🎉 Event Service: Successfully fetched event attendees", {
        filters,
        count: attendances.length,
      });

      return attendances;
    } catch (error) {
      logger.error("🎉 Event Service: Error fetching event attendees", {
        filters,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async fetchUserEventAttendances(userId: string): Promise<EventAttendance[]> {
    logger.debug("🎉 Event Service: Fetching user event attendances", {
      userId,
    });

    try {
      const { data: attendances, error } = await supabase
        .from("event_attendances")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error(
          "🎉 Event Service: Failed to fetch user event attendances",
          {
            userId,
            error,
          },
        );
        throw error;
      }

      if (!attendances || attendances.length === 0) {
        logger.debug("🎉 Event Service: No event attendances found for user", {
          userId,
        });
        return [];
      }

      // Fetch user for complete attendance objects
      const userService = createUserService(supabase);
      const user = await userService.fetchUserById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Fetch events for all attendances
      const eventIds = Array.from(new Set(attendances.map((a) => a.event_id)));
      const eventPromises = eventIds.map((id) => this.fetchEventById(id));
      const events = await Promise.all(eventPromises);

      // Create event map for quick lookup
      const eventMap = new Map<string, Event>();
      events.forEach((event) => {
        if (event) {
          eventMap.set(event.id, event);
        }
      });

      const eventAttendances = attendances
        .map((attendance) => {
          const event = eventMap.get(attendance.event_id);
          if (!event) {
            logger.warn("🎉 Event Service: Event not found for attendance", {
              eventId: attendance.event_id,
              attendanceId: attendance.id,
            });
            return null;
          }
          return toDomainEventAttendance(attendance, { user, event });
        })
        .filter(
          (attendance): attendance is EventAttendance => attendance !== null,
        );

      logger.debug(
        "🎉 Event Service: Successfully fetched user event attendances",
        {
          userId,
          count: eventAttendances.length,
        },
      );

      return eventAttendances;
    } catch (error) {
      logger.error("🎉 Event Service: Error fetching user event attendances", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
});
