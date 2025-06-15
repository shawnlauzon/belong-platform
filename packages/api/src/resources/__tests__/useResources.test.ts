import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useResources, useResource } from '../hooks/useResources';
import { fetchResources, fetchResourceById } from '../impl/fetchResources';
import { createMockResource, createWrapper } from '../../test-utils';
import type { ResourceFilters } from '../types';

// Mock the implementation functions
vi.mock('../impl/fetchResources', () => ({
  fetchResources: vi.fn(),
  fetchResourceById: vi.fn(),
}));

describe('useResources', () => {
  const mockResources = [
    createMockResource({ id: '1', title: 'Resource 1' }),
    createMockResource({ id: '2', title: 'Resource 2' }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (fetchResources as any).mockResolvedValue(mockResources);
  });

  it('should fetch resources', async () => {
    // Arrange
    const wrapper = createWrapper();
    const { result } = renderHook(() => useResources(), {
      wrapper,
    });

    // Initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify the result
    expect(fetchResources).toHaveBeenCalledWith(undefined);
    expect(result.current.data).toEqual(mockResources);
  });

  it('should apply filters when provided', async () => {
    // Arrange
    const filters: ResourceFilters = { category: 'FOOD' }; 
    const wrapper = createWrapper();
    const { result } = renderHook(() => useResources(filters), {
      wrapper,
    });

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify the filters were passed to fetchResources
    expect(fetchResources).toHaveBeenCalledWith(filters);
  });

  it('should handle errors', async () => {
    // Arrange
    const error = new Error('Failed to fetch resources');
    (fetchResources as any).mockRejectedValueOnce(error);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useResources(), {
      wrapper,
    });

    // Wait for the error
    await waitFor(() => expect(result.current.isError).toBe(true));
    
    // Verify the error
    expect(result.current.error).toEqual(error);
  });
});

describe('useResource', () => {
  const mockResource = createMockResource({ id: '1', title: 'Test Resource' });

  beforeEach(() => {
    vi.clearAllMocks();
    (fetchResourceById as any).mockResolvedValue(mockResource);
  });

  it('should fetch a single resource by ID', async () => {
    // Arrange
    const { result } = renderHook(() => useResource('1'), {
      wrapper: createWrapper(),
    });

    // Initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify the result
    expect(fetchResourceById).toHaveBeenCalledWith('1');
    expect(result.current.data).toEqual(mockResource);
  });

  it('should not fetch if no ID is provided', async () => {
    // Arrange
    const { result } = renderHook(() => useResource(''), {
      wrapper: createWrapper(),
    });

    // The query should be disabled
    expect(result.current.isLoading).toBe(false);
    expect(result.current.status).toBe('pending');
    expect(fetchResourceById).not.toHaveBeenCalled();
  });

  it('should handle when resource is not found', async () => {
    // Arrange
    (fetchResourceById as any).mockResolvedValueOnce(null);
    
    const { result } = renderHook(() => useResource('non-existent-id'), {
      wrapper: createWrapper(),
    });

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    // Verify the result is null
    expect(result.current.data).toBeNull();
  });
});
