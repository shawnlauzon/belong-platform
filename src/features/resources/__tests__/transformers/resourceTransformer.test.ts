import { describe, it, expect } from 'vitest';
import {
  toDomainResource,
  forDbInsert,
} from '../../transformers/resourceTransformer';
import { createFakeUserDetail } from '../../../users/__fakes__';
import { createFakeCommunity } from '../../../communities/__fakes__';
import { createFakeDbResource, createFakeResourceData } from '../../__fakes__';

describe('Resource Transformer', () => {
  describe('toDomainResource', () => {
    it('should transform a database resource to a domain resource', () => {
      const fakeOwner = createFakeUserDetail();
      const fakeCommunity = createFakeCommunity();
      const dbResource = createFakeDbResource({
        owner_id: fakeOwner.id,
        community_id: fakeCommunity.id,
      });

      const resource = toDomainResource(dbResource, {
        owner: fakeOwner,
        community: fakeCommunity,
      });

      expect(resource).toMatchObject({
        id: dbResource.id,
        title: dbResource.title,
        description: dbResource.description,
        category: dbResource.category,
        owner: fakeOwner,
        community: fakeCommunity,
      });
    });

    it('should include owner and community if provided', () => {
      const fakeOwner = createFakeUserDetail();
      const fakeCommunity = createFakeCommunity();
      const dbResource = createFakeDbResource({
        owner_id: fakeOwner.id,
        community_id: fakeCommunity.id,
      });

      const resource = toDomainResource(dbResource, {
        owner: fakeOwner,
        community: fakeCommunity,
      });

      expect(resource.owner).toEqual(fakeOwner);
      expect(resource.community).toEqual(fakeCommunity);
    });

    it('should not return any field names with underscores', () => {
      // Arrange
      const fakeOwner = createFakeUserDetail();
      const fakeCommunity = createFakeCommunity();
      const dbResource = createFakeDbResource({
        owner_id: fakeOwner.id,
        community_id: fakeCommunity.id,
      });

      // Act
      const result = toDomainResource(dbResource, {
        owner: fakeOwner,
        community: fakeCommunity,
      });

      // Assert
      const fieldNames = Object.keys(result);
      const underscoreFields = fieldNames.filter((name) => name.includes('_'));
      expect(underscoreFields).toEqual([]);
    });
  });

  describe('forDbInsert', () => {
    it('should transform a domain resource to a database resource', () => {
      const resourceData = createFakeResourceData();

      const dbResource = forDbInsert(resourceData);

      expect(dbResource).toMatchObject({
        type: resourceData.type,
        category: resourceData.category,
        title: resourceData.title,
        description: resourceData.description,
        owner_id: resourceData.ownerId,
        community_id: resourceData.communityId,
        location: resourceData.location
          ? expect.stringContaining('POINT')
          : undefined,
      });
    });

    it('should handle partial updates', () => {
      const resourceData = createFakeResourceData();

      const dbResource = forDbInsert(resourceData);

      expect(dbResource).toMatchObject({
        title: resourceData.title,
      });
    });
  });
});
