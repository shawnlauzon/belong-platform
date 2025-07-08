import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUpdateEvent } from '../../hooks/useUpdateEvent';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeEventInfo } from '../../__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';
import { faker } from '@faker-js/faker';

// Mock the API
vi.mock('../../api', () => ({
  updateEvent: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { updateEvent } from '../../api';
import { EventData } from '../../types';

const mockUseSupabase = vi.mocked(useSupabase);
const mockUpdateEvent = vi.mocked(updateEvent);

describe('useUpdateEvent', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase({});
    mockUseSupabase.mockReturnValue(mockSupabase);
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return EventInfo after update with new parameter structure', async () => {
    // Arrange: Create test data using factories
    const mockUpdatedEventInfo = createFakeEventInfo();
    const updateData: Partial<EventData> & { id: string } = {
      id: mockUpdatedEventInfo.id,
      title: faker.lorem.words(3),
      description: faker.lorem.paragraph(),
    };

    mockUpdateEvent.mockResolvedValue(mockUpdatedEventInfo);

    // Act
    const { result } = renderHook(() => useUpdateEvent(), { wrapper });
    const updatedEventInfo = await result.current.mutateAsync(updateData);

    // Assert: Should return EventInfo with ID references
    expect(updatedEventInfo).toBeDefined();
    expect(updatedEventInfo).toEqual(mockUpdatedEventInfo);

    // Should have ID references (EventInfo pattern)
    expect(updatedEventInfo).toHaveProperty('organizerId');
    expect(updatedEventInfo).toHaveProperty('communityId');

    // Should NOT have composed objects (these are only in Event type)
    expect(updatedEventInfo).not.toHaveProperty('organizer');
    expect(updatedEventInfo).not.toHaveProperty('community');

    // Verify API was called with correct parameters (new single parameter structure)
    expect(mockUpdateEvent).toHaveBeenCalledWith(mockSupabase, updateData);
  });
});