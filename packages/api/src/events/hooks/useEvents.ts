import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logger } from "@belongnetwork/core";
import { useSupabase } from "../../auth/providers/CurrentUserProvider";
import { createEventService } from "../services/event.service";
import { queryKeys } from "../../shared/queryKeys";
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
export function useEvents(filters?: EventFilter) {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const eventService = createEventService(supabase);

  // List events query
  const eventsQuery = useQuery<EventInfo[], Error>({
    queryKey: filters
      ? queryKeys.events.filtered(filters)
      : queryKeys.events.all,
    queryFn: () => eventService.fetchEvents(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    onSuccess: (_, eventId) => {
      // Invalidate all events queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      // Additionally invalidate ALL event-related queries (both "events" and "event" prefixes)
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "events" || query.queryKey[0] === "event"
      });
      queryClient.removeQueries({
        queryKey: queryKeys.events.byId(eventId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.events.attendees(eventId),
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
      filters,
    });
  }

  return {
    // Queries
    events: eventsQuery.data,
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error,

    // Mutations (with defensive null checks for testing environments)
    create: createMutation?.mutateAsync || (() => Promise.reject(new Error('Create mutation not ready'))),
    update: (id: string, data: Partial<EventData>) =>
      updateMutation?.mutateAsync ? updateMutation.mutateAsync({ id, data }) : Promise.reject(new Error('Update mutation not ready')),
    delete: deleteMutation?.mutateAsync || (() => Promise.reject(new Error('Delete mutation not ready'))),
    join: (eventId: string, status?: EventAttendanceStatus) =>
      joinMutation?.mutateAsync ? joinMutation.mutateAsync({ eventId, status }) : Promise.reject(new Error('Join mutation not ready')),
    leave: leaveMutation?.mutateAsync || (() => Promise.reject(new Error('Leave mutation not ready'))),

    // Mutation states (with defensive null checks)
    isCreating: createMutation?.isPending || false,
    isUpdating: updateMutation?.isPending || false,
    isDeleting: deleteMutation?.isPending || false,
    isJoining: joinMutation?.isPending || false,
    isLeaving: leaveMutation?.isPending || false,

    // Raw queries for advanced usage
    eventsQuery,
  };
}

/**
 * Hook to fetch a specific event by ID
 */
export function useEvent(id: string) {
  const supabase = useSupabase();
  const eventService = createEventService(supabase);
  
  return useQuery<Event | null, Error>({
    queryKey: queryKeys.events.byId(id),
    queryFn: () => eventService.fetchEventById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch attendees for a specific event
 */
export function useEventAttendees(eventId: string) {
  const supabase = useSupabase();
  const eventService = createEventService(supabase);
  
  return useQuery<EventAttendance[], Error>({
    queryKey: queryKeys.events.attendees(eventId),
    queryFn: () => eventService.fetchEventAttendees({ eventId }),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes (fresher for attendance)
  });
}

/**
 * Hook to fetch user attendances across all events
 */
export function useUserEventAttendances(userId: string) {
  const supabase = useSupabase();
  const eventService = createEventService(supabase);
  
  return useQuery<EventAttendance[], Error>({
    queryKey: queryKeys.events.userAttendances(userId),
    queryFn: () => eventService.fetchUserEventAttendances(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
