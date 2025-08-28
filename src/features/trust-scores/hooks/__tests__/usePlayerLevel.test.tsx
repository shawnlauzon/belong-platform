import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlayerLevel, type UsePlayerLevelResult } from '../usePlayerLevel';
import { createFakeTrustScore } from '../../__fakes__';
import { createTestWrapper } from '@/test-utils/testWrapper';
import type { TrustScore } from '../../types';

// Mock the useTrustScores hook
vi.mock('../useTrustScores', () => ({
  useTrustScores: vi.fn(),
}));

import { useTrustScores } from '../useTrustScores';

describe('usePlayerLevel', () => {
  const mockUserId = 'user-123';
  const mockCommunityId = 'community-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate level from single community score', () => {
    const mockTrustScore: TrustScore = {
      ...createFakeTrustScore(),
      userId: mockUserId,
      communityId: mockCommunityId,
      score: 150,
    };

    vi.mocked(useTrustScores).mockReturnValue({
      data: [mockTrustScore],
      isPending: false,
      isError: false,
      error: null,
    } as any);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(
      () => usePlayerLevel(mockUserId, mockCommunityId),
      { wrapper }
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.currentLevel.name).toBe('Shrimp');
    expect(result.current.data?.currentLevel.emoji).toBe('🦐');
    expect(result.current.data?.currentScore).toBe(150);
    expect(result.current.data?.progress).toBe(50);
    expect(result.current.data?.pointsToNext).toBe(50);
  });

  it('should calculate level from total of all community scores', () => {
    const mockTrustScores: TrustScore[] = [
      { ...createFakeTrustScore(), userId: mockUserId, communityId: 'community-1', score: 500 },
      { ...createFakeTrustScore(), userId: mockUserId, communityId: 'community-2', score: 300 },
      { ...createFakeTrustScore(), userId: mockUserId, communityId: 'community-3', score: 200 },
    ];

    vi.mocked(useTrustScores).mockReturnValue({
      data: mockTrustScores,
      isPending: false,
      isError: false,
      error: null,
    } as any);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(
      () => usePlayerLevel(mockUserId),
      { wrapper }
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.currentScore).toBe(1000);
    expect(result.current.data?.currentLevel.name).toBe('Jellyfish');
    expect(result.current.data?.currentLevel.emoji).toBe('🪼');
  });

  it('should return Plankton level for user with no scores', () => {
    vi.mocked(useTrustScores).mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
    } as any);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(
      () => usePlayerLevel(mockUserId),
      { wrapper }
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.currentScore).toBe(0);
    expect(result.current.data?.currentLevel.name).toBe('Plankton');
    expect(result.current.data?.currentLevel.emoji).toBe('🦠');
  });

  it('should return Plankton for community with 0 score', () => {
    const mockTrustScore: TrustScore = {
      ...createFakeTrustScore(),
      userId: mockUserId,
      communityId: mockCommunityId,
      score: 0,
    };

    vi.mocked(useTrustScores).mockReturnValue({
      data: [mockTrustScore],
      isPending: false,
      isError: false,
      error: null,
    } as any);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(
      () => usePlayerLevel(mockUserId, mockCommunityId),
      { wrapper }
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.currentLevel.name).toBe('Plankton');
    expect(result.current.data?.pointsToNext).toBe(50);
  });

  it('should handle loading state', () => {
    vi.mocked(useTrustScores).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
    } as any);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(
      () => usePlayerLevel(mockUserId),
      { wrapper }
    );

    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('should handle error state', () => {
    const mockError = new Error('Failed to fetch trust scores');

    vi.mocked(useTrustScores).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: mockError,
    } as any);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(
      () => usePlayerLevel(mockUserId),
      { wrapper }
    );

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
    expect(result.current.data).toBeNull();
  });

  it('should handle max level (Whale)', () => {
    const mockTrustScore: TrustScore = {
      ...createFakeTrustScore(),
      userId: mockUserId,
      communityId: mockCommunityId,
      score: 40000,
    };

    vi.mocked(useTrustScores).mockReturnValue({
      data: [mockTrustScore],
      isPending: false,
      isError: false,
      error: null,
    } as any);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(
      () => usePlayerLevel(mockUserId, mockCommunityId),
      { wrapper }
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.currentLevel.name).toBe('Whale');
    expect(result.current.data?.currentLevel.emoji).toBe('🐋');
    expect(result.current.data?.nextLevel).toBeUndefined();
    expect(result.current.data?.progress).toBe(100);
    expect(result.current.data?.pointsToNext).toBe(0);
  });

  it('should return 0 score for unknown community', () => {
    const mockTrustScore: TrustScore = {
      ...createFakeTrustScore(),
      userId: mockUserId,
      communityId: 'different-community',
      score: 1000,
    };

    vi.mocked(useTrustScores).mockReturnValue({
      data: [mockTrustScore],
      isPending: false,
      isError: false,
      error: null,
    } as any);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(
      () => usePlayerLevel(mockUserId, 'unknown-community'),
      { wrapper }
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.currentScore).toBe(0);
    expect(result.current.data?.currentLevel.name).toBe('Plankton');
  });

  it('should correctly calculate progress for different levels', () => {
    const testCases = [
      { score: 50, expectedLevel: 'Hermit Crab', expectedProgress: 0 },
      { score: 75, expectedLevel: 'Hermit Crab', expectedProgress: 50 },
      { score: 100, expectedLevel: 'Shrimp', expectedProgress: 0 },
      { score: 1000, expectedLevel: 'Jellyfish', expectedProgress: 0 },
      { score: 1250, expectedLevel: 'Jellyfish', expectedProgress: 50 },
    ];

    testCases.forEach(({ score, expectedLevel, expectedProgress }) => {
      vi.mocked(useTrustScores).mockReturnValue({
        data: [{
          ...createFakeTrustScore(),
          userId: mockUserId,
          communityId: mockCommunityId,
          score,
        }],
        isPending: false,
        isError: false,
        error: null,
      } as any);

      const { wrapper } = createTestWrapper();
      const { result } = renderHook(
        () => usePlayerLevel(mockUserId, mockCommunityId),
        { wrapper }
      );

      expect(result.current.data?.currentLevel.name).toBe(expectedLevel);
      expect(result.current.data?.progress).toBe(expectedProgress);
    });
  });
});