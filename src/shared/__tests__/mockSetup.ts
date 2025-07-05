import { vi } from 'vitest';

/**
 * Sets up standard fakes for Supabase client and logger
 * Returns the fake objects for use in tests
 */
export function setupSupabaseFakes() {
  const mockSupabase = {
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
  };

  const fakeMapbox = {
    autocomplete: vi.fn(),
    reverseGeocode: vi.fn(),
  };

  const fakeLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return {
    mockSupabase,
    fakeMapbox,
    fakeLogger,
  };
}

/**
 * Creates a standard fake client object
 */
export function createFakeClient() {
  const { mockSupabase, fakeMapbox, fakeLogger } = setupSupabaseFakes();

  return {
    supabase: mockSupabase as any,
    logger: fakeLogger as any,
    mapbox: fakeMapbox as any,
  };
}

/**
 * Standard fake for createBelongClient
 */
export function fakeCreateBelongClient() {
  return vi.fn(() => createFakeClient());
}

/**
 * Complete queryKeys fake that matches the real structure
 */
export const fakeQueryKeys = {
  // Authentication state (not profile data)
  auth: ['auth'] as const,

  // User profile data - single source of truth for all user queries
  users: {
    all: ['users'] as const,
    byId: (id: string) => ['user', id] as const,
    search: (term: string) => ['users', 'search', term] as const,
  },

  // Communities
  communities: {
    all: ['communities'] as const,
    byId: (id: string) => ['community', id] as const,
    memberships: (communityId: string) =>
      ['community', communityId, 'memberships'] as const,
    userMemberships: (userId: string) =>
      ['user', userId, 'memberships'] as const,
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
    attendees: (eventId: string) => ['event', eventId, 'attendees'] as const,
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
    receivedBy: (userId: string) => ['shoutouts', 'received', userId] as const,
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
    userList: (userId: string) => ['user', userId, 'conversations'] as const,
  },
} as const;

/**
 * Standard shared module fake - provides useSupabase, logger, and queryKeys
 */
export function fakeSharedModule() {
  const { fakeLogger } = setupSupabaseFakes();

  return {
    useSupabase: vi.fn(),
    logger: fakeLogger,
    queryKeys: fakeQueryKeys,
  };
}

/**
 * Standard config module fake - provides createBelongClient and BelongProvider
 */
export function fakeConfigModule() {
  const { fakeLogger, mockSupabase, fakeMapbox } = setupSupabaseFakes();

  const mockClient = {
    supabase: mockSupabase as any,
    logger: fakeLogger as any,
    mapbox: fakeMapbox as any,
  };

  const fakeBelongProvider = ({ children, config }: any) => children;

  return {
    createBelongClient: vi.fn(() => mockClient),
    logger: fakeLogger,
    BelongProvider: fakeBelongProvider,
  };
}

/**
 * Standard module fakes for tests that use BelongProvider
 * Returns the fake functions for setup in beforeEach
 */
export function setupStandardFakes() {
  return {
    fakeSharedModule: fakeSharedModule(),
    fakeConfigModule: fakeConfigModule(),
  };
}

/**
 * Pre-built shared module fake that can be used directly in vi.mock() calls
 * This avoids hoisting issues with vitest
 */
export const SHARED_MODULE_FAKE = {
  useSupabase: vi.fn(),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  queryKeys: {
    // Authentication state (not profile data)
    auth: ['auth'] as const,

    // User profile data - single source of truth for all user queries
    users: {
      all: ['users'] as const,
      byId: (id: string) => ['user', id] as const,
      search: (term: string) => ['users', 'search', term] as const,
    },

    // Communities
    communities: {
      all: ['communities'] as const,
      byId: (id: string) => ['community', id] as const,
      memberships: (communityId: string) =>
        ['community', communityId, 'memberships'] as const,
      userMemberships: (userId: string) =>
        ['user', userId, 'memberships'] as const,
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
      attendees: (eventId: string) => ['event', eventId, 'attendees'] as const,
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
      userList: (userId: string) => ['user', userId, 'conversations'] as const,
    },
  } as const,
};

/**
 * Pre-built config module fake that can be used directly in vi.mock() calls
 * This avoids hoisting issues with vitest
 * NOTE: Does NOT fake BelongProvider - tests should use the real component
 */
export const CONFIG_MODULE_FAKE = {
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
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
};

/**
 * Creates a proper vitest fake function
 */
export function createFakeFunction() {
  return vi.fn();
}
