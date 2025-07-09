/**
 * Standardized query keys for all platform entities
 * This prevents cache inconsistency by using a single source of truth
 */
export const queryKeys = {
  // Authentication state (not profile data)
  auth: ['auth'] as const,

  // User profile data - single source of truth for all user queries
  users: {
    all: ['users'] as const,
    byId: (id: string | null) => ['user', id] as const,
    search: (term: string) => ['users', 'search', term] as const,
    filtered: (filter: Record<string, unknown>) =>
      ['users', 'filtered', filter] as const,
  },

  // Communities
  communities: {
    all: ['communities'] as const,
    byId: (id: string) => ['community', id] as const,
    memberships: (communityId: string) =>
      ['community', communityId, 'memberships'] as const,
    userMemberships: (userId: string) =>
      ['user', userId, 'memberships'] as const,
    filtered: (filter: Record<string, unknown>) =>
      ['communities', 'filtered', filter] as const,
  },

  // Resources
  resources: {
    all: ['resources'] as const,
    byId: (id: string) => ['resource', id] as const,
    byCommunity: (communityId: string) =>
      ['resources', 'community', communityId] as const,
    byOwner: (ownerId: string) => ['resources', 'owner', ownerId] as const,
    filtered: (filter: Record<string, unknown>) =>
      ['resources', 'filtered', filter] as const,
  },

  // Events
  events: {
    all: ['events'] as const,
    byId: (id: string) => ['event', id] as const,
    byCommunity: (communityId: string) =>
      ['events', 'community', communityId] as const,
    byOrganizer: (organizerId: string) =>
      ['events', 'organizer', organizerId] as const,
    attendees: (eventId: string) => ['event', eventId, 'attendees'] as const,
    userAttendances: (userId: string) =>
      ['user', userId, 'attendances'] as const,
    filtered: (filter: Record<string, unknown>) =>
      ['events', 'filtered', filter] as const,
  },

  // Shoutouts
  shoutouts: {
    all: ['shoutouts'] as const,
    byId: (id: string) => ['shoutout', id] as const,
    byCommunity: (communityId: string) =>
      ['shoutouts', 'community', communityId] as const,
    sentBy: (userId: string) => ['shoutouts', 'sent', userId] as const,
    receivedBy: (userId: string) => ['shoutouts', 'received', userId] as const,
    filtered: (filter: Record<string, unknown>) =>
      ['shoutouts', 'filtered', filter] as const,
  },

  // Conversations
  conversations: {
    all: ['conversations'] as const,
    list: (userId: string) => ['conversations', 'list', userId] as const,
    byId: (id: string) => ['conversation', id] as const,
    messages: (conversationId: string) =>
      ['conversations', 'messages', conversationId] as const,
    userList: (userId: string) => ['user', userId, 'conversations'] as const,
  },

  // Feed
  feed: {
    all: ['feed'] as const,
  },
} as const;
