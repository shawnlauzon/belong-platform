import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import {
  toCommunityInsertRow,
  toCommunityUpdateRow,
  toCommunityMembershipInsertRow,
  toDomainMembershipInfo,
  toDomainCommunity,
} from '../../transformers/communityTransformer';
import {
  createFakeCommunityInput,
  createFakeDbCommunityWithOrganizer,
} from '../../__fakes__';

describe('communityTransformer', () => {
  describe('toCommunityInsertRow', () => {
    it('should transform community data with boundary but not include center in boundary JSON', () => {
      const communityData = createFakeCommunityInput();
      const organizerId = faker.string.uuid();

      const result = toCommunityInsertRow(communityData);

      // Should have boundary JSON without center
      expect(result.boundary).toEqual({
        type: communityData.boundary!.type,
        travelMode: communityData.boundary!.travelMode,
        travelTimeMin: communityData.boundary!.travelTimeMin,
        polygon: communityData.boundary!.polygon,
        areaSqKm: communityData.boundary!.areaSqKm,
      });

      // Boundary should NOT include center field
      expect(result.boundary).not.toHaveProperty('center');

      // Center should be separate field
      expect(result.center).toBeDefined();
      expect(result.center).toMatch(/^POINT\(.+ .+\)$/);

      // Should have boundary geometry
      expect(result.boundary_geometry).toBeDefined();
      expect(result.boundary_geometry).toBe(communityData.boundary!.polygon);
    });

    it('should work with null boundary', () => {
      const communityData = createFakeCommunityInput({
        boundary: undefined,
      });
      const organizerId = faker.string.uuid();

      const result = toCommunityInsertRow(communityData);

      expect(result.boundary).toBeUndefined();
      expect(result.boundary_geometry).toBeUndefined();
      expect(result.center).toBeDefined();
    });


    it('should transform bannerImageUrl to banner_image_url', () => {
      const bannerImageUrl = faker.image.url();
      const communityData = createFakeCommunityInput({ bannerImageUrl });
      const organizerId = faker.string.uuid();

      const result = toCommunityInsertRow(communityData);

      expect(result.banner_image_url).toBe(bannerImageUrl);
    });

    it('should handle undefined bannerImageUrl', () => {
      const communityData = createFakeCommunityInput({
        bannerImageUrl: undefined,
      });
      const organizerId = faker.string.uuid();

      const result = toCommunityInsertRow(communityData);

      expect(result.banner_image_url).toBeUndefined();
    });
  });

  describe('toCommunityUpdateRow', () => {
    it('should transform bannerImageUrl to banner_image_url', () => {
      const bannerImageUrl = faker.image.url();
      const communityId = faker.string.uuid();
      const updateData = { id: communityId, bannerImageUrl };

      const result = toCommunityUpdateRow(updateData);

      expect(result.banner_image_url).toBe(bannerImageUrl);
    });

    it('should handle undefined bannerImageUrl', () => {
      const communityId = faker.string.uuid();
      const updateData = { id: communityId, bannerImageUrl: undefined };

      const result = toCommunityUpdateRow(updateData);

      expect(result.banner_image_url).toBeUndefined();
    });

    it('should include boundary_geometry when boundary is provided', () => {
      const communityData = createFakeCommunityInput();
      const updateData = {
        id: faker.string.uuid(),
        boundary: communityData.boundary,
      };

      const result = toCommunityUpdateRow(updateData);

      // Should have boundary_geometry when boundary is provided
      expect(result.boundary_geometry).toBeDefined();
      expect(result.boundary_geometry).toBe(communityData.boundary!.polygon);
    });

    it('should handle undefined boundary', () => {
      const communityId = faker.string.uuid();
      const updateData = { id: communityId, boundary: undefined };

      const result = toCommunityUpdateRow(updateData);

      expect(result.boundary).toBeUndefined();
      expect(result.boundary_geometry).toBeUndefined();
    });
  });

  describe('toDomainCommunity', () => {
    it('should transform banner_image_url to bannerImageUrl', () => {
      const bannerImageUrl = faker.image.url();
      const dbCommunityWithOrganizer = createFakeDbCommunityWithOrganizer({
        banner_image_url: bannerImageUrl,
      });

      const result = toDomainCommunity(dbCommunityWithOrganizer);

      expect(result.bannerImageUrl).toBe(bannerImageUrl);
    });

    it('should handle null banner_image_url', () => {
      const dbCommunityWithOrganizer = createFakeDbCommunityWithOrganizer({
        banner_image_url: null,
      });

      const result = toDomainCommunity(dbCommunityWithOrganizer);

      expect(result.bannerImageUrl).toBeUndefined();
    });
  });

  describe('toCommunityMembershipInsertRow', () => {
    it('should transform domain membership data to database format', () => {
      const membershipData = {
        userId: faker.string.uuid(),
        communityId: faker.string.uuid(),
      };

      const result = toCommunityMembershipInsertRow(membershipData);

      expect(result).toEqual({
        user_id: membershipData.userId,
        community_id: membershipData.communityId,
      });
    });
  });

  describe('toDomainMembershipInfo', () => {
    it('should transform database membership data to domain format', () => {
      const dbMembership = {
        user_id: faker.string.uuid(),
        community_id: faker.string.uuid(),
        joined_at: '2023-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      const result = toDomainMembershipInfo(dbMembership);

      expect(result).toEqual({
        userId: dbMembership.user_id,
        communityId: dbMembership.community_id,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
      });
    });
  });
});
