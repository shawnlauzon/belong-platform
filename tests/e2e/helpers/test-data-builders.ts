import { faker } from '@faker-js/faker';

/**
 * Test data builders for E2E tests
 */

export function createTestCommunity(overrides?: Partial<CommunityTestData>) {
  return {
    name: faker.location.city() + ' Community',
    description: faker.lorem.sentence(),
    level: 'neighborhood',
    timeZone: 'America/New_York',
    ...overrides
  };
}

export function createTestResource(overrides?: Partial<ResourceTestData>) {
  return {
    name: faker.company.name() + ' Resource',
    description: faker.lorem.paragraph(),
    category: faker.helpers.arrayElement(['space', 'equipment', 'service', 'knowledge']),
    ...overrides
  };
}

export function createTestEvent(overrides?: Partial<EventTestData>) {
  const startDate = faker.date.future();
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 2);

  return {
    name: faker.lorem.words(3) + ' Event',
    description: faker.lorem.paragraph(),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    location: faker.location.streetAddress(),
    maxAttendees: faker.number.int({ min: 5, max: 50 }),
    ...overrides
  };
}

export function createTestShoutout(overrides?: Partial<ShoutoutTestData>) {
  return {
    message: 'Thanks for ' + faker.company.buzzPhrase() + '!',
    type: faker.helpers.arrayElement(['thanks', 'appreciation', 'recognition']),
    ...overrides
  };
}

export function createTestMessage(overrides?: Partial<MessageTestData>) {
  return {
    content: faker.lorem.sentence(),
    ...overrides
  };
}

export function createTestUser(overrides?: Partial<UserTestData>) {
  return {
    email: faker.internet.email(),
    password: faker.internet.password({ length: 12 }),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    ...overrides
  };
}

// Type definitions
interface CommunityTestData {
  name: string;
  description: string;
  level: string;
  timeZone: string;
}

interface ResourceTestData {
  name: string;
  description: string;
  category: string;
  meetupFlexibility: string;
}

interface EventTestData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  maxAttendees: number;
}

interface ShoutoutTestData {
  message: string;
  type: string;
  recipientId?: string;
}

interface MessageTestData {
  content: string;
  recipientId?: string;
}

interface UserTestData {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
}

/**
 * Utility functions for test data
 */

export function generateUniqueEmail(prefix?: string) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix || 'test'}_${timestamp}_${random}@example.com`;
}

export function generateUniqueName(prefix: string) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}_${timestamp}_${random}`;
}

// Helper to clean up test data by marking with test prefix
export const TEST_DATA_PREFIX = 'E2E_TEST_';

export function markAsTestData(name: string) {
  return TEST_DATA_PREFIX + name;
}

export function isTestData(name: string) {
  return name.startsWith(TEST_DATA_PREFIX);
}