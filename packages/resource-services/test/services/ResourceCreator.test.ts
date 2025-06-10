import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceCreator } from '../../src/services/ResourceCreator';
import {
  createMockNewResource,
  createMockResource,
} from '../../test-utils/mockDomainData';
import { createMockDbResource } from '../../test-utils/mockDbData';

// First, create a simple mock for the core module
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  eventBus: {
    on: vi.fn(),
    emit: vi.fn(),
  },
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
  logApiCall: vi.fn(),
  logApiResponse: vi.fn(),
}));

// Now import the mocked modules
import { supabase, eventBus, Resource, Database } from '@belongnetwork/core';
import { faker } from '@faker-js/faker';

describe('ResourceCreator', () => {
  let mockResource: Resource;
  let mockDbResource: Database['public']['Tables']['resources']['Row'];

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock data for each test
    mockResource = createMockResource();
    mockDbResource = createMockDbResource({
      id: mockResource.id,
      creator_id: mockResource.owner.id,
      type: mockResource.type,
      category: mockResource.category,
      title: mockResource.title,
      description: mockResource.description,
      image_urls: mockResource.image_urls,
      pickup_instructions: mockResource.pickup_instructions,
      parking_info: mockResource.parking_info,
      meetup_flexibility: mockResource.meetup_flexibility,
      availability: mockResource.availability,
      is_active: true,
    });

    // Setup default mock implementation
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockDbResource, error: null }),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize event listeners', () => {
    ResourceCreator.initialize();
    expect(eventBus.on).toHaveBeenCalledWith(
      'resource.create.requested',
      expect.any(Function)
    );
  });

  it('should create a resource when receiving a create request event', async () => {
    // Arrange
    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: mockDbResource, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      }),
    } as any);

    // Arrange - Set up the mock event handler
    let eventHandler: any;
    vi.mocked(eventBus.on).mockImplementation((eventName, handler) => {
      if (eventName === 'resource.create.requested') {
        eventHandler = handler;
      }
      return () => {}; // Return a cleanup function
    });

    // Act - Simulate the event being emitted
    ResourceCreator.initialize();

    const mockNewResource = createMockNewResource();

    // Now call the event handler directly
    await eventBus.emit('resource.create.requested', mockNewResource);

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('resources');
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        creator_id: mockResource.owner.id,
        type: mockResource.type,
        category: mockResource.category,
        title: mockResource.title,
        is_active: true,
      }),
    ]);

    // Verify event was emitted with the created resource
    expect(eventBus.emit).toHaveBeenCalledWith(
      'resource.created',
      mockNewResource
    );
  });

  it('should handle errors during resource creation', async () => {
    // Arrange
    const mockError = new Error('Database error');
    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: mockError });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      }),
    } as any);

    // Arrange - Set up the mock event handler
    let eventHandler;
    vi.mocked(eventBus.on).mockImplementation((eventName, handler) => {
      if (eventName === 'resource.create.requested') {
        eventHandler = handler;
      }
      return () => {}; // Return a cleanup function
    });

    // Act - Simulate the event being emitted
    ResourceCreator.initialize();

    // Make sure the event handler was registered
    expect(eventBus.on).toHaveBeenCalledWith(
      'resource.create.requested',
      expect.any(Function)
    );

    // Now call the event handler directly
    await eventHandler({
      type: 'resource.create.requested',
      id: faker.string.uuid(),
      timestamp: Date.now(),
      source: 'user',
      data: mockResource,
    });

    // Assert
    expect(eventBus.emit).toHaveBeenCalledWith('resource.create.failed', {
      error: expect.stringContaining(
        'Failed to create resource: Database error'
      ),
    });
  });
});
