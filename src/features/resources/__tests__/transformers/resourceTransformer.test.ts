import { describe, it, expect } from 'vitest';
import {
  toDomainResource,
  toResourceInsertRow,
} from '../../transformers/resourceTransformer';
import { createFakeUser } from '../../../users/__fakes__';
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
      });
      expect(resource.ownerId).toBeDefined();
      expect(resource.communityIds).toHaveLength(0); // Empty array by default
    });

    it('should include owner if provided', () => {
      const dbResource = createFakeResourceRow();

      const resource = toDomainResource(dbResource);

      expect(resource.ownerId).toBe(dbResource.owner_id);
    });

    it('should not return any field names with underscores', () => {
      // Arrange
      const fakeOwner = createFakeUser();
      const dbResource = createFakeResourceRow({
        owner_id: fakeOwner.id,
      });

      // Act
      const result = toDomainResource(dbResource);

      // Assert
      const fieldNames = Object.keys(result);
      const underscoreFields = fieldNames.filter((name) => name.includes('_'));
      expect(underscoreFields).toEqual([]);
    });

    it('should use existing image URLs when available', () => {
      const customImageUrls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'];
      const dbResource = createFakeResourceRow({
        image_urls: customImageUrls,
        category: 'tools'
      });

      const resource = toDomainResource(dbResource);

      expect(resource.imageUrls).toEqual(customImageUrls);
    });

    it('should return empty array when no images provided', () => {
      const dbResource = createFakeResourceRow({
        image_urls: null,
        category: 'tools'
      });

      const resource = toDomainResource(dbResource);

      expect(resource.imageUrls).toEqual([]);
    });

    it('should return empty array when empty array provided', () => {
      const dbResource = createFakeResourceRow({
        image_urls: [],
        category: 'food'
      });

      const resource = toDomainResource(dbResource);

      expect(resource.imageUrls).toEqual([]);
    });

    it('should transform isRecurring field from database to domain', () => {
      const dbResource = createFakeResourceRow({
        is_recurring: true,
      });

      const resource = toDomainResource(dbResource);

      expect(resource.isRecurring).toBe(true);
    });

    it('should default isRecurring to false when not provided', () => {
      const dbResource = createFakeResourceRow({
        is_recurring: false,
      });

      const resource = toDomainResource(dbResource);

      expect(resource.isRecurring).toBe(false);
    });

    it('should transform expiresAt field from database to domain', () => {
      const expirationDate = '2024-12-31T23:59:59.000Z';
      const dbResource = createFakeResourceRow({
        expires_at: expirationDate,
      });

      const resource = toDomainResource(dbResource);

      expect(resource.expiresAt).toEqual(new Date(expirationDate));
    });

    it('should handle null expiresAt field', () => {
      const dbResource = createFakeResourceRow({
        expires_at: null,
      });

      const resource = toDomainResource(dbResource);

      expect(resource.expiresAt).toBeUndefined();
    });

    it('should handle undefined expiresAt field', () => {
      const dbResource = createFakeResourceRow({
        expires_at: undefined,
      });

      const resource = toDomainResource(dbResource);

      expect(resource.expiresAt).toBeUndefined();
    });
  });

  describe('forDbInsert', () => {
    it('should transform a domain resource to a database resource', () => {
      const resourceData = createFakeResourceInput();

      const dbResource = toResourceInsertRow(resourceData);

      expect(dbResource).toMatchObject({
        type: resourceData.type,
        category: resourceData.category,
        title: resourceData.title,
        description: resourceData.description,
        location_name: resourceData.locationName,
        coordinates: resourceData.coordinates
          ? expect.stringContaining('POINT')
          : undefined,
      });
    });

    it('should handle partial updates', () => {
      const resourceData = createFakeResourceInput();

      const dbResource = toResourceInsertRow(resourceData);

      expect(dbResource).toMatchObject({
        title: resourceData.title,
      });
    });

    it('should transform isRecurring field from domain to database', () => {
      const resourceData = createFakeResourceInput({
        isRecurring: true,
      });

      const dbResource = toResourceInsertRow(resourceData);

      expect(dbResource.is_recurring).toBe(true);
    });

    it('should transform isRecurring field from domain to database when false', () => {
      const resourceData = createFakeResourceInput({
        isRecurring: false,
      });

      const dbResource = toResourceInsertRow(resourceData);

      expect(dbResource.is_recurring).toBe(false);
    });
  });
});
