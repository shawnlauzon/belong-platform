import { describe, it, expect } from 'vitest';
import {
  toCommunityMemberCodeInsertRow,
  toConnectionRequestInsertRow,
  toDomainMemberCode,
  toDomainConnectionRequest,
  toDomainUserConnection,
  toConnectionLink,
} from '../../transformers/connectionTransformer';
import {
  createFakeMemberConnectionCode,
  createFakeConnectionRequest,
  createFakeUserConnection,
  createFakeConnectionLink,
  createFakeCommunityMemberCodeRow,
  createFakeConnectionRequestRow,
  createFakeUserConnectionRow,
} from '../../__fakes__';

describe('connectionTransformer', () => {
  describe('toCommunityMemberCodeInsertRow', () => {
    it('should transform domain data to database row format', () => {
      const memberCode = createFakeMemberConnectionCode({
        code: 'ABCD2345',
        userId: 'user-123',
        communityId: 'community-456',
      });

      const result = toCommunityMemberCodeInsertRow(memberCode);

      expect(result).toEqual({
        code: 'ABCD2345',
        user_id: 'user-123',
        community_id: 'community-456',
        is_active: true,
      });
    });

    it('should handle inactive codes', () => {
      const memberCode = createFakeMemberConnectionCode({
        isActive: false,
      });

      const result = toCommunityMemberCodeInsertRow(memberCode);

      expect(result.is_active).toBe(false);
    });
  });

  describe('toConnectionRequestInsertRow', () => {
    it('should transform domain data to database row format', () => {
      const request = createFakeConnectionRequest({
        initiatorId: 'user-123',
        requesterId: 'user-456',
        communityId: 'community-789',
      });

      const result = toConnectionRequestInsertRow(request);

      expect(result).toEqual({
        community_id: 'community-789',
        initiator_id: 'user-123',
        requester_id: 'user-456',
      });
    });
  });

  describe('toDomainUserConnection', () => {
    it('should transform database row to domain format', () => {
      const dbRow = createFakeUserConnectionRow({
        id: 'connection-123',
        user_a_id: 'user-123',
        user_b_id: 'user-456',
        community_id: 'community-789',
        connection_request_id: 'request-123',
        created_at: '2024-01-01T12:00:00Z',
      });

      const result = toDomainUserConnection(dbRow);

      expect(result).toEqual({
        id: 'connection-123',
        userAId: 'user-123',
        userBId: 'user-456',
        communityId: 'community-789',
        connectionRequestId: 'request-123',
        createdAt: new Date('2024-01-01T12:00:00Z'),
      });
    });
  });

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

  describe('toDomainConnectionRequest', () => {
    it('should transform database row to domain format', () => {
      const dbRow = createFakeConnectionRequestRow({
        id: 'request-123',
        community_id: 'community-456',
        initiator_id: 'user-123',
        requester_id: 'user-456',
        status: 'pending',
        created_at: '2024-01-01T12:00:00Z',
        responded_at: null,
        expires_at: '2024-01-08T12:00:00Z',
      });

      const result = toDomainConnectionRequest(dbRow);

      expect(result).toEqual({
        id: 'request-123',
        communityId: 'community-456',
        initiatorId: 'user-123',
        requesterId: 'user-456',
        status: 'pending',
        createdAt: new Date('2024-01-01T12:00:00Z'),
        respondedAt: undefined,
        expiresAt: new Date('2024-01-08T12:00:00Z'),
      });
    });

    it('should handle responded_at date when present', () => {
      const dbRow = createFakeConnectionRequestRow({
        responded_at: '2024-01-02T12:00:00Z',
      });

      const result = toDomainConnectionRequest(dbRow);

      expect(result.respondedAt).toEqual(new Date('2024-01-02T12:00:00Z'));
    });
  });

  describe('toDomainUserConnection', () => {
    it('should transform database row to domain format', () => {
      const dbRow = createFakeUserConnectionRow({
        id: 'connection-123',
        user_a_id: 'user-123',
        user_b_id: 'user-456',
        community_id: 'community-789',
        connection_request_id: 'request-123',
        created_at: '2024-01-01T12:00:00Z',
      });

      const result = toDomainUserConnection(dbRow);

      expect(result).toEqual({
        id: 'connection-123',
        userAId: 'user-123',
        userBId: 'user-456',
        communityId: 'community-789',
        connectionRequestId: 'request-123',
        createdAt: new Date('2024-01-01T12:00:00Z'),
      });
    });
  });

  describe('toConnectionLink', () => {
    it('should create connection link from member code', () => {
      const memberCode = createFakeMemberConnectionCode({
        code: 'ABCD2345',
        isActive: true,
      });

      const result = toConnectionLink(memberCode);

      expect(result).toEqual({
        code: 'ABCD2345',
        url: 'https://app.belong.network/connect/ABCD2345',
        isActive: true,
      });
    });

    it('should handle custom base URL', () => {
      const memberCode = createFakeMemberConnectionCode({
        code: 'XYZ89ABC',
        isActive: false,
      });

      const result = toConnectionLink(memberCode, 'https://custom.domain.com');

      expect(result).toEqual({
        code: 'XYZ89ABC',
        url: 'https://custom.domain.com/connect/XYZ89ABC',
        isActive: false,
      });
    });

    it('should handle trailing slash in base URL', () => {
      const memberCode = createFakeMemberConnectionCode({
        code: 'TEST1234',
      });

      const result = toConnectionLink(memberCode, 'https://custom.domain.com/');

      expect(result.url).toBe('https://custom.domain.com/connect/TEST1234');
    });
  });
});