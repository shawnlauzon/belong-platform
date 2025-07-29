import type { ResourceTimeslot, ResourceTimeslotInput } from '../types';
import type {
  ResourceTimeslotRow,
  ResourceTimeslotInsertDbData,
  ResourceTimeslotUpdateDbData,
} from '../types/resourceRow';

/**
 * Transform a domain timeslot object to a database timeslot record
 */
export function toResourceTimeslotInsertRow(
  timeslot: ResourceTimeslotInput,
): ResourceTimeslotInsertDbData {
  return {
    resource_id: timeslot.resourceId,
    start_time: timeslot.startTime.toISOString(),
    end_time: timeslot.endTime.toISOString(),
  };
}

/**
 * Transform a domain timeslot object to a database timeslot record for updates
 */
export function forDbTimeslotUpdate(
  timeslot: Partial<ResourceTimeslotInput>,
): ResourceTimeslotUpdateDbData {
  return {
    start_time: timeslot.startTime?.toISOString(),
    end_time: timeslot.endTime?.toISOString(),
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
    status: dbTimeslot.status,
    createdAt: new Date(dbTimeslot.created_at),
    updatedAt: new Date(dbTimeslot.updated_at),
  };
}
