import { ResourceCategory } from '@belongnetwork/types';

export interface ResourceFilters {
  category?: ResourceCategory;
  communityId?: string;
  search?: string;
  isActive?: boolean;
}

export interface CreateResourceData {
  title: string;
  description: string;
  category: ResourceCategory;
  url?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  communityId?: string;
  isActive?: boolean;
}

export interface UpdateResourceData {
  id: string;
  title?: string;
  description?: string;
  category?: ResourceCategory;
  url?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  isActive?: boolean;
}
