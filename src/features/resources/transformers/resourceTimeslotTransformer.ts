import type { ResourceTimeslot, ResourceTimeslotInput, ResourceTimeslotRow, ResourceTimeslotInsert, ResourceTimeslotUpdate } from '../types';

/**
 * Transform a domain timeslot object to a database timeslot record
 */
export function toResourceTimeslotInsertRow(
  timeslot: ResourceTimeslotInput,
): ResourceTimeslotInsert {
  return {
    resource_id: timeslot.resourceId,
    start_time: timeslot.startTime.toISOString(),
    end_time: timeslot.endTime.toISOString(),
    max_claims: timeslot.maxClaims,
  };
}

/**
 * Transform a domain timeslot object to a database timeslot record for updates
 */
export function forDbTimeslotUpdate(
  timeslot: Partial<ResourceTimeslotInput>,
): ResourceTimeslotUpdate {
  return {
    start_time: timeslot.startTime?.toISOString(),
    end_time: timeslot.endTime?.toISOString(),
    max_claims: timeslot.maxClaims,
  };
}

/**
 * Transform a database timeslot record to a ResourceTimeslot object
 */
export function toDomainResourceTimeslot(
  dbTimeslot: ResourceTimeslotRow,
): ResourceTimeslot {
  return {
    id: dbTimeslot.id,
    resourceId: dbTimeslot.resource_id,
    startTime: new Date(dbTimeslot.start_time),
    endTime: new Date(dbTimeslot.end_time),
    maxClaims: dbTimeslot.max_claims,
    createdAt: new Date(dbTimeslot.created_at),
    updatedAt: new Date(dbTimeslot.updated_at),
  };
}