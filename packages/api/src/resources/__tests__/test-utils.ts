import { faker } from '@faker-js/faker';
import type { Resource, ResourceCategory } from '@belongnetwork/types';

export function createMockResource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.words(3),
    description: faker.lorem.paragraph(),
    category: faker.helpers.arrayElement([
      'FOOD',
      'HOUSING',
      'HEALTH',
      'EDUCATION',
      'EMPLOYMENT',
    ]) as ResourceCategory,
    url: faker.internet.url(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zipCode: faker.location.zipCode(),
    country: faker.location.country(),
    location: {
      latitude: parseFloat(faker.location.latitude()),
      longitude: parseFloat(faker.location.longitude()),
    },
    isApproved: true,
    isActive: true,
    ownerId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockDbResource(overrides: any = {}) {
  const resource = createMockResource(overrides);
  const { zipCode, isApproved, isActive, ownerId, communityId, ...rest } = resource;
  
  return {
    ...rest,
    zip_code: zipCode,
    is_approved: isApproved,
    is_active: isActive,
    owner_id: ownerId,
    community_id: communityId,
    ...overrides,
  };
}
