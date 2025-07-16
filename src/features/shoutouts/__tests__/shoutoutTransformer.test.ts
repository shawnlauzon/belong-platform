import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import {
  toDomainShoutout,
  toShoutoutInsertRow,
  toShoutoutUpdateRow,
} from '../transformers/shoutoutsTransformer';
import { createFakeUser } from '../../users/__fakes__';
import { createFakeResource } from '../../resources/__fakes__';
import { createFakeCommunitySummary } from '../../communities/__fakes__';
import { createFakeDbShoutout } from '../__fakes__';

describe('Shoutout Transformer', () => {
  describe('toDomainShoutout', () => {
    it('should transform a database shoutout to a domain shoutout', () => {
      const mockFromUser = createFakeUser();
      const mockToUser = createFakeUser();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      const mockCommunity = createFakeCommunitySummary();
      const shoutout = toDomainShoutout(dbShoutout, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
        community: mockCommunity,
      });

      expect(shoutout).toMatchObject({
        id: dbShoutout.id,
        message: dbShoutout.message,
        imageUrls: dbShoutout.image_urls,
        communityId: dbShoutout.community_id,
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
      });
      expect(shoutout.createdAt).toBeInstanceOf(Date);
      expect(shoutout.updatedAt).toBeInstanceOf(Date);
    });

    it('should include users and resource if provided', () => {
      const mockFromUser = createFakeUser();
      const mockToUser = createFakeUser();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      const mockCommunity = createFakeCommunitySummary();
      const shoutout = toDomainShoutout(dbShoutout, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
        community: mockCommunity,
      });

      expect(shoutout.fromUser).toEqual(mockFromUser);
      expect(shoutout.toUser).toEqual(mockToUser);
      expect(shoutout.resource).toEqual(mockResource);
    });

    it('should handle empty image_urls array', () => {
      const mockFromUser = createFakeUser();
      const mockToUser = createFakeUser();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
        image_urls: [],
      });

      const mockCommunity = createFakeCommunitySummary();
      const shoutout = toDomainShoutout(dbShoutout, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
        community: mockCommunity,
      });

      expect(shoutout.imageUrls).toEqual([]);
    });

    it('should throw an error if from user ID does not match', () => {
      const mockFromUser = createFakeUser();
      const mockToUser = createFakeUser();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        from_user_id: 'different-id',
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      const mockCommunity = createFakeCommunitySummary();
      expect(() =>
        toDomainShoutout(dbShoutout, {
          fromUser: mockFromUser,
          toUser: mockToUser,
          resource: mockResource,
          community: mockCommunity,
        }),
      ).toThrow('From user ID does not match');
    });

    it('should throw an error if to user ID does not match', () => {
      const mockFromUser = createFakeUser();
      const mockToUser = createFakeUser();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: 'different-id',
        resource_id: mockResource.id,
      });

      const mockCommunity = createFakeCommunitySummary();
      expect(() =>
        toDomainShoutout(dbShoutout, {
          fromUser: mockFromUser,
          toUser: mockToUser,
          resource: mockResource,
          community: mockCommunity,
        }),
      ).toThrow('To user ID does not match');
    });

    it('should throw an error if resource ID does not match', () => {
      const mockFromUser = createFakeUser();
      const mockToUser = createFakeUser();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: 'different-id',
      });

      const mockCommunity = createFakeCommunitySummary();
      expect(() =>
        toDomainShoutout(dbShoutout, {
          fromUser: mockFromUser,
          toUser: mockToUser,
          resource: mockResource,
          community: mockCommunity,
        }),
      ).toThrow('Resource ID does not match');
    });

    it('should not return any field names with underscores', () => {
      // Arrange
      const mockFromUser = createFakeUser();
      const mockToUser = createFakeUser();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      // Act
      const mockCommunity = createFakeCommunitySummary();
      const result = toDomainShoutout(dbShoutout, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
        community: mockCommunity,
      });

      // Assert
      const fieldNames = Object.keys(result);
      const underscoreFields = fieldNames.filter((name) => name.includes('_'));
      expect(underscoreFields).toEqual([]);
    });
  });

  describe('toShoutoutInsertRow', () => {
    it('should transform domain resource shoutout data to database insert format', () => {
      const fromUserId = faker.string.uuid();
      const toUserId = faker.string.uuid();
      const communityId = faker.string.uuid();
      const resourceId = faker.string.uuid();

      const shoutoutData = {
        message: faker.lorem.paragraph(),
        imageUrls: [faker.image.url()],
        resourceId,
        fromUserId,
        toUserId,
        communityId,
      };

      const dbShoutout = toShoutoutInsertRow(shoutoutData);

      expect(dbShoutout).toMatchObject({
        message: shoutoutData.message,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        resource_id: resourceId,
        community_id: communityId,
        image_urls: shoutoutData.imageUrls,
      });
    });

    it('should handle undefined imageUrls', () => {
      const fromUserId = faker.string.uuid();
      const toUserId = faker.string.uuid();
      const communityId = faker.string.uuid();
      const resourceId = faker.string.uuid();

      const shoutoutData = {
        message: faker.lorem.paragraph(),
        imageUrls: undefined,
        resourceId,
        fromUserId,
        toUserId,
        communityId,
      };

      const dbShoutout = toShoutoutInsertRow(shoutoutData);

      expect(dbShoutout.image_urls).toEqual([]);
    });
  });

  describe('toShoutoutUpdateRow', () => {
    it('should transform domain shoutout data to database update format', () => {
      const shoutoutData = {
        message: faker.lorem.paragraph(),
        imageUrls: [faker.image.url()],
      };
      const dbShoutout = toShoutoutUpdateRow(shoutoutData);

      expect(dbShoutout).toMatchObject({
        message: shoutoutData.message,
        image_urls: shoutoutData.imageUrls,
      });
    });
  });

  describe('toShoutoutUpdateRow', () => {
    it('should transform partial domain shoutout data to database update format', () => {
      const partialShoutoutInput = {
        message: faker.lorem.paragraph(),
        imageUrls: [faker.image.url()],
      };

      const dbShoutout = toShoutoutUpdateRow(partialShoutoutInput);

      expect(dbShoutout).toMatchObject({
        message: partialShoutoutInput.message,
        image_urls: partialShoutoutInput.imageUrls,
      });
    });

    it('should handle undefined values', () => {
      const partialShoutoutInput = {
        message: faker.lorem.paragraph(),
      };

      const dbShoutout = toShoutoutUpdateRow(partialShoutoutInput);

      expect(dbShoutout).toMatchObject({
        message: partialShoutoutInput.message,
        image_urls: undefined,
      });
    });
  });
});
