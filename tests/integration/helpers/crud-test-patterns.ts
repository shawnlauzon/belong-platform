import { faker } from "@faker-js/faker";
import { ResourceCategory } from "@belongnetwork/platform";
import { generateTestName } from "../database/utils/database-helpers";
import { waitFor } from "@testing-library/react";

/**
 * Common test data generators for CRUD operations
 */

export interface ResourceTestData {
  title: string;
  description: string;
  category: ResourceCategory;
  type: "offer" | "request";
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
    title: generateTestName("RESOURCE"),
    description: faker.lorem.paragraph(),
    category: ResourceCategory.FOOD,
    type: "offer" as const,
    communityId,
    isActive: true,
    imageUrls: [],
  };
}

/**
 * Generates test data for event creation
 */
export function generateEventData(
  communityId: string,
  organizerId: string,
): EventTestData {
  const startDate = faker.date.future();
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

  return {
    title: generateTestName("EVENT"),
    description: faker.lorem.paragraph(),
    communityId,
    organizerId,
    startDateTime: startDate,
    endDateTime: endDate,
    location: faker.location.streetAddress(),
    coordinates: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    isActive: true,
  };
}

/**
 * Generates test data for thanks creation
 */
export function generateThanksData(
  fromUserId: string,
  toUserId: string,
  resourceId: string,
): ThanksTestData {
  return {
    fromUserId,
    toUserId,
    resourceId,
    message: generateTestName("THANKS") + " - " + faker.lorem.sentence(),
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
 * Common expectations for successful delete mutations (return void)
 */
export const commonDeleteSuccessExpectation = {
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
  waitFor: any,
) {
  await act(async () => {
    deleteMutation.current.mutate(itemId);
  });

  await waitFor(() => {
    expect(deleteMutation.current).toMatchObject(
      commonDeleteSuccessExpectation,
    );
  });

  // Reset mutation state for next iteration
  deleteMutation.current.reset();
}

/**
 * Name-based cleanup for integration test resources
 */
export async function cleanupTestResources(
  wrapper: any,
  resourceType: "resource" | "event" | "community" | "thanks",
  useListHook: any,
  act: any,
  waitFor: any,
) {
  try {
    // Get list of all items using consolidated hook
    const { result: listResult } = useListHook(wrapper);

    // Wait for hook to initialize
    await waitFor(() => {
      expect(listResult.current).toBeDefined();
      expect(typeof listResult.current.list).toBe('function');
    }, { timeout: 10000 });

    // Fetch all items using new API
    const allItems = await listResult.current.list();
    
    if (allItems && Array.isArray(allItems)) {
      // Find all items with INTEGRATION_TEST_ prefix
      const testItems = allItems.filter((item: any) => {
        const nameField = resourceType === "thanks" ? "message" : 
                         resourceType === "community" ? "name" : "title";
        return item[nameField]?.includes("INTEGRATION_TEST_");
      });

      if (testItems.length > 0) {
        console.log(`Found ${testItems.length} test ${resourceType}s to clean up`);
        
        // Limit cleanup to prevent timeouts - only clean up recent items
        const recentItems = testItems.slice(0, 10); // Only clean up 10 most recent items
        
        if (recentItems.length < testItems.length) {
          console.warn(`Limiting cleanup to ${recentItems.length} most recent items out of ${testItems.length} total`);
        }

        // Delete items using the same hook (new API includes delete function)
        await act(async () => {
          const deletePromises = recentItems.map(item => 
            listResult.current.delete(item.id)
          );
          await Promise.all(deletePromises);
        });
      }
    }
  } catch (error) {
    // Ignore cleanup errors to avoid test failures
    console.warn(`Cleanup failed for ${resourceType}:`, error);
  }
}

/**
 * Cleanup test users by email pattern
 */
export async function cleanupTestUsers(
  wrapper: any,
  useUsersHook: any,
  useDeleteUserHook: any,
  act: any,
  waitFor: any,
) {
  try {
    const { result: usersResult } = useUsersHook(wrapper);

    await waitFor(() => {
      expect(usersResult.current.isSuccess || usersResult.current.isError).toBe(
        true,
      );
    });

    if (usersResult.current.isSuccess && usersResult.current.data) {
      // Find all users with integration test email pattern
      const testUsers = usersResult.current.data.filter((user: any) =>
        user.email?.includes("integration-test-"),
      );

      if (testUsers.length > 0) {
        const { result: deleteResult } = useDeleteUserHook(wrapper);

        // Delete all test users
        for (const user of testUsers) {
          await performCleanupDeletion(deleteResult, user.id, act, waitFor);
        }
      }
    }
  } catch (error) {
    // Ignore cleanup errors to avoid test failures
    console.warn("User cleanup failed:", error);
  }
}
