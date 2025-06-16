import { createMockResource as createMockResourceFromMocks } from '../../test-utils/mocks';

export function createMockResource(overrides: any = {}) {
  return createMockResourceFromMocks(overrides);
}

export function createMockDbResource(overrides: any = {}) {
  const resource = createMockResource(overrides);
  const { owner, community, createdAt, updatedAt, meetupFlexibility, imageUrls, pickupInstructions, parkingInfo, isActive, ...rest } = resource;
  
  return {
    ...rest,
    owner_id: owner.id,
    community_id: community.id,
    created_at: createdAt.toISOString(),
    updated_at: updatedAt.toISOString(),
    meetup_flexibility: meetupFlexibility,
    image_urls: imageUrls,
    pickup_instructions: pickupInstructions,
    parking_info: parkingInfo,
    is_active: isActive,
    ...overrides,
  };
}
