import { faker } from '@faker-js/faker';
import { ResourceCategory } from '@belongnetwork/platform';
import { generateTestName } from '../database/utils/database-helpers';
import { waitFor } from '@testing-library/react';

/**
 * Common test data generators for CRUD operations
 */

export interface ResourceTestData {
  title: string;
  description: string;
  category: ResourceCategory;
  type: 'offer' | 'request';
  communityId: string;
  isActive: boolean;
  imageUrls: string[];
}

export interface EventTestData {
  title: string;
  description: string;
  communityId: string;
  organizerId: string;
  startDateTime: Date;
  endDateTime: Date;
  location: string;
  coordinates: { lat: number; lng: number };
  isActive: boolean;
}

export interface ThanksTestData {
  fromUserId: string;
  toUserId: string;
  resourceId: string;
  message: string;
  impactDescription: string;
  imageUrls: string[];
}

/**
 * Generates test data for resource creation
 */
export function generateResourceData(communityId: string): ResourceTestData {
  return {
    title: generateTestName('Test Resource'),
    description: faker.lorem.paragraph(),
    category: ResourceCategory.FOOD,
    type: 'offer' as const,
    communityId,
    isActive: true,
    imageUrls: [],
  };
}

/**
 * Generates test data for event creation
 */
export function generateEventData(communityId: string, organizerId: string): EventTestData {
  const startDate = faker.date.future();
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

  return {
    title: generateTestName('Test Event'),
    description: faker.lorem.paragraph(),
    communityId,
    organizerId,
    startDateTime: startDate,
    endDateTime: endDate,
    location: faker.location.streetAddress(),
    coordinates: { lat: faker.location.latitude(), lng: faker.location.longitude() },
    isActive: true,
  };
}

/**
 * Generates test data for thanks creation
 */
export function generateThanksData(fromUserId: string, toUserId: string, resourceId: string): ThanksTestData {
  return {
    fromUserId,
    toUserId,
    resourceId,
    message: faker.lorem.sentence(),
    impactDescription: faker.lorem.paragraph(),
    imageUrls: [],
  };
}

/**
 * Common expectations for successful mutations
 */
export const commonSuccessExpectation = {
  isSuccess: true,
  error: null,
};

/**
 * Common expectations for successful queries
 */
export const commonQuerySuccessExpectation = {
  isSuccess: true,
  data: expect.any(Array),
  error: null,
};

/**
 * Common cleanup pattern for mutations
 */
export async function waitForMutationSuccess(mutationResult: any) {
  await waitFor(() => {
    expect(mutationResult.current).toMatchObject(commonSuccessExpectation);
  });
}

/**
 * Common cleanup pattern for deletion with state reset
 */
export async function performCleanupDeletion(
  deleteMutation: any, 
  itemId: string,
  act: any,
  waitFor: any
) {
  await act(async () => {
    deleteMutation.current.mutate(itemId);
  });
  
  await waitFor(() => {
    expect(deleteMutation.current).toMatchObject(commonSuccessExpectation);
  });
  
  // Reset mutation state for next iteration
  deleteMutation.current.reset();
}