import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import {
  toDomainShoutout,
  forDbInsert,
  forDbUpdate,
  toShoutoutInfo,
} from '../transformers/shoutoutsTransformer';
import { createFakeDbShoutout, createFakeShoutoutData } from './test-utils';
import { createFakeUserDetail } from '../../users/__fakes__';
import { createFakeResource } from '../../resources/__fakes__';

describe('Shoutout Transformer', () => {
  describe('toDomainShoutout', () => {
    it('should transform a database shoutout to a domain shoutout', () => {
      const mockFromUser = createFakeUserDetail();
      const mockToUser = createFakeUserDetail();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      const shoutout = toDomainShoutout(dbShoutout, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
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
      const mockFromUser = createFakeUserDetail();
      const mockToUser = createFakeUserDetail();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      const shoutout = toDomainShoutout(dbShoutout, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
      });

      expect(shoutout.fromUser).toEqual(mockFromUser);
      expect(shoutout.toUser).toEqual(mockToUser);
      expect(shoutout.resource).toEqual(mockResource);
    });


    it('should handle empty image_urls array', () => {
      const mockFromUser = createFakeUserDetail();
      const mockToUser = createFakeUserDetail();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
        image_urls: [],
      });

      const shoutout = toDomainShoutout(dbShoutout, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
      });

      expect(shoutout.imageUrls).toEqual([]);
    });

    it('should throw an error if from user ID does not match', () => {
      const mockFromUser = createFakeUserDetail();
      const mockToUser = createFakeUserDetail();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        from_user_id: 'different-id',
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      expect(() =>
        toDomainShoutout(dbShoutout, {
          fromUser: mockFromUser,
          toUser: mockToUser,
          resource: mockResource,
        }),
      ).toThrow('From user ID does not match');
    });

    it('should throw an error if to user ID does not match', () => {
      const mockFromUser = createFakeUserDetail();
      const mockToUser = createFakeUserDetail();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: 'different-id',
        resource_id: mockResource.id,
      });

      expect(() =>
        toDomainShoutout(dbShoutout, {
          fromUser: mockFromUser,
          toUser: mockToUser,
          resource: mockResource,
        }),
      ).toThrow('To user ID does not match');
    });

    it('should throw an error if resource ID does not match', () => {
      const mockFromUser = createFakeUserDetail();
      const mockToUser = createFakeUserDetail();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: 'different-id',
      });

      expect(() =>
        toDomainShoutout(dbShoutout, {
          fromUser: mockFromUser,
          toUser: mockToUser,
          resource: mockResource,
        }),
      ).toThrow('Resource ID does not match');
    });

    it('should not return any field names with underscores', () => {
      // Arrange
      const mockFromUser = createFakeUserDetail();
      const mockToUser = createFakeUserDetail();
      const mockResource = createFakeResource();
      const dbShoutout = createFakeDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      // Act
      const result = toDomainShoutout(dbShoutout, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
      });

      // Assert
      const fieldNames = Object.keys(result);
      const underscoreFields = fieldNames.filter((name) => name.includes('_'));
      expect(underscoreFields).toEqual([]);
    });
  });

  describe('forDbInsert', () => {
    it('should transform domain shoutout data to database insert format', () => {
      const shoutoutData = createFakeShoutoutData();
      const fromUserId = faker.string.uuid();

      const dbShoutout = forDbInsert(shoutoutData, fromUserId);

      expect(dbShoutout).toMatchObject({
        message: shoutoutData.message,
        from_user_id: fromUserId,
        to_user_id: shoutoutData.toUserId,
        resource_id: shoutoutData.resourceId,
        community_id: shoutoutData.communityId,
        image_urls: shoutoutData.imageUrls || [],
      });
    });

    it('should handle undefined imageUrls', () => {
      const shoutoutData = createFakeShoutoutData({
        imageUrls: undefined,
      });
      const fromUserId = faker.string.uuid();

      const dbShoutout = forDbInsert(shoutoutData, fromUserId);

      expect(dbShoutout.image_urls).toEqual([]);
    });

  });

  describe('forDbUpdate', () => {
    it('should transform partial domain shoutout data to database update format', () => {
      const partialShoutoutData = {
        message: faker.lorem.paragraph(),
        imageUrls: [faker.image.url()],
      };

      const dbShoutout = forDbUpdate(partialShoutoutData);

      expect(dbShoutout).toMatchObject({
        message: partialShoutoutData.message,
        image_urls: partialShoutoutData.imageUrls,
      });
    });

    it('should handle undefined values', () => {
      const partialShoutoutData = {
        message: faker.lorem.paragraph(),
      };

      const dbShoutout = forDbUpdate(partialShoutoutData);

      expect(dbShoutout).toMatchObject({
        message: partialShoutoutData.message,
        from_user_id: undefined,
        to_user_id: undefined,
        resource_id: undefined,
        image_urls: undefined,
      });
    });

  });

  describe('toShoutoutInfo', () => {
    it('should transform database shoutout to ShoutoutInfo with communityId', () => {
      const dbShoutout = createFakeDbShoutout();

      const shoutoutInfo = toShoutoutInfo(dbShoutout);

      expect(shoutoutInfo).toMatchObject({
        id: dbShoutout.id,
        message: dbShoutout.message,
        imageUrls: dbShoutout.image_urls,
        fromUserId: dbShoutout.from_user_id,
        toUserId: dbShoutout.to_user_id,
        resourceId: dbShoutout.resource_id,
        communityId: dbShoutout.community_id,
      });
      expect(shoutoutInfo.createdAt).toBeInstanceOf(Date);
      expect(shoutoutInfo.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle empty image_urls array in ShoutoutInfo', () => {
      const dbShoutout = createFakeDbShoutout({
        image_urls: [],
      });

      const shoutoutInfo = toShoutoutInfo(dbShoutout);

      expect(shoutoutInfo.imageUrls).toEqual([]);
    });
  });
});