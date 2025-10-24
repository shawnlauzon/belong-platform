import { describe, it, expect } from 'vitest';
import { toDomainUserConnection } from '../../transformers/connectionTransformer';
import { createFakeUserConnectionRow } from '../../__fakes__';

describe('connectionTransformer', () => {
  describe('toDomainUserConnection', () => {
    it('should transform database row to domain format', () => {
      const dbRow = createFakeUserConnectionRow({
        id: 'connection-123',
        user_id: 'user-123',
        other_id: 'user-456',
        community_id: 'community-789',
        type: 'invited_by',
        strength: 'trusted',
        created_at: '2024-01-01T12:00:00Z',
      });

      const result = toDomainUserConnection(dbRow);

      expect(result).toEqual({
        id: 'connection-123',
        userId: 'user-123',
        otherId: 'user-456',
        communityId: 'community-789',
        type: 'invited_by',
        strength: 'trusted',
        createdAt: new Date('2024-01-01T12:00:00Z'),
      });
    });

    it('should handle null strength (not answered)', () => {
      const dbRow = createFakeUserConnectionRow({
        strength: null,
      });

      const result = toDomainUserConnection(dbRow);

      expect(result.strength).toBeNull();
    });

    it('should handle all connection strength levels', () => {
      const strengthLevels = ['trusted', 'positive', 'neutral', 'negative', 'unknown'] as const;

      strengthLevels.forEach((strength) => {
        const dbRow = createFakeUserConnectionRow({
          strength,
        });

        const result = toDomainUserConnection(dbRow);

        expect(result.strength).toBe(strength);
      });
    });
  });
});
