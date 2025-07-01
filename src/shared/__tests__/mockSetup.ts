import { vi } from 'vitest';

/**
 * Sets up standard mocks for Supabase client and logger
 * Returns the mock objects for use in tests
 */
export function setupSupabaseMocks() {
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

  const mockMapbox = {
    autocomplete: vi.fn(),
    reverseGeocode: vi.fn(),
  };

  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return {
    mockSupabase,
    mockMapbox,
    mockLogger,
  };
}

/**
 * Creates a standard mock client object
 */
export function createMockClient() {
  const { mockSupabase, mockMapbox, mockLogger } = setupSupabaseMocks();
  
  return {
    supabase: mockSupabase as any,
    logger: mockLogger as any,
    mapbox: mockMapbox as any,
  };
}

/**
 * Standard mock for createBelongClient
 */
export function mockCreateBelongClient() {
  return vi.fn(() => createMockClient());
}

/**
 * Complete queryKeys mock that matches the real structure
 */
export const mockQueryKeys = {
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

  // Shoutouts
  shoutouts: {
    all: ["shoutouts"] as const,
    byId: (id: string) => ["shoutout", id] as const,
    byCommunity: (communityId: string) =>
      ["shoutouts", "community", communityId] as const,
    sentBy: (userId: string) => ["shoutouts", "sent", userId] as const,
    receivedBy: (userId: string) => ["shoutouts", "received", userId] as const,
    filtered: (filter: Record<string, any>) =>
      ["shoutouts", "filtered", filter] as const,
  },

  // Conversations
  conversations: {
    all: ["conversations"] as const,
    list: (userId: string) => ["conversations", "list", userId] as const,
    byId: (id: string) => ["conversation", id] as const,
    messages: (conversationId: string) => ["conversations", "messages", conversationId] as const,
    userList: (userId: string) => ["user", userId, "conversations"] as const,
  },
} as const;

/**
 * Standard shared module mock - provides useSupabase, logger, and queryKeys
 */
export function mockSharedModule() {
  const { mockLogger } = setupSupabaseMocks();
  
  return {
    useSupabase: vi.fn(),
    logger: mockLogger,
    queryKeys: mockQueryKeys,
  };
}

/**
 * Standard config module mock - provides createBelongClient and BelongProvider
 */
export function mockConfigModule() {
  const { mockLogger, mockSupabase, mockMapbox } = setupSupabaseMocks();
  
  const mockClient = {
    supabase: mockSupabase as any,
    logger: mockLogger as any,
    mapbox: mockMapbox as any,
  };

  const mockBelongProvider = ({ children, config }: any) => children;

  return {
    createBelongClient: vi.fn(() => mockClient),
    logger: mockLogger,
    BelongProvider: mockBelongProvider,
  };
}

/**
 * Standard module mocks for tests that use BelongProvider
 * Returns the mock functions for setup in beforeEach
 */
export function setupStandardMocks() {
  return {
    mockSharedModule: mockSharedModule(),
    mockConfigModule: mockConfigModule(),
  };
}

/**
 * Pre-built shared module mock that can be used directly in vi.mock() calls
 * This avoids hoisting issues with vitest
 */
export const SHARED_MODULE_MOCK = {
  useSupabase: vi.fn(),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  queryKeys: {
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

    // Shoutouts
    shoutouts: {
      all: ["shoutouts"] as const,
      byId: (id: string) => ["shoutout", id] as const,
      byCommunity: (communityId: string) =>
        ["shoutouts", "community", communityId] as const,
      sentBy: (userId: string) => ["shoutouts", "sent", userId] as const,
      receivedBy: (userId: string) => ["shoutouts", "received", userId] as const,
      filtered: (filter: Record<string, any>) =>
        ["shoutouts", "filtered", filter] as const,
    },

    // Conversations
    conversations: {
      all: ["conversations"] as const,
      list: (userId: string) => ["conversations", "list", userId] as const,
      byId: (id: string) => ["conversation", id] as const,
      messages: (conversationId: string) => ["conversations", "messages", conversationId] as const,
      userList: (userId: string) => ["user", userId, "conversations"] as const,
    },
  } as const,
};

/**
 * Pre-built config module mock that can be used directly in vi.mock() calls
 * This avoids hoisting issues with vitest
 * NOTE: Does NOT mock BelongProvider - tests should use the real component
 */
export const CONFIG_MODULE_MOCK = {
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
 * Creates a proper vitest mock function
 */
export function createMockFunction() {
  return vi.fn();
}
