import { faker } from '@faker-js/faker';
import { EventAttendanceRow, EventRow } from '../types/database';

/**
 * Creates a mock database Event row
 */
export function createMockDbEvent(overrides: Partial<EventRow> = {}): EventRow {
  const now = new Date().toISOString();
  const startDateTime = faker.date.future().toISOString();
  const endDateTime = faker.datatype.boolean()
    ? faker.date.future().toISOString()
    : null;

  return {
    id: faker.string.uuid(),
    title: faker.lorem.words({ min: 2, max: 6 }),
    description: faker.lorem.paragraphs(2),
    organizer_id: faker.string.uuid(),
    community_id: faker.string.uuid(),
    start_date_time: startDateTime,
    end_date_time: endDateTime,
    location: faker.location.streetAddress(),
    coordinates: `POINT(${faker.location.longitude()} ${faker.location.latitude()})`,
    parking_info: faker.lorem.sentence(),
    max_attendees: faker.datatype.boolean()
      ? faker.number.int({ min: 5, max: 100 })
      : null,
    registration_required: faker.datatype.boolean(),
    is_all_day: faker.datatype.boolean(),
    tags: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () =>
      faker.lorem.word()
    ),
    image_urls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.urlLoremFlickr({ category: 'event' })
    ),
    attendee_count: faker.number.int({ min: 0, max: 50 }),
    deleted_at: null,
    deleted_by: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function createMockDbEventAttendance(
  overrides: Partial<EventAttendanceRow> = {}
): EventAttendanceRow {
  const now = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    event_id: faker.string.uuid(),
    status: 'attending',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}