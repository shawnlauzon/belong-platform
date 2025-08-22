import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createMockSupabase, createTestWrapper } from '../../../../test-utils';
import { useRenewResource } from '../useRenewResource';
import * as renewResourceApi from '../../api/renewResource';

vi.mock('../../api/renewResource');

describe('useRenewResource', () => {
  const mockSupabase = createMockSupabase();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call renewResource API when mutate is called', async () => {
    const mockRenewResource = vi.mocked(renewResourceApi.renewResource);
    mockRenewResource.mockResolvedValue();

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useRenewResource(mockSupabase), {
      wrapper,
    });

    const resourceId = 'resource-123';

    await act(async () => {
      result.current.mutate(resourceId);
    });

    expect(mockRenewResource).toHaveBeenCalledWith(mockSupabase, resourceId);
  });

  it('should invalidate queries on success', async () => {
    const mockRenewResource = vi.mocked(renewResourceApi.renewResource);
    mockRenewResource.mockResolvedValue();

    const { wrapper, queryClient } = createTestWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRenewResource(mockSupabase), {
      wrapper,
    });

    const resourceId = 'resource-123';

    await act(async () => {
      result.current.mutate(resourceId);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['resources'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['resource', resourceId] });
  });
});