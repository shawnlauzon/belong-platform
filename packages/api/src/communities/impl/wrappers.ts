/**
 * Wrapper functions for community impl that use getBelongClient
 * This is a temporary compatibility layer during migration to services
 */
import { getBelongClient } from '@belongnetwork/core';
import type { Community, CommunityData } from '@belongnetwork/types';
import * as impl from './index';

export async function createCommunity(data: CommunityData): Promise<Community> {
  return impl.createCommunity(getBelongClient(), data);
}

export async function updateCommunity(
  id: string,
  data: Partial<CommunityData>
): Promise<Community> {
  return impl.updateCommunity(getBelongClient(), id, data);
}

export async function deleteCommunity(id: string): Promise<void> {
  return impl.deleteCommunity(getBelongClient(), id);
}

export async function restoreCommunity(id: string): Promise<Community> {
  return impl.restoreCommunity(getBelongClient(), id);
}