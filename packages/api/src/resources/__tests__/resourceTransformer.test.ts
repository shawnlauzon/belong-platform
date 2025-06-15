import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import { toDomainResource, toDbResource } from '../impl/resourceTransformer';
import { createMockDbResource } from './test-utils';

describe('Resource Transformer', () => {
  describe('toDomainResource', () => {
    it('should transform a database resource to a domain resource', () => {
      const dbResource = createMockDbResource({
        title: 'Test Resource',
        description: 'Test Description',
        category: 'FOOD',
      });

      const resource = toDomainResource(dbResource);

      expect(resource).toMatchObject({
        id: dbResource.id,
        title: 'Test Resource',
        description: 'Test Description',
        category: 'FOOD',
        zipCode: dbResource.zip_code,
        isApproved: dbResource.is_approved,
        isActive: dbResource.is_active,
        ownerId: dbResource.owner_id,
        communityId: dbResource.community_id,
      });
    });

    it('should include owner and community if provided', () => {
      const owner = {
        id: faker.string.uuid(),
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
      };

      const community = {
        id: faker.string.uuid(),
        name: 'Test Community',
        slug: 'test-community',
        description: 'Test Description',
        logo_url: 'https://example.com/logo.jpg',
        banner_url: 'https://example.com/banner.jpg',
      };

      const dbResource = createMockDbResource({
        owner,
        community,
      });

      const resource = toDomainResource(dbResource);

      expect(resource.owner).toEqual({
        id: owner.id,
        firstName: owner.first_name,
        lastName: owner.last_name,
        email: owner.email,
        avatarUrl: owner.avatar_url,
      });

      expect(resource.community).toEqual({
        id: community.id,
        name: community.name,
        slug: community.slug,
        description: community.description,
        logoUrl: community.logo_url,
        bannerUrl: community.banner_url,
      });
    });

    it('should throw an error if resource is null or undefined', () => {
      expect(() => toDomainResource(null as any)).toThrow('Database resource is required');
      expect(() => toDomainResource(undefined as any)).toThrow('Database resource is required');
    });
  });

  describe('toDbResource', () => {
    it('should transform a domain resource to a database resource', () => {
      const resource = {
        id: faker.string.uuid(),
        title: 'Test Resource',
        description: 'Test Description',
        category: 'FOOD' as const,
        zipCode: '12345',
        isApproved: true,
        isActive: true,
        ownerId: faker.string.uuid(),
        communityId: faker.string.uuid(),
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      };

      const dbResource = toDbResource(resource);

      expect(dbResource).toEqual({
        id: resource.id,
        title: 'Test Resource',
        description: 'Test Description',
        category: 'FOOD',
        zip_code: '12345',
        is_approved: true,
        is_active: true,
        owner_id: resource.ownerId,
        community_id: resource.communityId,
        location: 'POINT(-74.006 40.7128)',
      });
    });

    it('should handle partial updates', () => {
      const resource = {
        id: faker.string.uuid(),
        title: 'Updated Title',
      };

      const dbResource = toDbResource(resource);

      expect(dbResource).toEqual({
        id: resource.id,
        title: 'Updated Title',
      });
    });
  });
});
