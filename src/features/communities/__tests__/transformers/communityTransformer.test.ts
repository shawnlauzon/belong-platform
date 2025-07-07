import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import { 
  forDbInsert, 
  forDbUpdate,
  forDbMembershipInsert, 
  toDomainMembershipInfo,
  toDomainCommunity,
  toCommunityInfo
} from '../../transformers/communityTransformer';
import { createFakeCommunityData, createFakeDbCommunityWithOrganizer, createFakeDbCommunity } from '../../__fakes__';

describe('communityTransformer', () => {
  describe('forDbInsert', () => {
    it('should transform community data with boundary but not include center in boundary JSON', () => {
      const communityData = createFakeCommunityData();
      const organizerId = faker.string.uuid();

      const result = forDbInsert({ ...communityData, organizerId });

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
    });

    it('should work with null boundary', () => {
      const communityData = createFakeCommunityData({
        boundary: undefined,
      });
      const organizerId = faker.string.uuid();

      const result = forDbInsert({ ...communityData, organizerId });

      expect(result.boundary).toBeUndefined();
      expect(result.boundary_geometry).toBeUndefined();
      expect(result.center).toBeDefined();
    });

    it('should properly transform organizer ID to snake_case', () => {
      const communityData = createFakeCommunityData();
      const organizerId = faker.string.uuid();

      const result = forDbInsert({ ...communityData, organizerId });

      expect(result.organizer_id).toBe(organizerId);
      expect(result).not.toHaveProperty('organizerId');
    });

    it('should transform bannerImageUrl to banner_image_url', () => {
      const bannerImageUrl = faker.image.url();
      const communityData = createFakeCommunityData({ bannerImageUrl });
      const organizerId = faker.string.uuid();

      const result = forDbInsert({ ...communityData, organizerId });

      expect(result.banner_image_url).toBe(bannerImageUrl);
    });

    it('should handle undefined bannerImageUrl', () => {
      const communityData = createFakeCommunityData({ bannerImageUrl: undefined });
      const organizerId = faker.string.uuid();

      const result = forDbInsert({ ...communityData, organizerId });

      expect(result.banner_image_url).toBeUndefined();
    });
  });

  describe('forDbUpdate', () => {
    it('should transform bannerImageUrl to banner_image_url', () => {
      const bannerImageUrl = faker.image.url();
      const communityId = faker.string.uuid();
      const updateData = { id: communityId, bannerImageUrl };

      const result = forDbUpdate(updateData);

      expect(result.banner_image_url).toBe(bannerImageUrl);
    });

    it('should handle undefined bannerImageUrl', () => {
      const communityId = faker.string.uuid();
      const updateData = { id: communityId, bannerImageUrl: undefined };

      const result = forDbUpdate(updateData);

      expect(result.banner_image_url).toBeUndefined();
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

  describe('toCommunityInfo', () => {
    it('should transform banner_image_url to bannerImageUrl', () => {
      const bannerImageUrl = faker.image.url();
      const dbCommunity = createFakeDbCommunity({
        banner_image_url: bannerImageUrl,
      });

      const result = toCommunityInfo(dbCommunity);

      expect(result.bannerImageUrl).toBe(bannerImageUrl);
    });

    it('should handle null banner_image_url', () => {
      const dbCommunity = createFakeDbCommunity({
        banner_image_url: null,
      });

      const result = toCommunityInfo(dbCommunity);

      expect(result.bannerImageUrl).toBeUndefined();
    });
  });

  describe('forDbMembershipInsert', () => {
    it('should transform domain membership data to database format', () => {
      const membershipData = {
        userId: faker.string.uuid(),
        communityId: faker.string.uuid(),
      };

      const result = forDbMembershipInsert(membershipData);

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
      };

      const result = toDomainMembershipInfo(dbMembership);

      expect(result).toEqual({
        userId: dbMembership.user_id,
        communityId: dbMembership.community_id,
        joinedAt: new Date('2023-01-01T00:00:00Z'),
      });
    });
  });
});