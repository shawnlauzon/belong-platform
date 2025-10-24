import { describe, it, expect } from 'vitest';
import { toDomainInvitationCode } from '../../transformers/invitationTransformer';
import { createFakeInvitationCodeRow } from '../../__fakes__';

describe('invitationTransformer', () => {
  describe('toDomainInvitationCode', () => {
    it('should transform database row to domain format', () => {
      const dbRow = createFakeInvitationCodeRow({
        code: 'ABCD2345',
        user_id: 'user-123',
        community_id: 'community-456',
        is_active: true,
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-02T12:00:00Z',
      });

      const result = toDomainInvitationCode(dbRow);

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
      const dbRow = createFakeInvitationCodeRow({
        is_active: false,
      });

      const result = toDomainInvitationCode(dbRow);

      expect(result.isActive).toBe(false);
    });
  });
});
