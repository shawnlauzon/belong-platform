import type { CommunityRow } from './transformers.types';
import type { Community } from '../types/entities';
import { parsePostGisPoint, toPostGisPoint } from './utils';
import { useBelongStore } from '../stores';
import { logger } from '../utils';

// create type for insert community
export type InsertCommunity = Omit<
  CommunityRow,
  'id' | 'created_at' | 'updated_at'
>;

export function useCommunityTransformers(): {
  toDomainCommunity: (dbCommunity: CommunityRow) => Community;
  toDbCommunity: (community: Community) => CommunityRow;
} {
  const communities = useBelongStore((state) => state.communities.list);
  const users = useBelongStore((state) => state.users.list);

  const toDomainCommunity = (dbCommunity: CommunityRow): Community => {
    if (!dbCommunity) {
      throw new Error('Database community is required');
    }

    const parent = communities.find((c) => c.id === dbCommunity.parent_id);
    const creator = users.find((c) => c.id === dbCommunity.creator_id);

    if (!parent) {
      // TODO query for community from database
      logger.error(`Community ${dbCommunity.id} not found`);
      logger.info(`communities: ${JSON.stringify(communities, null, 2)}`);
      throw new Error(`Community ${dbCommunity.id} not found`);
    }

    if (!creator) {
      logger.error(`User ${dbCommunity.creator_id} not found`);
      logger.info(`users: ${JSON.stringify(users, null, 2)}`);
      throw new Error(`User ${dbCommunity.creator_id} not found`);
    }

    return {
      parent_id: dbCommunity.parent_id,
      creator: creator,
      country: parent.country,
      state: parent.state,
      city: parent.city,
      neighborhood:
        dbCommunity.level === 'neighborhood' ? dbCommunity.name : null,
      created_at: new Date(dbCommunity.created_at),
      updated_at: new Date(dbCommunity.updated_at),
      center: parsePostGisPoint(dbCommunity.center),
      id: dbCommunity.id,
      name: dbCommunity.name,
      description: dbCommunity.description,
      member_count: dbCommunity.member_count,
      radius_km: dbCommunity.radius_km ?? undefined,
    };
  };

  const toDbCommunity = (community: Community): CommunityRow => {
    const { center, ...rest } = community;
    const dbCenter = center ? toPostGisPoint(center) : undefined;

    if (!community.parent_id) {
      logger.error(`Parent community ${community.parent_id} not found`);
      logger.info(`communities: ${JSON.stringify(communities, null, 2)}`);
      throw new Error(`Parent community ${community.parent_id} not found`);
    }

    // A Community can only be neighborhood or city
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      country,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      state,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      city,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      neighborhood,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      creator,
      ...communityWithoutHierarchy
    } = community;
    return {
      ...communityWithoutHierarchy,
      center: dbCenter,
      level: community.neighborhood ? 'neighborhood' : 'city',
      created_at: community.created_at.toISOString(),
      updated_at: community.updated_at.toISOString(),
      creator_id: community.creator.id,
      radius_km: community.radius_km,
    } as CommunityRow;
  };

  return { toDomainCommunity, toDbCommunity };
}
