import { faker } from "@faker-js/faker";
import { ShoutoutRow } from "../types/database";
import type { ShoutoutData } from "../types";


export function createMockDbShoutout(
  overrides: Partial<ShoutoutRow> = {},
): ShoutoutRow {
  const now = new Date().toISOString();

  return {
    id: faker.string.uuid(),
    from_user_id: faker.string.uuid(),
    to_user_id: faker.string.uuid(),
    resource_id: faker.string.uuid(),
    message: faker.lorem.paragraph(),
    image_urls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.url(),
    ),
    impact_description: faker.datatype.boolean()
      ? faker.lorem.sentence()
      : null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function createMockShoutoutData(
  overrides: Partial<ShoutoutData> = {},
): ShoutoutData {
  return {
    fromUserId: faker.string.uuid(),
    toUserId: faker.string.uuid(),
    resourceId: faker.string.uuid(),
    message: faker.lorem.paragraph(),
    imageUrls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.url(),
    ),
    impactDescription: faker.datatype.boolean()
      ? faker.lorem.sentence()
      : undefined,
    ...overrides,
  };
}
