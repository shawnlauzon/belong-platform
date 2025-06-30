import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logger } from "@belongnetwork/core";
import { useSupabase } from "../../auth/providers/CurrentUserProvider";
import { createEventService } from "../services/event.service";
import { queryKeys, STANDARD_CACHE_TIME, SHORT_CACHE_TIME } from "../../shared";
import type {
  Event,
  EventInfo,
  EventData,
  EventFilter,
  EventAttendance,
  EventAttendanceStatus,
} from "@belongnetwork/types";

/**
 * Consolidated hook for all event operations
 * Provides queries, mutations, and state management for events
 */
export function useEvents() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const eventService = createEventService(supabase);

  // List events query - disabled by default to prevent automatic fetching
  const eventsQuery = useQuery<EventInfo[], Error>({
    queryKey: queryKeys.events.all,
    queryFn: () => eventService.fetchEvents(),
    staleTime: STANDARD_CACHE_TIME,
    enabled: false, // Prevent automatic fetching
  });

  // Note: Individual query hooks should be called separately by consumers
  // These factory functions violated Rules of Hooks and have been removed

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: EventData) => eventService.createEvent(data),
    onSuccess: (newEvent) => {
      // Invalidate all events queries to reflect the new event
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byCommunity(newEvent.community.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byOrganizer(newEvent.organizer.id),
      });
      // Additionally invalidate ALL event-related queries (both "events" and "event" prefixes)
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "events" || query.queryKey[0] === "event"
      });

      // Update the cache for this specific event
      queryClient.setQueryData(queryKeys.events.byId(newEvent.id), newEvent);

      logger.info("🎉 API: Successfully created event via consolidated hook", {
        id: newEvent.id,
        title: newEvent.title,
        startDateTime: newEvent.startDateTime,
      });
    },
    onError: (error) => {
      logger.error("🎉 API: Failed to create event via consolidated hook", {
        error,
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EventData> }) =>
      eventService.updateEvent(id, data),
    onSuccess: (updatedEvent) => {
      // Invalidate all events queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byCommunity(updatedEvent.community.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byOrganizer(updatedEvent.organizer.id),
      });
      // Additionally invalidate ALL event-related queries (both "events" and "event" prefixes)
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "events" || query.queryKey[0] === "event"
      });

      // Update the cache for this specific event
      queryClient.setQueryData(
        queryKeys.events.byId(updatedEvent.id),
        updatedEvent,
      );

      logger.info("🎉 API: Successfully updated event via consolidated hook", {
        id: updatedEvent.id,
        title: updatedEvent.title,
      });
    },
    onError: (error) => {
      logger.error("🎉 API: Failed to update event via consolidated hook", {
        error,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventService.deleteEvent(id),
    onSuccess: async (_, eventId) => {
      logger.info("🎉 API DEBUG: Delete mutation onSuccess triggered", {
        eventId,
        queryClientExists: !!queryClient,
      });

      // Get all current queries before invalidation for debugging
      const allQueries = queryClient.getQueryCache().getAll();
      const eventsQueries = allQueries.filter(q => q.queryKey[0] === "events" || q.queryKey[0] === "event");
      
      logger.info("🎉 API DEBUG: Queries before invalidation", {
        totalQueries: allQueries.length,
        eventsQueriesCount: eventsQueries.length,
        eventsQueryKeys: eventsQueries.map(q => q.queryKey),
        eventsQueryStates: eventsQueries.map(q => ({
          queryKey: q.queryKey,
          state: q.state.status,
          dataExists: !!q.state.data,
        })),
      });

      // CRITICAL FIX: Remove ALL events-related cache data synchronously first
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === "events" || key[0] === "event";
        },
      });
      
      // Then invalidate to trigger fresh fetches for active queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === "events" || key[0] === "event";
        },
      });

      logger.info("🎉 API DEBUG: Cache invalidation completed", {
        eventId,
      });

      logger.info("🎉 API: Successfully deleted event via consolidated hook", {
        id: eventId,
      });
    },
    onError: (error) => {
      logger.error("🎉 API: Failed to delete event via consolidated hook", {
        error,
      });
    },
  });

  // Join mutation
  const joinMutation = useMutation({
    mutationFn: ({
      eventId,
      status = "attending" as EventAttendanceStatus,
    }: {
      eventId: string;
      status?: EventAttendanceStatus;
    }) => eventService.joinEvent(eventId, status),
    onSuccess: (attendance) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byId(attendance.event.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.attendees(attendance.event.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.userAttendances(attendance.user.id),
      });
      // Additionally invalidate ALL event-related queries (both "events" and "event" prefixes)
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "events" || query.queryKey[0] === "event"
      });

      logger.info("🎉 API: Successfully joined event via consolidated hook", {
        eventId: attendance.event.id,
        userId: attendance.user.id,
        status: attendance.status,
      });
    },
    onError: (error) => {
      logger.error("🎉 API: Failed to join event via consolidated hook", {
        error,
      });
    },
  });

  // Leave mutation
  const leaveMutation = useMutation({
    mutationFn: (eventId: string) => eventService.leaveEvent(eventId),
    onSuccess: (_, eventId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byId(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.attendees(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: ["user-attendances"],
      });
      // Additionally invalidate ALL event-related queries (both "events" and "event" prefixes)
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "events" || query.queryKey[0] === "event"
      });

      logger.info("🎉 API: Successfully left event via consolidated hook", {
        eventId,
      });
    },
    onError: (error) => {
      logger.error("🎉 API: Failed to leave event via consolidated hook", {
        error,
      });
    },
  });

  // Handle list query errors
  if (eventsQuery.error) {
    logger.error("🎉 API: Error fetching events via consolidated hook", {
      error: eventsQuery.error,
    });
  }

  return {
    // Unified React Query status properties (query + mutations)
    isPending: eventsQuery.isFetching || 
               (createMutation && createMutation.isPending) || 
               (updateMutation && updateMutation.isPending) || 
               (deleteMutation && deleteMutation.isPending) || 
               (joinMutation && joinMutation.isPending) || 
               (leaveMutation && leaveMutation.isPending) || 
               false,
    isError: eventsQuery.isError || (createMutation?.isError || false) || (updateMutation?.isError || false) || (deleteMutation?.isError || false) || (joinMutation?.isError || false) || (leaveMutation?.isError || false),
    isSuccess: eventsQuery.isSuccess || (createMutation?.isSuccess || false) || (updateMutation?.isSuccess || false) || (deleteMutation?.isSuccess || false) || (joinMutation?.isSuccess || false) || (leaveMutation?.isSuccess || false),
    isFetching: eventsQuery.isFetching, // Only for query operations
    error: eventsQuery.error || createMutation?.error || updateMutation?.error || deleteMutation?.error || joinMutation?.error || leaveMutation?.error,

    // List fetch operation
    list: async (filters?: EventFilter) => {
      const result = await queryClient.fetchQuery({
        queryKey: filters
          ? queryKeys.events.filtered(filters)
          : queryKeys.events.all,
        queryFn: () => eventService.fetchEvents(filters),
        staleTime: STANDARD_CACHE_TIME,
      });
      return result;
    },

    // Individual item fetch operation
    byId: async (id: string) => {
      const result = await queryClient.fetchQuery({
        queryKey: queryKeys.events.byId(id),
        queryFn: () => eventService.fetchEventById(id),
        staleTime: STANDARD_CACHE_TIME,
      });
      return result;
    },

    // Event attendees fetch operation
    attendees: async (eventId: string) => {
      const result = await queryClient.fetchQuery({
        queryKey: queryKeys.events.attendees(eventId),
        queryFn: () => eventService.fetchEventAttendees({ eventId }),
        staleTime: SHORT_CACHE_TIME,
      });
      return result;
    },

    // User event attendances fetch operation
    userAttendances: async (userId: string) => {
      const result = await queryClient.fetchQuery({
        queryKey: queryKeys.events.userAttendances(userId),
        queryFn: () => eventService.fetchUserEventAttendances(userId),
        staleTime: STANDARD_CACHE_TIME,
      });
      return result;
    },

    // Mutations - type-safe wrapper functions to prevent parameter misuse
    create: (data: EventData) => {
      return createMutation?.mutateAsync ? createMutation.mutateAsync(data) : Promise.reject(new Error('Create mutation not ready'));
    },
    update: (id: string, data: Partial<EventData>) =>
      updateMutation?.mutateAsync ? updateMutation.mutateAsync({ id, data }) : Promise.reject(new Error('Update mutation not ready')),
    delete: (id: string) => {
      return deleteMutation?.mutateAsync ? deleteMutation.mutateAsync(id) : Promise.reject(new Error('Delete mutation not ready'));
    },
    join: (eventId: string, status?: EventAttendanceStatus) =>
      joinMutation?.mutateAsync ? joinMutation.mutateAsync({ eventId, status }) : Promise.reject(new Error('Join mutation not ready')),
    leave: (eventId: string) => {
      return leaveMutation?.mutateAsync ? leaveMutation.mutateAsync(eventId) : Promise.reject(new Error('Leave mutation not ready'));
    },

    // Individual mutation objects for specific access when needed
    createMutation,
    updateMutation,
    deleteMutation,
    joinMutation,
    leaveMutation,

    // Raw queries for advanced usage
    eventsQuery,
  };
}

