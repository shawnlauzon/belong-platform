import { vi } from 'vitest';
import { faker } from '@faker-js/faker';
import { setupSupabaseMocks } from './mockSetup';
import { createGetBelongClientMock } from './getBelongClientMock';
import { 
  createMockUser, 
  createMockCommunity, 
  createMockDbResource,
  createMockEvent,
  createMockDbCommunity 
} from './mocks';
import { ResourceCategory } from '@belongnetwork/types';
import * as core from '@belongnetwork/core';

/**
 * Shared utilities for CRUD testing across Resources, Events, and Communities
 */

export interface CrudTestMocks {
  mockSupabase: any;
  mockMapbox: any;
  mockLogger: any;
  mockBelongClient: any;
}

/**
 * Sets up fresh mocks for each test
 */
export function setupCrudTestMocks(): CrudTestMocks {
  const mocks = setupSupabaseMocks();
  
  // Set up getBelongClient mock
  const { getBelongClient, mockLogger } = createGetBelongClientMock(mocks.mockSupabase);
  const mockBelongClient = { supabase: mocks.mockSupabase, mapbox: {} as any };
  
  // Mock the createBelongClient function globally  
  vi.mocked(core.createBelongClient).mockImplementation(() => mockBelongClient as any);
  
  return {
    mockSupabase: mocks.mockSupabase,
    mockMapbox: mocks.mockMapbox,
    mockLogger,
    mockBelongClient,
  };
}

// Authentication Helpers

/**
 * Mock an authenticated user state
 */
export function mockAuthenticatedUser(mockSupabase: any, userId: string) {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
}

/**
 * Mock an unauthenticated user state
 */
export function mockUnauthenticatedUser(mockSupabase: any) {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
}

// Membership Helpers

/**
 * Mock a user being a member of a community
 */
export function mockCommunityMember(mockSupabase: any, userId: string, communityId: string) {
  const mockMembership = {
    id: faker.string.uuid(),
    user_id: userId,
    community_id: communityId,
    role: 'member',
    joined_at: new Date().toISOString(),
  };

  // Mock the membership check query
  const mockMembershipQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: mockMembership,
      error: null,
    }),
  };

  // Set up the query chain for membership checks
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'community_memberships') {
      return mockMembershipQuery;
    }
    // Return default mock for other tables
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
  });
}

/**
 * Mock a user NOT being a member of a community
 */
export function mockNonCommunityMember(mockSupabase: any, userId: string, communityId: string) {
  const mockMembershipQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' }, // Not found
    }),
  };

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'community_memberships') {
      return mockMembershipQuery;
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
  });
}

// Ownership Helpers

/**
 * Mock a user being the owner of a resource
 */
export function mockResourceOwner(mockSupabase: any, userId: string, resourceId: string) {
  const mockOwnershipQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { owner_id: userId },
      error: null,
    }),
  };

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'resources') {
      return mockOwnershipQuery;
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
  });
}

/**
 * Mock a user NOT being the owner of a resource
 */
export function mockNonResourceOwner(mockSupabase: any, userId: string, resourceId: string, actualOwnerId: string) {
  const mockOwnershipQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { owner_id: actualOwnerId },
      error: null,
    }),
  };

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'resources') {
      return mockOwnershipQuery;
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
  });
}

/**
 * Mock a user being the organizer of an event
 */
export function mockEventOrganizer(mockSupabase: any, userId: string, eventId: string) {
  const mockOrganizerQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { organizer_id: userId },
      error: null,
    }),
  };

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'events') {
      return mockOrganizerQuery;
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
  });
}

/**
 * Mock a user being the organizer of a community
 */
export function mockCommunityOrganizer(mockSupabase: any, userId: string, communityId: string) {
  const mockOrganizerQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { organizer_id: userId },
      error: null,
    }),
  };

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'communities') {
      return mockOrganizerQuery;
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
  });
}

// Data Generation Helpers

/**
 * Generate test resource data
 */
export function generateTestResource(overrides: any = {}) {
  const communityId = overrides.communityId || faker.string.uuid();
  
  return {
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    category: ResourceCategory.FOOD,
    type: 'offer' as const,
    communityId,
    isActive: true,
    ...overrides,
  };
}

/**
 * Generate test event data
 */
export function generateTestEvent(overrides: any = {}) {
  const communityId = overrides.communityId || faker.string.uuid();
  const startDateTime = overrides.startDateTime || overrides.startDate || faker.date.future();
  const endDateTime = overrides.endDateTime || overrides.endDate || new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
  
  return {
    title: faker.lorem.words(3),
    description: faker.lorem.paragraph(),
    organizerId: overrides.organizerId || TEST_USER_ID,
    communityId,
    startDateTime,
    endDateTime,
    coordinates: overrides.coordinates || { lat: faker.location.latitude(), lng: faker.location.longitude() },
    location: faker.location.streetAddress(),
    isActive: true,
    ...overrides,
  };
}

/**
 * Generate test community data
 */
export function generateTestCommunity(overrides: any = {}) {
  return {
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    organizerId: overrides.organizerId || TEST_USER_ID,
    level: overrides.level || 'city',
    hierarchyPath: overrides.hierarchyPath || [],
    timeZone: overrides.timeZone || 'UTC',
    ...overrides,
  };
}

// Mock Database Operations

/**
 * Mock successful database insert operation
 */
export function mockSuccessfulInsert(mockSupabase: any, tableName: string, returnData: any) {
  const mockQuery = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: returnData,
      error: null,
    }),
  };

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === tableName) {
      return mockQuery;
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
  });
}

/**
 * Mock successful database update operation
 */
export function mockSuccessfulUpdate(mockSupabase: any, tableName: string, returnData: any) {
  const mockQuery = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: returnData,
      error: null,
    }),
  };

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === tableName) {
      return mockQuery;
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
  });
}

/**
 * Mock successful database select operation
 */
export function mockSuccessfulSelect(mockSupabase: any, tableName: string, returnData: any, isSingle = false) {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  if (isSingle) {
    mockQuery.single.mockResolvedValue({
      data: returnData,
      error: null,
    });
  } else {
    mockQuery.order.mockResolvedValue({
      data: returnData,
      error: null,
    });
  }

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === tableName) {
      return mockQuery;
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
  });
}

/**
 * Mock successful database delete operation (for hard deletes with multiple eq clauses)
 */
export function mockSuccessfulDelete(mockSupabase: any, tableName: string, error: any = null) {
  const mockQuery = {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn(),
  };

  // First eq call returns this, second eq call resolves with result
  mockQuery.eq
    .mockReturnValueOnce(mockQuery) // First .eq() call returns this
    .mockResolvedValueOnce({ error }); // Second .eq() call returns final result

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === tableName) {
      return mockQuery;
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
  });
}

/**
 * Mock successful database delete operation (for single eq clause deletes)
 */
export function mockSingleEqDelete(mockSupabase: any, tableName: string, error: any = null) {
  const mockQuery = {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error }),
  };

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === tableName) {
      return mockQuery;
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
  });
}

/**
 * Mock successful database soft delete operation (update to set is_active = false)
 */
export function mockSoftDelete(mockSupabase: any, tableName: string, userId: string, error: any = null) {
  const mockAuthQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { organizer_id: userId, is_active: true },
      error: null,
    }),
  };

  const mockUpdateQuery = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error }),
  };

  let callCount = 0;
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === tableName) {
      callCount++;
      // First call is for authorization check, second is for update
      if (callCount === 1) {
        return mockAuthQuery;
      } else {
        return mockUpdateQuery;
      }
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
  });
}

// Common Test Data

export const TEST_USER_ID = 'test-user-123';
export const TEST_COMMUNITY_ID = 'test-community-123';
export const TEST_RESOURCE_ID = 'test-resource-123';
export const TEST_EVENT_ID = 'test-event-123';
export const DIFFERENT_USER_ID = 'different-user-456';