import { 
  createMockEvent as createMockEventFromMocks, 
  createMockEventData,
  createMockEventAttendance as createMockEventAttendanceFromMocks,
  createMockEventAttendanceData
} from '../../test-utils/mocks';

export function createMockEvent(overrides: any = {}) {
  return createMockEventFromMocks(overrides);
}

export function createMockEventAttendance(overrides: any = {}) {
  return createMockEventAttendanceFromMocks(overrides);
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

export function createMockDbEventAttendance(overrides: any = {}) {
  const attendance = createMockEventAttendance(overrides);
  const { 
    event,
    user,
    eventId,
    userId,
    createdAt, 
    updatedAt, 
    ...rest 
  } = attendance;
  
  return {
    ...rest,
    event_id: eventId,
    user_id: userId,
    created_at: createdAt.toISOString(),
    updated_at: updatedAt.toISOString(),
    ...overrides,
  };
}

export { createMockEventData, createMockEventAttendanceData };