import { describe, it, expect } from 'vitest';
import {
  toDomainResource,
  forDbInsert,
} from '../transformers/resourceTransformer';
import { createMockUser } from '../../users/__mocks__';
import { createMockCommunity } from '../../communities/__mocks__';
import { createMockDbResource, createMockResourceData } from '../__mocks__';

describe('Resource Transformer', () => {
  describe('toDomainResource', () => {
    it('should transform a database resource to a domain resource', () => {
      const mockOwner = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbResource = createMockDbResource({
        owner_id: mockOwner.id,
        community_id: mockCommunity.id,
      });

      const resource = toDomainResource(dbResource, {
        owner: mockOwner,
        community: mockCommunity,
      });

      expect(resource).toMatchObject({
        id: dbResource.id,
        title: dbResource.title,
        description: dbResource.description,
        category: dbResource.category,
        owner: mockOwner,
        community: mockCommunity,
      });
    });

    it('should include owner and community if provided', () => {
      const mockOwner = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbResource = createMockDbResource({
        owner_id: mockOwner.id,
        community_id: mockCommunity.id,
      });

      const resource = toDomainResource(dbResource, {
        owner: mockOwner,
        community: mockCommunity,
      });

      expect(resource.owner).toEqual(mockOwner);
      expect(resource.community).toEqual(mockCommunity);
    });

    it('should not return any field names with underscores', () => {
      // Arrange
      const mockOwner = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbResource = createMockDbResource({
        owner_id: mockOwner.id,
        community_id: mockCommunity.id,
      });

      // Act
      const result = toDomainResource(dbResource, {
        owner: mockOwner,
        community: mockCommunity,
      });

      // Assert
      const fieldNames = Object.keys(result);
      const underscoreFields = fieldNames.filter((name) => name.includes('_'));
      expect(underscoreFields).toEqual([]);
    });
  });

  describe('forDbInsert', () => {
    it('should transform a domain resource to a database resource', () => {
      const resourceData = createMockResourceData();

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
      const resourceData = createMockResourceData();

      const dbResource = forDbInsert(resourceData);

      expect(dbResource).toMatchObject({
        title: resourceData.title,
      });
    });
  });
});
