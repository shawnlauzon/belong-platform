import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import { toDomainResource, forDbInsert } from '../impl/resourceTransformer';
import { createMockDbResource } from './test-utils';
import { createMockResourceData, createMockUser, createMockCommunity } from '../../test-utils/mocks';

describe('Resource Transformer', () => {
  describe('toDomainResource', () => {
    it('should transform a database resource to a domain resource', () => {
      const mockOwner = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbResource = createMockDbResource({
        owner_id: mockOwner.id,
        community_id: mockCommunity.id,
      });

      const resourceWithRefs = {
        ...dbResource,
        owner: mockOwner,
        community: mockCommunity,
      };

      const resource = toDomainResource(resourceWithRefs);

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

      const resourceWithRefs = {
        ...dbResource,
        owner: mockOwner,
        community: mockCommunity,
      };

      const resource = toDomainResource(resourceWithRefs);

      expect(resource.owner).toEqual(mockOwner);
      expect(resource.community).toEqual(mockCommunity);
    });

    it('should throw an error if resource is null or undefined', () => {
      expect(() => toDomainResource(null as any)).toThrow('User must be authenticated to perform this operation');
      expect(() => toDomainResource(undefined as any)).toThrow('User must be authenticated to perform this operation');
    });
  });

  describe('forDbInsert', () => {
    it('should transform a domain resource to a database resource', () => {
      const resourceData = createMockResourceData();
      const ownerId = faker.string.uuid();

      const dbResource = forDbInsert(resourceData, ownerId);

      expect(dbResource).toMatchObject({
        type: resourceData.type,
        category: resourceData.category,
        title: resourceData.title,
        description: resourceData.description,
        owner_id: ownerId,
        location: resourceData.location ? expect.stringContaining('POINT') : undefined,
      });
    });

    it('should handle partial updates', () => {
      const resourceData = createMockResourceData();
      const ownerId = faker.string.uuid();

      const dbResource = forDbInsert(resourceData, ownerId);

      expect(dbResource).toMatchObject({
        title: resourceData.title,
        owner_id: ownerId,
      });
    });
  });
});
