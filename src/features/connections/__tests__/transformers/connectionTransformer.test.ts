import { describe, it, expect } from 'vitest';
import {
  toDomainMemberCode,
  toDomainUserConnection,
} from '../../transformers/connectionTransformer';
import {
  createFakeCommunityMemberCodeRow,
  createFakeUserConnectionRow,
} from '../../__fakes__';

describe('connectionTransformer', () => {
  describe('toDomainMemberCode', () => {
    it('should transform database row to domain format', () => {
      const dbRow = createFakeCommunityMemberCodeRow({
        code: 'ABCD2345',
        user_id: 'user-123',
        community_id: 'community-456',
        is_active: true,
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-02T12:00:00Z',
      });

      const result = toDomainMemberCode(dbRow);

      expect(result).toEqual({
        code: 'ABCD2345',
        userId: 'user-123',
        communityId: 'community-456',
        isActive: true,
        createdAt: new Date('2024-01-01T12:00:00Z'),
        updatedAt: new Date('2024-01-02T12:00:00Z'),
      });
    });

    it('should handle inactive codes', () => {
      const dbRow = createFakeCommunityMemberCodeRow({
        is_active: false,
      });

      const result = toDomainMemberCode(dbRow);

      expect(result.isActive).toBe(false);
    });
  });

  describe('toDomainUserConnection', () => {
    it('should transform database row to domain format', () => {
      const dbRow = createFakeUserConnectionRow({
        id: 'connection-123',
        user_id: 'user-123',
        other_id: 'user-456',
        community_id: 'community-789',
        type: 'invited_by',
        created_at: '2024-01-01T12:00:00Z',
      });

      const result = toDomainUserConnection(dbRow);

      expect(result).toEqual({
        id: 'connection-123',
        userId: 'user-123',
        otherId: 'user-456',
        communityId: 'community-789',
        type: 'invited_by',
        createdAt: new Date('2024-01-01T12:00:00Z'),
      });
    });
  });
});
