import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import {
  toDomainResource,
  toResourceInsertRow,
} from '../../transformers/resourceTransformer';
import { createFakeUser } from '../../../users/__fakes__';
import { createFakeCommunity } from '../../../communities/__fakes__';
import {
  createFakeResourceRow,
  createFakeResourceInput,
} from '../../__fakes__';

describe('Resource Transformer', () => {
  describe('toDomainResource', () => {
    it('should transform a database resource to a domain resource', () => {
      const dbResource = createFakeResourceRow();

      const resource = toDomainResource(dbResource);

      expect(resource).toMatchObject({
        id: dbResource.id,
        title: dbResource.title,
        description: dbResource.description,
        category: dbResource.category,
        communityId: dbResource.community_id,
      });
      expect(resource.owner).toBeDefined();
    });

    it('should include owner if provided', () => {
      const dbResource = createFakeResourceRow();

      const resource = toDomainResource(dbResource);

      expect(resource.owner).toEqual({
        id: dbResource.owner.id,
        firstName: (dbResource.owner.user_metadata as { first_name?: string; avatar_url?: string })?.first_name || '',
        avatarUrl: (dbResource.owner.user_metadata as { first_name?: string; avatar_url?: string })?.avatar_url,
        createdAt: new Date(dbResource.owner.created_at),
        updatedAt: new Date(dbResource.owner.updated_at),
      });
      expect(resource.communityId).toEqual(dbResource.community_id);
    });

    it('should not return any field names with underscores', () => {
      // Arrange
      const fakeOwner = createFakeUser();
      const fakeCommunity = createFakeCommunity();
      const dbResource = createFakeResourceRow({
        owner_id: fakeOwner.id,
        community_id: fakeCommunity.id,
      });

      // Act
      const result = toDomainResource(dbResource);

      // Assert
      const fieldNames = Object.keys(result);
      const underscoreFields = fieldNames.filter((name) => name.includes('_'));
      expect(underscoreFields).toEqual([]);
    });
  });

  describe('forDbInsert', () => {
    it('should transform a domain resource to a database resource', () => {
      const resourceData = createFakeResourceInput();
      const ownerId = faker.string.uuid();
      const resourceWithOwner = { ...resourceData, ownerId };

      const dbResource = toResourceInsertRow(resourceWithOwner);

      expect(dbResource).toMatchObject({
        type: resourceWithOwner.type,
        category: resourceWithOwner.category,
        title: resourceWithOwner.title,
        description: resourceWithOwner.description,
        owner_id: resourceWithOwner.ownerId,
        community_id: resourceWithOwner.communityId,
        location_name: resourceWithOwner.locationName,
        coordinates: resourceWithOwner.coordinates
          ? expect.stringContaining('POINT')
          : undefined,
      });
    });

    it('should handle partial updates', () => {
      const resourceData = createFakeResourceInput();

      const dbResource = toResourceInsertRow({ ...resourceData, ownerId: 'user-1' });

      expect(dbResource).toMatchObject({
        title: resourceData.title,
      });
    });
  });
});
