import { faker } from "@faker-js/faker";
import { ResourceCategory, ResourceData } from "../../../src";
import type { CommunityBoundary, CircularBoundary, IsochroneBoundary } from "../../../src";

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName?: string;
}

export interface TestCommunity {
  name: string;
  description: string;
  level: "neighborhood" | "city" | "region" | "state" | "country";
  timeZone: string;
  hierarchyPath: Array<{ level: string; name: string }>;
  memberCount: number;
  boundary?: CommunityBoundary;
}

export interface TestResource {
  title: string;
  description: string;
  type: "offer" | "request";
  category: string;
  imageUrls?: string[];
}

export interface TestEvent {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  isVirtual: boolean;
  maxAttendees?: number;
}

export interface TestShoutout {
  message: string;
  isPublic: boolean;
}

export class TestDataFactory {
  static generateTestName(prefix: string): string {
    const timestamp = Date.now();
    const random = faker.string.alphanumeric(6);
    return `INTEGRATION_TEST_${prefix}-${timestamp}-${random}`;
  }

  /**
   * Generate test names with configurable prefix for easier cleanup
   */
  static generateTestNameWithPrefix(prefix: string, testType: string): string {
    const timestamp = Date.now();
    const random = faker.string.alphanumeric(6);
    return `${prefix}_${testType}_${timestamp}_${random}`;
  }

  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const timestamp = Date.now();
    const random = faker.string.alphanumeric(4);

    return {
      email: `test-user-${timestamp}-${random}@example.com`,
      password: "TestPassword123!",
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      ...overrides,
    };
  }

  static createCommunity(
    overrides: Partial<TestCommunity> = {},
  ): TestCommunity {
    return {
      name: this.generateTestName("COMMUNITY"),
      description: faker.lorem.paragraph(),
      level: "neighborhood",
      timeZone: "America/New_York",
      hierarchyPath: [
        { level: "state", name: "New York" },
        { level: "city", name: "New York City" },
        { level: "neighborhood", name: "Manhattan" },
      ],
      memberCount: 1,
      ...overrides,
    };
  }

  static createResource(overrides: Partial<ResourceData> = {}): ResourceData {
    const types = ["offer", "request"] as const;

    return {
      title: this.generateTestName("RESOURCE"),
      communityId: "",
      description: faker.lorem.paragraphs(2),
      type: faker.helpers.arrayElement(types),
      category: faker.helpers.enumValue(ResourceCategory),
      imageUrls: [], // Empty array to satisfy not-null constraint
      ...overrides,
    };
  }

  static createEvent(overrides: Partial<TestEvent> = {}): TestEvent {
    const startTime = faker.date.future();
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    return {
      title: this.generateTestName("EVENT"),
      description: faker.lorem.paragraph(),
      startTime,
      endTime,
      location: faker.location.streetAddress(),
      isVirtual: faker.datatype.boolean(),
      maxAttendees: faker.number.int({ min: 10, max: 100 }),
      ...overrides,
    };
  }

  static createShoutout(overrides: Partial<TestShoutout> = {}): TestShoutout {
    const messages = [
      "Thank you so much for your help!",
      "Really appreciate you sharing this resource.",
      "This was exactly what I was looking for!",
      "You're amazing, thanks for organizing this.",
      "Super helpful, thank you!",
    ];

    return {
      message: faker.helpers.arrayElement(messages),
      isPublic: faker.datatype.boolean(),
      ...overrides,
    };
  }

  static createMessage(overrides: { content?: string } = {}): {
    content: string;
  } {
    return {
      content: faker.lorem.sentence(),
      ...overrides,
    };
  }

  static createCredentials(): { email: string; password: string } {
    return {
      email: this.createUser().email,
      password: "TestPassword123!",
    };
  }

  static createMultipleUsers(count: number): TestUser[] {
    return Array.from({ length: count }, () => this.createUser());
  }

  static createMultipleCommunities(count: number): TestCommunity[] {
    return Array.from({ length: count }, () => this.createCommunity());
  }

  static createMultipleResources(count: number): TestResource[] {
    return Array.from({ length: count }, () => this.createResource());
  }

  /**
   * Enhanced test data generators with specialized configurations
   */
  static createTestResourceWithCategory(
    category: ResourceCategory,
  ): TestResource {
    return this.createResource({ category });
  }

  static createTestEvent(
    communityId: string,
    organizerId: string,
  ): TestEvent & { communityId: string; organizerId: string } {
    const baseEvent = this.createEvent();
    return {
      ...baseEvent,
      communityId,
      organizerId,
    };
  }

  static createTestShoutout(
    fromUserId: string,
    toUserId: string,
    resourceId: string,
  ): TestShoutout & {
    fromUserId: string;
    toUserId: string;
    resourceId: string;
  } {
    const baseShoutout = this.createShoutout();
    return {
      ...baseShoutout,
      fromUserId,
      toUserId,
      resourceId,
      message:
        this.generateTestName("SHOUTOUT") + " - " + faker.lorem.sentence(),
    };
  }

  /**
   * Batch test data creation utilities
   */
  static createTestBatch<T>(
    createFn: () => T,
    count: number,
    validator?: (item: T) => boolean,
  ): T[] {
    const items: T[] = [];
    let attempts = 0;
    const maxAttempts = count * 3; // Allow some retries for validation failures

    while (items.length < count && attempts < maxAttempts) {
      const item = createFn();
      if (!validator || validator(item)) {
        items.push(item);
      }
      attempts++;
    }

    if (items.length < count) {
      console.warn(
        `Only created ${items.length} of ${count} requested test items after ${attempts} attempts`,
      );
    }

    return items;
  }

  /**
   * Specialized cleanup utilities
   */
  static isTestResource(item: any): boolean {
    return item?.title?.includes("INTEGRATION_TEST_") || false;
  }

  static isTestUser(item: any): boolean {
    return item?.email?.includes("test-user-") || false;
  }

  static isTestCommunity(item: any): boolean {
    return item?.name?.includes("INTEGRATION_TEST_") || false;
  }

  static isTestEvent(item: any): boolean {
    return item?.title?.includes("INTEGRATION_TEST_") || false;
  }

  static isTestShoutout(item: any): boolean {
    return item?.message?.includes("INTEGRATION_TEST_") || false;
  }

  /**
   * Boundary-specific test data generators
   */
  static createCircularBoundary(overrides: Partial<CircularBoundary> = {}): CircularBoundary {
    return {
      type: 'circular',
      center: { lng: -74.0060, lat: 40.7128 }, // New York City coordinates
      radiusKm: faker.number.float({ min: 0.5, max: 10 }),
      ...overrides,
    };
  }

  static createIsochroneBoundary(overrides: Partial<IsochroneBoundary> = {}): IsochroneBoundary {
    const center = { lng: -74.0060, lat: 40.7128 }; // New York City coordinates
    
    // Create a simple rectangular polygon around the center for testing
    const offset = 0.01; // roughly 1km
    const polygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[
        [center.lng - offset, center.lat - offset],
        [center.lng + offset, center.lat - offset],
        [center.lng + offset, center.lat + offset],
        [center.lng - offset, center.lat + offset],
        [center.lng - offset, center.lat - offset], // Close the polygon
      ]],
    };

    return {
      type: 'isochrone',
      center,
      travelMode: faker.helpers.arrayElement(['walking', 'cycling', 'driving']),
      travelTimeMin: faker.number.int({ min: 5, max: 60 }),
      polygon,
      areaSqKm: faker.number.float({ min: 1, max: 50 }),
      ...overrides,
    };
  }

  static createCommunityWithBoundary(
    boundaryType: 'circular' | 'isochrone',
    overrides: Partial<TestCommunity> = {}
  ): TestCommunity {
    const boundary = boundaryType === 'circular' 
      ? this.createCircularBoundary()
      : this.createIsochroneBoundary();

    return this.createCommunity({
      ...overrides,
      boundary,
    });
  }
}

// Export a default instance for convenience
export const testDataFactory = new TestDataFactory();
