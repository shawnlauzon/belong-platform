import { createMockEvent as createMockEventFromMocks, createMockEventData } from '../../test-utils/mocks';

export function createMockEvent(overrides: any = {}) {
  return createMockEventFromMocks(overrides);
}

export function createMockDbEvent(overrides: any = {}) {
  const event = createMockEvent(overrides);
  const { 
    organizer, 
    community, 
    startDateTime,
    endDateTime,
    coordinates,
    parkingInfo,
    maxAttendees,
    registrationRequired,
    isActive,
    attendeeCount,
    createdAt, 
    updatedAt, 
    ...rest 
  } = event;
  
  return {
    ...rest,
    organizer_id: organizer.id,
    community_id: community.id,
    start_date_time: startDateTime.toISOString(),
    end_date_time: endDateTime?.toISOString() || null,
    coordinates,
    parking_info: parkingInfo,
    max_attendees: maxAttendees,
    registration_required: registrationRequired,
    is_active: isActive,
    attendee_count: attendeeCount,
    created_at: createdAt.toISOString(),
    updated_at: updatedAt.toISOString(),
    ...overrides,
  };
}

export { createMockEventData };