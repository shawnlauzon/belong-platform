/**
 * Standardized query keys for all platform entities
 * This prevents cache inconsistency by using a single source of truth
 */
export const queryKeys = {
  // Authentication state (not profile data)
  auth: ["auth"] as const,

  // User profile data - single source of truth for all user queries
  users: {
    all: ["users"] as const,
    byId: (id: string) => ["user", id] as const,
    search: (term: string) => ["users", "search", term] as const,
  },

  // Communities
  communities: {
    all: ["communities"] as const,
    byId: (id: string) => ["community", id] as const,
    memberships: (communityId: string) =>
      ["community", communityId, "memberships"] as const,
    userMemberships: (userId: string) =>
      ["user", userId, "memberships"] as const,
  },

  // Resources
  resources: {
    all: ["resources"] as const,
    byId: (id: string) => ["resource", id] as const,
    byCommunity: (communityId: string) =>
      ["resources", "community", communityId] as const,
    byOwner: (ownerId: string) => ["resources", "owner", ownerId] as const,
    filtered: (filter: Record<string, any>) =>
      ["resources", "filtered", filter] as const,
  },

  // Events
  events: {
    all: ["events"] as const,
    byId: (id: string) => ["event", id] as const,
    byCommunity: (communityId: string) =>
      ["events", "community", communityId] as const,
    byOrganizer: (organizerId: string) =>
      ["events", "organizer", organizerId] as const,
    attendees: (eventId: string) => ["event", eventId, "attendees"] as const,
    userAttendances: (userId: string) =>
      ["user", userId, "attendances"] as const,
    filtered: (filter: Record<string, any>) =>
      ["events", "filtered", filter] as const,
  },

  // Thanks
  thanks: {
    all: ["thanks"] as const,
    byId: (id: string) => ["thanks", id] as const,
    byCommunity: (communityId: string) =>
      ["thanks", "community", communityId] as const,
    sentBy: (userId: string) => ["thanks", "sent", userId] as const,
    receivedBy: (userId: string) => ["thanks", "received", userId] as const,
    filtered: (filter: Record<string, any>) =>
      ["thanks", "filtered", filter] as const,
  },

  // Messaging queries
  messaging: {
    conversations: (userId: string) => ['conversations', userId] as const,
    messages: (conversationId: string) => ['messages', conversationId] as const,
  },
} as const;
