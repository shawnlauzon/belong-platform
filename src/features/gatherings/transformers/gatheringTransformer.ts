import type {
  Gathering,
  GatheringInput,
  GatheringResponseInput,
  GatheringResponse,
} from '../types';
import type {
  GatheringRow,
  GatheringRowWithRelations,
  GatheringInsertRow,
  GatheringUpdateRow,
  GatheringResponseInsertRow,
  GatheringResponseRow,
} from '../types/gatheringRow';
import { parsePostGisPoint, toPostGisPoint } from '../../../shared/utils';
import type { UserSummary } from '../../users';
import type { CommunitySummary } from '../../communities';
import { toDomainCommunitySummary } from '../../communities/transformers/communityTransformer';

/**
 * Transform a database gathering record to a domain gathering object
 */
export function toDomainGathering(
  dbGathering: GatheringRow,
  refs: {
    organizer: UserSummary;
    community: CommunitySummary;
    attendees?: UserSummary[];
  },
): Gathering {
  if (dbGathering.organizer_id !== refs.organizer.id) {
    throw new Error('Organizer ID does not match');
  }

  if (dbGathering.community_id !== refs.community.id) {
    throw new Error('Community ID does not match');
  }

  return {
    id: dbGathering.id,
    title: dbGathering.title,
    description: dbGathering.description,
    startDateTime: new Date(dbGathering.start_date_time),
    endDateTime: dbGathering.end_date_time
      ? new Date(dbGathering.end_date_time)
      : undefined,
    isAllDay: dbGathering.is_all_day,
    locationName: dbGathering.location_name,
    coordinates: parsePostGisPoint(dbGathering.coordinates),
    maxAttendees: dbGathering.max_attendees ?? undefined,
    imageUrls: dbGathering.image_urls || [],
    attendeeCount: dbGathering.attendee_count,
    createdAt: new Date(dbGathering.created_at),
    updatedAt: new Date(dbGathering.updated_at),
    organizerId: dbGathering.organizer_id,
    organizer: refs.organizer,
    communityId: dbGathering.community_id,
    community: refs.community,
  };
}

/**
 * Transform a domain gathering object to a database gathering record for insert
 */
export function toGatheringInsertRow(
  gathering: GatheringInput,
): GatheringInsertRow {
  return {
    title: gathering.title,
    description: gathering.description,
    community_id: gathering.communityId,
    organizer_id: gathering.organizerId,
    start_date_time: gathering.startDateTime.toISOString(),
    end_date_time: gathering.endDateTime?.toISOString() || null,
    is_all_day: gathering.isAllDay,
    location_name: gathering.locationName,
    coordinates: toPostGisPoint(gathering.coordinates),
    max_attendees: gathering.maxAttendees ?? null,
    image_urls: gathering.imageUrls || [],
  };
}

/**
 * Transform a domain gathering object to a database gathering record for update
 */
export function toGatheringUpdateRow(
  gathering: Partial<GatheringInput>,
): GatheringUpdateRow {
  return {
    title: gathering.title,
    description: gathering.description,
    start_date_time: gathering.startDateTime?.toISOString(),
    end_date_time: gathering.endDateTime?.toISOString() || null,
    is_all_day: gathering.isAllDay,
    location_name: gathering.locationName,
    coordinates: gathering.coordinates
      ? toPostGisPoint(gathering.coordinates)
      : undefined,
    max_attendees: gathering.maxAttendees ?? null,
    image_urls: gathering.imageUrls || [],
  };
}

/**
 * Transform a database gathering record with joined relations to a Gathering object
 */
export function toGatheringWithJoinedRelations(
  dbGathering: GatheringRowWithRelations,
): Gathering {
  // Handle potential array results from Supabase joins
  const organizer = Array.isArray(dbGathering.organizer)
    ? dbGathering.organizer[0]
    : dbGathering.organizer;
  const community = Array.isArray(dbGathering.community)
    ? dbGathering.community[0]
    : dbGathering.community;

  // Validate required joined data
  if (!organizer) {
    throw new Error(
      `Gathering ${dbGathering.id} missing required organizer data`,
    );
  }
  if (!community) {
    throw new Error(
      `Gathering ${dbGathering.id} missing required community data`,
    );
  }

  // Transform organizer to UserSummary
  const partialOrganizer = organizer
    ? {
        id: organizer.id,
        firstName: organizer.user_metadata?.first_name || '',
        avatarUrl: organizer.user_metadata?.avatar_url,
        createdAt: new Date(organizer.created_at),
        updatedAt: new Date(organizer.updated_at),
      }
    : null;

  return {
    id: dbGathering.id,
    title: dbGathering.title,
    description: dbGathering.description,
    startDateTime: new Date(dbGathering.start_date_time),
    endDateTime: dbGathering.end_date_time
      ? new Date(dbGathering.end_date_time)
      : undefined,
    isAllDay: dbGathering.is_all_day,
    locationName: dbGathering.location_name,
    coordinates: parsePostGisPoint(dbGathering.coordinates),
    maxAttendees: dbGathering.max_attendees ?? undefined,
    imageUrls: dbGathering.image_urls || [],
    attendeeCount: dbGathering.attendee_count,
    createdAt: new Date(dbGathering.created_at),
    updatedAt: new Date(dbGathering.updated_at),
    organizerId: dbGathering.organizer_id,
    organizer: partialOrganizer!,
    communityId: dbGathering.community_id,
    community: toDomainCommunitySummary(community),
  };
}

/**
 * Transform a database gathering attendance record to a domain gathering attendance object
 */
export function toDomainGatheringResponse(
  dbAttendance: GatheringResponseRow,
): GatheringResponse {
  return {
    gatheringId: dbAttendance.gathering_id,
    userId: dbAttendance.user_id,
    status: dbAttendance.status as 'attending' | 'not_attending' | 'maybe',
    createdAt: new Date(dbAttendance.created_at),
    updatedAt: new Date(dbAttendance.updated_at),
  };
}

/**
 * Transform a domain gathering attendance object to a database gathering attendance record for insert
 */
export function toGatheringResponseInsertRow(
  attendance: GatheringResponseInput,
): GatheringResponseInsertRow {
  return {
    gathering_id: attendance.gatheringId,
    user_id: attendance.userId,
    status: attendance.status,
  };
}
