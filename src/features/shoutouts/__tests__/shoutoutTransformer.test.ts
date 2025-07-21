import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import {
  toDomainShoutout,
  toShoutoutInsertRow,
  toShoutoutUpdateRow,
} from '../transformers/shoutoutsTransformer';
import { createFakeUser } from '../../users/__fakes__';
import { createFakeResource } from '../../resources/__fakes__';
import { createFakeDbShoutout } from '../__fakes__';

describe('Shoutout Transformer', () => {
  describe('toDomainShoutout', () => {
    it('should transform a database shoutout to a domain shoutout', () => {
      const mockFromUser = createFakeUser();
      const mockToUser = createFakeUser();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        sender_id: mockFromUser.id,
        receiver_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      const shoutout = toDomainShoutout(dbShoutout);

      expect(shoutout).toMatchObject({
        id: dbShoutout.id,
        message: dbShoutout.message,
        imageUrls: dbShoutout.image_urls,
        communityId: dbShoutout.community_id,
        senderId: mockFromUser.id,
        receiverId: mockToUser.id,
        resourceId: mockResource.id,
      });
      expect(shoutout.createdAt).toBeInstanceOf(Date);
      expect(shoutout.updatedAt).toBeInstanceOf(Date);
    });

    it('should include all required ID fields', () => {
      const mockFromUser = createFakeUser();
      const mockToUser = createFakeUser();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        sender_id: mockFromUser.id,
        receiver_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      const shoutout = toDomainShoutout(dbShoutout);

      expect(shoutout.senderId).toBe(mockFromUser.id);
      expect(shoutout.receiverId).toBe(mockToUser.id);
      expect(shoutout.resourceId).toBe(mockResource.id);
      expect(shoutout.communityId).toBe(dbShoutout.community_id);
    });

    it('should handle empty image_urls array', () => {
      const dbShoutout = createFakeDbShoutout({
        image_urls: [],
      });

      const shoutout = toDomainShoutout(dbShoutout);

      expect(shoutout.imageUrls).toEqual([]);
    });

    it('should not return any field names with underscores', () => {
      // Arrange
      const dbShoutout = createFakeDbShoutout();

      // Act
      const result = toDomainShoutout(dbShoutout);

      // Assert - Should NOT have snake_case properties
      const resultKeys = Object.keys(result);
      const snakeCaseKeys = resultKeys.filter((key) => key.includes('_'));

      expect(snakeCaseKeys).toHaveLength(0);
    });
  });

  describe('toShoutoutInsertRow', () => {
    it('should transform shoutout input to database insert format', () => {
      const shoutoutInput = {
        message: faker.lorem.sentence(),
        receiverId: faker.string.uuid(),
        communityId: faker.string.uuid(),
        resourceId: faker.string.uuid(),
        imageUrls: [faker.image.url()],
      };

      const result = toShoutoutInsertRow(shoutoutInput);

      expect(result).toMatchObject({
        message: shoutoutInput.message,
        receiver_id: shoutoutInput.receiverId,
        community_id: shoutoutInput.communityId,
        resource_id: shoutoutInput.resourceId,
        image_urls: shoutoutInput.imageUrls,
      });
    });
  });

  describe('toShoutoutUpdateRow', () => {
    it('should transform shoutout updates to database format', () => {
      const shoutoutUpdate = {
        id: faker.string.uuid(),
        message: faker.lorem.sentence(),
        imageUrls: [faker.image.url()],
      };

      const result = toShoutoutUpdateRow(shoutoutUpdate);

      expect(result).toMatchObject({
        message: shoutoutUpdate.message,
        image_urls: shoutoutUpdate.imageUrls,
      });
    });
  });
});
