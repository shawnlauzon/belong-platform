import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
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

      const dbResource = toResourceInsertRow({
        ...resourceData,
        ownerId: 'user-1',
      });

      expect(dbResource).toMatchObject({
        title: resourceData.title,
      });
    });
  });
});
