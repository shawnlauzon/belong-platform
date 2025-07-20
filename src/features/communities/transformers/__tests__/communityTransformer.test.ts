import { describe, it, expect } from 'vitest';
import { toDomainCommunity, toCommunityInsertRow, toCommunityUpdateRow } from '../communityTransformer';
import { createFakeCommunityRow, createFakeCommunityInput } from '../../__fakes__';
import { faker } from '@faker-js/faker';

describe('communityTransformer', () => {
  describe('toDomainCommunity', () => {
    it('should transform database community to domain community including color', () => {
      const color = faker.internet.color();
      const dbCommunity = createFakeCommunityRow({ color });

      const result = toDomainCommunity(dbCommunity);

      expect(result.color).toBe(color);
    });

    it('should handle null color field', () => {
      const dbCommunity = createFakeCommunityRow({ color: null });

      const result = toDomainCommunity(dbCommunity);

      expect(result.color).toBeUndefined();
    });
  });

  describe('toCommunityInsertRow', () => {
    it('should transform domain community input to database insert including color', () => {
      const color = faker.internet.color();
      const communityInput = createFakeCommunityInput({ color });

      const result = toCommunityInsertRow(communityInput);

      expect(result.color).toBe(color);
    });

    it('should handle undefined color field', () => {
      const communityInput = createFakeCommunityInput({ color: undefined });

      const result = toCommunityInsertRow(communityInput);

      expect(result.color).toBeUndefined();
    });
  });

  describe('toCommunityUpdateRow', () => {
    it('should transform domain community update to database update including color', () => {
      const color = faker.internet.color();
      const communityUpdate = {
        id: faker.string.uuid(),
        name: faker.location.city(),
        color,
      };

      const result = toCommunityUpdateRow(communityUpdate);

      expect(result.color).toBe(color);
    });

    it('should handle undefined color field in update', () => {
      const communityUpdate = {
        id: faker.string.uuid(),
        name: faker.location.city(),
        color: undefined,
      };

      const result = toCommunityUpdateRow(communityUpdate);

      expect(result.color).toBeUndefined();
    });
  });
});