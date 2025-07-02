import { Community } from '../../communities';
import { User } from '../../users';
import { ResourceCategory } from './database';

export interface Resource extends Omit<ResourceData, 'communityId'> {
  id: string;
  owner: User;
  community?: Community;
  createdAt: Date;
  updatedAt: Date;
}

export enum MeetupFlexibility {
  HOME_ONLY = 'home_only',
  PUBLIC_MEETUP_OK = 'public_meetup_ok',
  DELIVERY_POSSIBLE = 'delivery_possible',
}

// ResourceCategory is re-exported from database types

export interface ResourceData {
  type: 'offer' | 'request';
  category: ResourceCategory;
  title: string;
  description: string;
  communityId: string;
  imageUrls?: string[];
  location?: { lat: number; lng: number };
  pickupInstructions?: string;
  parkingInfo?: string;
  meetupFlexibility?: MeetupFlexibility;
  availability?: string;
  isActive: boolean;
}

// Info version for list operations - includes all domain properties but only IDs for references
export interface ResourceInfo extends Omit<Resource, 'owner' | 'community'> {
  ownerId: string; // Replaces owner: User
  communityId: string; // Replaces community?: Community
}

export interface MeetupSpot {
  name: string;
  lat: number;
  lng: number;
  type: string;
}

export interface ResourceFilter {
  category?: 'tools' | 'skills' | 'food' | 'supplies' | 'other' | 'all';
  type?: 'offer' | 'request' | 'all';
  communityId?: string;
  ownerId?: string;
  isActive?: boolean;
  maxDriveMinutes?: number;
  searchTerm?: string;
  minTrustScore?: number;
}

// Note: ResourceFilters interface was a duplicate with different field names
// Consider consolidating with ResourceFilter if needed