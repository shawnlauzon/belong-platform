import type {
  ActivityItem,
  ActivityType,
  ActivityFeedFilter,
  Resource,
  Event,
  Thanks,
  User,
  Community,
} from '@belongnetwork/types';
import { supabase, logger } from '@belongnetwork/core';
import { fetchUserById } from '../../users/impl';
import { fetchCommunityById } from '../../communities/impl';
import { parsePostGisPoint } from '../../utils';

/**
 * Aggregate activity feed for a community by collecting activities from various sources
 */
export async function aggregateActivityFeed(
  filter: ActivityFeedFilter
): Promise<ActivityItem[]> {
  try {
    const activities: ActivityItem[] = [];
    const { communityId, userId, types = [], pageSize = 20, page = 1, since } = filter;

    // For now, we'll aggregate activities from existing data rather than a dedicated activities table
    // This approach follows the established pattern in the codebase of not creating tables until necessary

    const promises: Promise<void>[] = [];

    // Aggregate resource activities
    if (!types.length || types.includes('resource_created' as ActivityType) || types.includes('resource_updated' as ActivityType)) {
      promises.push(aggregateResourceActivities(activities, filter));
    }

    // Aggregate event activities  
    if (!types.length || types.includes('event_created' as ActivityType) || types.includes('event_updated' as ActivityType)) {
      promises.push(aggregateEventActivities(activities, filter));
    }

    // Aggregate thanks activities
    if (!types.length || types.includes('thanks_given' as ActivityType)) {
      promises.push(aggregateThanksActivities(activities, filter));
    }

    // Aggregate user join activities
    if (!types.length || types.includes('user_joined' as ActivityType)) {
      promises.push(aggregateUserJoinActivities(activities, filter));
    }

    await Promise.all(promises);

    // Sort by creation date (most recent first)
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return activities.slice(startIndex, endIndex);
  } catch (error) {
    logger.error('Failed to aggregate activity feed', { error, filter });
    throw error;
  }
}

async function aggregateResourceActivities(
  activities: ActivityItem[],
  filter: ActivityFeedFilter
): Promise<void> {
  try {
    let query = supabase
      .from('resources')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (filter.communityId) {
      query = query.eq('community_id', filter.communityId);
    }

    if (filter.since) {
      query = query.gte('created_at', filter.since.toISOString());
    }

    const { data: resources, error } = await query.limit(50);

    if (error) throw error;
    if (!resources?.length) return;

    // Batch fetch related data
    const ownerIds = [...new Set(resources.map((r: any) => r.owner_id))];
    const communityIds = [...new Set(resources.map((r: any) => r.community_id))];

    const [owners, communities] = await Promise.all([
      Promise.all(ownerIds.map((id: string) => fetchUserById(id))),
      Promise.all(communityIds.map((id: string) => fetchCommunityById(id)))
    ]);

    const ownerMap = new Map((owners.filter(Boolean) as User[]).map(owner => [owner.id, owner]));
    const communityMap = new Map((communities.filter(Boolean) as Community[]).map(community => [community.id, community]));

    for (const resource of resources) {
      const owner = ownerMap.get(resource.owner_id);
      const community = resource.community_id ? communityMap.get(resource.community_id) : null;

      if (!owner) continue;
      if (resource.community_id && !community) continue;

      // Transform to domain resource for the activity
      const domainResource: Resource = {
        id: resource.id,
        type: resource.type as 'offer' | 'request',
        category: resource.category as any,
        title: resource.title,
        description: resource.description,
        imageUrls: resource.image_urls || [],
        location: resource.location ? JSON.parse(resource.location as string) : undefined,
        pickupInstructions: resource.pickup_instructions || undefined,
        parkingInfo: resource.parking_info || undefined,
        meetupFlexibility: resource.meetup_flexibility as any,
        availability: resource.availability || undefined,
        isActive: resource.is_active,
        owner,
        community: community || undefined,
        createdAt: new Date(resource.created_at),
        updatedAt: new Date(resource.updated_at),
      };

      activities.push({
        id: `resource_created_${resource.id}`,
        type: 'resource_created' as ActivityType,
        communityId: resource.community_id || '',
        actorId: resource.owner_id,
        targetId: resource.id,
        metadata: {
          resourceType: resource.type,
          category: resource.category,
          title: resource.title,
        },
        createdAt: new Date(resource.created_at),
        community: community || undefined,
        actor: owner,
        target: domainResource,
      });
    }
  } catch (error) {
    logger.error('Failed to aggregate resource activities', { error, filter });
  }
}

async function aggregateEventActivities(
  activities: ActivityItem[],
  filter: ActivityFeedFilter
): Promise<void> {
  try {
    let query = supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (filter.communityId) {
      query = query.eq('community_id', filter.communityId);
    }

    if (filter.since) {
      query = query.gte('created_at', filter.since.toISOString());
    }

    const { data: events, error } = await query.limit(50);

    if (error) throw error;
    if (!events?.length) return;

    // Batch fetch related data
    const organizerIds = [...new Set(events.map((e: any) => e.organizer_id))];
    const communityIds = [...new Set(events.map((e: any) => e.community_id))];

    const [organizers, communities] = await Promise.all([
      Promise.all(organizerIds.map((id: string) => fetchUserById(id))),
      Promise.all(communityIds.map((id: string) => fetchCommunityById(id)))
    ]);

    const organizerMap = new Map((organizers.filter(Boolean) as User[]).map(organizer => [organizer.id, organizer]));
    const communityMap = new Map((communities.filter(Boolean) as Community[]).map(community => [community.id, community]));

    for (const event of events) {
      const organizer = organizerMap.get(event.organizer_id);
      const community = communityMap.get(event.community_id);

      if (!organizer || !community) continue;

      // Transform to domain event for the activity
      const domainEvent: Event = {
        id: event.id,
        title: event.title,
        description: event.description,
        startDateTime: new Date(event.start_date_time),
        endDateTime: event.end_date_time ? new Date(event.end_date_time) : undefined,
        location: event.location,
        coordinates: event.coordinates ? parsePostGisPoint(event.coordinates) : { lat: 0, lng: 0 },
        parkingInfo: event.parking_info || undefined,
        maxAttendees: event.max_attendees || undefined,
        registrationRequired: event.registration_required,
        isActive: event.is_active,
        tags: event.tags || [],
        imageUrls: event.image_urls || [],
        attendeeCount: event.attendee_count,
        organizer,
        community: community || undefined,
        createdAt: new Date(event.created_at),
        updatedAt: new Date(event.updated_at),
      };

      activities.push({
        id: `event_created_${event.id}`,
        type: 'event_created' as ActivityType,
        communityId: event.community_id,
        actorId: event.organizer_id,
        targetId: event.id,
        metadata: {
          title: event.title,
          startDateTime: event.start_date_time,
          location: event.location,
        },
        createdAt: new Date(event.created_at),
        community: community || undefined,
        actor: organizer,
        target: domainEvent,
      });
    }
  } catch (error) {
    logger.error('Failed to aggregate event activities', { error, filter });
  }
}

async function aggregateThanksActivities(
  activities: ActivityItem[],
  filter: ActivityFeedFilter
): Promise<void> {
  try {
    let query = supabase
      .from('thanks')
      .select(`
        *,
        resource:resources(*)
      `)
      .order('created_at', { ascending: false });

    if (filter.since) {
      query = query.gte('created_at', filter.since.toISOString());
    }

    const { data: thanksRecords, error } = await query.limit(50);

    if (error) throw error;
    if (!thanksRecords?.length) return;

    // Filter by community through resource relationship
    const filteredThanks = filter.communityId 
      ? thanksRecords.filter((t: any) => t.resource?.community_id === filter.communityId)
      : thanksRecords;

    if (!filteredThanks.length) return;

    // Batch fetch related data
    const fromUserIds = [...new Set(filteredThanks.map((t: any) => t.from_user_id))];
    const communityIds = [...new Set(filteredThanks.map((t: any) => t.resource?.community_id).filter(Boolean))];

    const [fromUsers, communities] = await Promise.all([
      Promise.all(fromUserIds.map((id: string) => fetchUserById(id))),
      Promise.all(communityIds.map((id: string) => fetchCommunityById(id)))
    ]);

    const fromUserMap = new Map((fromUsers.filter(Boolean) as User[]).map(user => [user.id, user]));
    const communityMap = new Map((communities.filter(Boolean) as Community[]).map(community => [community.id, community]));

    for (const thanks of filteredThanks) {
      const fromUser = fromUserMap.get(thanks.from_user_id);
      const community = thanks.resource?.community_id ? communityMap.get(thanks.resource.community_id) : null;
      
      if (!fromUser) continue;
      if (thanks.resource?.community_id && !community) continue;

      activities.push({
        id: `thanks_given_${thanks.id}`,
        type: 'thanks_given' as ActivityType,
        communityId: thanks.resource.community_id || '',
        actorId: thanks.from_user_id,
        targetId: thanks.id,
        metadata: {
          resourceTitle: thanks.resource?.title,
          message: thanks.message,
          toUserId: thanks.to_user_id,
        },
        createdAt: new Date(thanks.created_at),
        community: community || undefined,
        actor: fromUser,
      });
    }
  } catch (error) {
    logger.error('Failed to aggregate thanks activities', { error, filter });
  }
}

async function aggregateUserJoinActivities(
  activities: ActivityItem[],
  filter: ActivityFeedFilter
): Promise<void> {
  try {
    let query = supabase
      .from('community_memberships')
      .select('*')
      .order('joined_at', { ascending: false });

    if (filter.communityId) {
      query = query.eq('community_id', filter.communityId);
    }

    if (filter.since) {
      query = query.gte('joined_at', filter.since.toISOString());
    }

    const { data: memberships, error } = await query.limit(50);

    if (error) throw error;
    if (!memberships?.length) return;

    // Batch fetch related data
    const userIds = [...new Set(memberships.map((m: any) => m.user_id))];
    const communityIds = [...new Set(memberships.map((m: any) => m.community_id))];

    const [users, communities] = await Promise.all([
      Promise.all(userIds.map((id: string) => fetchUserById(id))),
      Promise.all(communityIds.map((id: string) => fetchCommunityById(id)))
    ]);

    const userMap = new Map((users.filter(Boolean) as User[]).map(user => [user.id, user]));
    const communityMap = new Map((communities.filter(Boolean) as Community[]).map(community => [community.id, community]));

    for (const membership of memberships) {
      const user = userMap.get(membership.user_id);
      const community = communityMap.get(membership.community_id);

      if (!user || !community) continue;

      activities.push({
        id: `user_joined_${membership.user_id}_${membership.community_id}`,
        type: 'user_joined' as ActivityType,
        communityId: membership.community_id,
        actorId: membership.user_id,
        targetId: membership.user_id,
        metadata: {
          role: membership.role,
        },
        createdAt: new Date(membership.joined_at),
        community: community || undefined,
        actor: user,
        target: user,
      });
    }
  } catch (error) {
    logger.error('Failed to aggregate user join activities', { error, filter });
  }
}