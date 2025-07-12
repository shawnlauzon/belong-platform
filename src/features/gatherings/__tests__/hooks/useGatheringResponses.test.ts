import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGatheringAttendees } from '../../hooks/useGatheringAttendees';
import { createTestWrapper } from '../../../../test-utils';
import { createFakeGatheringResponse } from '../../__fakes__';
import { createFakeUser } from '../../../users/__fakes__';
import type { GatheringResponse } from '../../types';

// Mock the API function
vi.mock('../../api', () => ({
  fetchGatheringAttendees: vi.fn(),
}));

import { fetchGatheringAttendees } from '../../api';
const mockFetchGatheringResponses = vi.mocked(fetchGatheringAttendees);

describe('useGatheringAttendees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch gathering attendees successfully', async () => {
    const gatheringId = 'test-gathering-id';
    const fakeUser1 = createFakeUser();
    const fakeUser2 = createFakeUser();

    const fakeAttendances: GatheringResponse[] = [
      createFakeGatheringResponse({
        gatheringId,
        userId: fakeUser1.id,
        status: 'attending',
      }),
      createFakeGatheringResponse({
        gatheringId,
        userId: fakeUser2.id,
        status: 'maybe',
      }),
    ];

    mockFetchGatheringResponses.mockResolvedValue(fakeAttendances);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useGatheringAttendees(gatheringId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(fakeAttendances);
    expect(mockFetchGatheringResponses).toHaveBeenCalledWith(
      expect.any(Object),
      gatheringId,
    );
  });

  it('should handle different attendance statuses', async () => {
    const gatheringId = 'test-gathering-id';
    const fakeUser1 = createFakeUser();
    const fakeUser2 = createFakeUser();
    const fakeUser3 = createFakeUser();

    const fakeAttendances: GatheringResponse[] = [
      createFakeGatheringResponse({
        gatheringId,
        userId: fakeUser1.id,
        status: 'attending',
      }),
      createFakeGatheringResponse({
        gatheringId,
        userId: fakeUser2.id,
        status: 'maybe',
      }),
      createFakeGatheringResponse({
        gatheringId,
        userId: fakeUser3.id,
        status: 'not_attending',
      }),
    ];

    mockFetchGatheringResponses.mockResolvedValue(fakeAttendances);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useGatheringAttendees(gatheringId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(fakeAttendances);
    expect(result.current.data).toHaveLength(3);
    expect(result.current.data?.[0].status).toBe('attending');
    expect(result.current.data?.[1].status).toBe('maybe');
    expect(result.current.data?.[2].status).toBe('not_attending');
  });

  it('should handle empty attendees list', async () => {
    const gatheringId = 'test-gathering-id';
    const fakeAttendances: GatheringResponse[] = [];

    mockFetchGatheringResponses.mockResolvedValue(fakeAttendances);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useGatheringAttendees(gatheringId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
    expect(mockFetchGatheringResponses).toHaveBeenCalledWith(
      expect.any(Object),
      gatheringId,
    );
  });

  it('should handle fetch errors', async () => {
    const gatheringId = 'test-gathering-id';
    const error = new Error('Failed to fetch gathering attendees');
    mockFetchGatheringResponses.mockRejectedValue(error);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useGatheringAttendees(gatheringId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should not fetch when gatheringId is empty', async () => {
    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useGatheringAttendees(''), { wrapper });

    // Should not call the API when gatheringId is empty
    expect(mockFetchGatheringResponses).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('should include user data in each attendance record', async () => {
    const gatheringId = 'test-gathering-id';
    const fakeUser = createFakeUser();

    const fakeAttendances: GatheringResponse[] = [
      createFakeGatheringResponse({
        gatheringId,
        userId: fakeUser.id,
        status: 'attending',
      }),
    ];

    mockFetchGatheringResponses.mockResolvedValue(fakeAttendances);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useGatheringAttendees(gatheringId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.[0].userId).toBe(fakeUser.id);
    expect(result.current.data?.[0].gatheringId).toBe(gatheringId);
    expect(result.current.data?.[0].status).toBe('attending');
  });
});
