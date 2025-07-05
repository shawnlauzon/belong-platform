import { vi } from 'vitest';
import { createMockSupabase } from './src/test-utils/supabase-mocks';

// Suppress console output during tests unless VITEST_VERBOSE is set
if (process.env.VITEST_VERBOSE !== 'true') {
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

// Global mocks for commonly mocked modules
// This eliminates repetitive mock setup across test files

// Mock shared module - used in 33+ test files
vi.mock('./src/shared', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual, // Keep all real exports including toRecords
    // Override only specific functions that need mocking
    useSupabase: vi.fn().mockReturnValue(createMockSupabase()),
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    // FIXME I'm pretty sure the tests should not be using the queryKeys from the shared mocking module
    // TODO Extract shared queryKeys to each feature and then we can mock as the features below
    queryKeys: {
      // Authentication state (not profile data)
      auth: ['auth'] as const,

      // User profile data - single source of truth for all user queries
      users: {
        all: ['users'] as const,
        byId: (id: string) => ['user', id] as const,
        search: (term: string) => ['users', 'search', term] as const,
        filtered: (filter: Record<string, any>) =>
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
        filtered: (filter: Record<string, any>) =>
          ['communities', 'filtered', filter] as const,
      },

      // Resources
      resources: {
        all: ['resources'] as const,
        byId: (id: string) => ['resource', id] as const,
        byCommunity: (communityId: string) =>
          ['resources', 'community', communityId] as const,
        byOwner: (ownerId: string) => ['resources', 'owner', ownerId] as const,
        filtered: (filter: Record<string, any>) =>
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
        attendees: (eventId: string) =>
          ['event', eventId, 'attendees'] as const,
        userAttendances: (userId: string) =>
          ['user', userId, 'attendances'] as const,
        filtered: (filter: Record<string, any>) =>
          ['events', 'filtered', filter] as const,
      },

      // Shoutouts
      shoutouts: {
        all: ['shoutouts'] as const,
        byId: (id: string) => ['shoutout', id] as const,
        byCommunity: (communityId: string) =>
          ['shoutouts', 'community', communityId] as const,
        sentBy: (userId: string) => ['shoutouts', 'sent', userId] as const,
        receivedBy: (userId: string) =>
          ['shoutouts', 'received', userId] as const,
        filtered: (filter: Record<string, any>) =>
          ['shoutouts', 'filtered', filter] as const,
      },

      // Conversations
      conversations: {
        all: ['conversations'] as const,
        list: (userId: string) => ['conversations', 'list', userId] as const,
        byId: (id: string) => ['conversation', id] as const,
        messages: (conversationId: string) =>
          ['conversations', 'messages', conversationId] as const,
        userList: (userId: string) =>
          ['user', userId, 'conversations'] as const,
      },
    } as const,
    STANDARD_CACHE_TIME: 5000,
  };
});

// Mock config/client module - used in 7+ test files
vi.mock('./src/config/client', () => ({
  createBelongClient: vi.fn(() => ({
    supabase: {
      from: vi.fn(),
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        })),
      },
    },
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    mapbox: {
      autocomplete: vi.fn(),
      reverseGeocode: vi.fn(),
    },
  })),
}));

// Mock feature modules - used across many test files
// Use partial mocks to preserve real types while mocking only the hooks

// Mock users feature hooks
vi.mock('./src/features/users', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual, // Keep all real exports (types, etc.)
    // Override only the hooks
    useUsers: vi.fn(),
    useUser: vi.fn(),
    useCreateUser: vi.fn(),
    useUpdateUser: vi.fn(),
    useDeleteUser: vi.fn(),
  };
});

// Mock communities feature hooks
vi.mock('./src/features/communities', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual, // Keep all real exports (types, etc.)
    // Override only the hooks
    useCommunities: vi.fn(),
    useCommunity: vi.fn(),
    useCommunityMembers: vi.fn(),
    useUserCommunities: vi.fn(),
    useCreateCommunity: vi.fn(),
    useUpdateCommunity: vi.fn(),
    useDeleteCommunity: vi.fn(),
    useJoinCommunity: vi.fn(),
    useLeaveCommunity: vi.fn(),
  };
});

// Mock auth feature hooks
vi.mock('./src/features/auth', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual, // Keep all real exports (types, etc.)
    // Override only the hooks
    useCurrentUser: vi.fn(),
    useSignIn: vi.fn(),
    useSignOut: vi.fn(),
    useSignUp: vi.fn(),
    useUpdateProfile: vi.fn(),
  };
});

// Mock events feature hooks
vi.mock('./src/features/events', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual, // Keep all real exports (types, etc.)
    // Override only the hooks
    useEvents: vi.fn(),
    useEvent: vi.fn(),
    useCreateEvent: vi.fn(),
    useUpdateEvent: vi.fn(),
    useDeleteEvent: vi.fn(),
    useJoinEvent: vi.fn(),
    useLeaveEvent: vi.fn(),
  };
});

// Mock resources feature hooks
vi.mock('./src/features/resources', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual, // Keep all real exports (types, etc.)
    // Override only the hooks
    useResources: vi.fn(),
    useResource: vi.fn(),
    useCreateResource: vi.fn(),
    useUpdateResource: vi.fn(),
    useDeleteResource: vi.fn(),
  };
});

// Mock shoutouts feature hooks
vi.mock('./src/features/shoutouts', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual, // Keep all real exports (types, etc.)
    // Override only the hooks
    useShoutouts: vi.fn(),
    useShoutout: vi.fn(),
    useCreateShoutout: vi.fn(),
    useUpdateShoutout: vi.fn(),
    useDeleteShoutout: vi.fn(),
  };
});

// Mock conversations feature hooks
vi.mock('./src/features/conversations', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual, // Keep all real exports (types, etc.)
    // Override only the hooks
    useConversations: vi.fn(),
    useMessages: vi.fn(),
    useSendMessage: vi.fn(),
    useMarkAsRead: vi.fn(),
    useMessaging: vi.fn(),
  };
});
