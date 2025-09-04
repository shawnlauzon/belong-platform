import { describe, it, expect } from 'vitest';
import { trustScoreLogTransformer } from '../trustScoreLogTransformer';
import type { TrustScoreLogRow } from '../../api/fetchTrustScoreLogs';

describe('trustScoreLogTransformer', () => {
  it('should transform a complete trust score log row', () => {
    const row: TrustScoreLogRow = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '456e7890-e89b-12d3-a456-426614174001',
      community_id: '789e0123-e89b-12d3-a456-426614174002',
      action_type: 'COMMUNITY_JOIN',
      action_id: 'abc12345-e89b-12d3-a456-426614174003',
      points_change: 50,
      score_before: 100,
      score_after: 150,
      metadata: { source: 'community_join', communityName: 'Test Community' },
      created_at: '2023-12-01T12:00:00Z',
    };

    const result = trustScoreLogTransformer(row);

    expect(result).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '456e7890-e89b-12d3-a456-426614174001',
      communityId: '789e0123-e89b-12d3-a456-426614174002',
      actionType: 'COMMUNITY_JOIN',
      actionId: 'abc12345-e89b-12d3-a456-426614174003',
      pointsChange: 50,
      scoreBefore: 100,
      scoreAfter: 150,
      metadata: { source: 'community_join', communityName: 'Test Community' },
      createdAt: new Date('2023-12-01T12:00:00Z'),
      updatedAt: new Date('2023-12-01T12:00:00Z'),
    });
  });

  it('should handle null action_id and metadata', () => {
    const row: TrustScoreLogRow = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '456e7890-e89b-12d3-a456-426614174001',
      community_id: '789e0123-e89b-12d3-a456-426614174002',
      action_type: 'SHOUTOUT_RECEIVED',
      action_id: null,
      points_change: 100,
      score_before: 200,
      score_after: 300,
      metadata: null,
      created_at: '2023-12-01T15:30:00Z',
    };

    const result = trustScoreLogTransformer(row);

    expect(result).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '456e7890-e89b-12d3-a456-426614174001',
      communityId: '789e0123-e89b-12d3-a456-426614174002',
      actionType: 'SHOUTOUT_RECEIVED',
      actionId: undefined,
      pointsChange: 100,
      scoreBefore: 200,
      scoreAfter: 300,
      metadata: undefined,
      createdAt: new Date('2023-12-01T15:30:00Z'),
      updatedAt: new Date('2023-12-01T15:30:00Z'),
    });
  });

  it('should handle negative points change', () => {
    const row: TrustScoreLogRow = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '456e7890-e89b-12d3-a456-426614174001',
      community_id: '789e0123-e89b-12d3-a456-426614174002',
      action_type: 'POINTS_ADJUSTMENT',
      action_id: null,
      points_change: -25,
      score_before: 150,
      score_after: 125,
      metadata: { reason: 'admin_adjustment' },
      created_at: '2023-12-01T18:00:00Z',
    };

    const result = trustScoreLogTransformer(row);

    expect(result.pointsChange).toBe(-25);
    expect(result.scoreBefore).toBe(150);
    expect(result.scoreAfter).toBe(125);
    expect(result.updatedAt).toEqual(result.createdAt);
  });

  it('should correctly parse ISO date string', () => {
    const row: TrustScoreLogRow = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '456e7890-e89b-12d3-a456-426614174001',
      community_id: '789e0123-e89b-12d3-a456-426614174002',
      action_type: 'RESOURCE_OFFER',
      action_id: 'def45678-e89b-12d3-a456-426614174004',
      points_change: 50,
      score_before: 0,
      score_after: 50,
      metadata: null,
      created_at: '2023-12-01T10:30:45.123Z',
    };

    const result = trustScoreLogTransformer(row);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.toISOString()).toBe('2023-12-01T10:30:45.123Z');
    expect(result.updatedAt).toEqual(result.createdAt);
  });

  it('should handle empty metadata object', () => {
    const row: TrustScoreLogRow = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '456e7890-e89b-12d3-a456-426614174001',
      community_id: '789e0123-e89b-12d3-a456-426614174002',
      action_type: 'EVENT_ATTENDED',
      action_id: 'ghi78901-e89b-12d3-a456-426614174005',
      points_change: 50,
      score_before: 250,
      score_after: 300,
      metadata: {},
      created_at: '2023-12-01T20:00:00Z',
    };

    const result = trustScoreLogTransformer(row);

    expect(result.metadata).toEqual({});
    expect(result.updatedAt).toEqual(result.createdAt);
  });

  it('should throw error for null user_id', () => {
    const row: TrustScoreLogRow = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: null,
      community_id: '789e0123-e89b-12d3-a456-426614174002',
      action_type: 'COMMUNITY_JOIN',
      action_id: null,
      points_change: 50,
      score_before: 0,
      score_after: 50,
      metadata: null,
      created_at: '2023-12-01T12:00:00Z',
    };

    expect(() => trustScoreLogTransformer(row)).toThrow('Trust score log is missing required user_id, community_id, or created_at');
  });

  it('should throw error for null community_id', () => {
    const row: TrustScoreLogRow = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '456e7890-e89b-12d3-a456-426614174001',
      community_id: null,
      action_type: 'COMMUNITY_JOIN',
      action_id: null,
      points_change: 50,
      score_before: 0,
      score_after: 50,
      metadata: null,
      created_at: '2023-12-01T12:00:00Z',
    };

    expect(() => trustScoreLogTransformer(row)).toThrow('Trust score log is missing required user_id, community_id, or created_at');
  });
});