import type { Database } from '../../../shared/types/database';

export type ResourceRow = Database['public']['Tables']['resources']['Row'];
export type ResourceInsertDbData =
  Database['public']['Tables']['resources']['Insert'];
export type ResourceUpdateDbData =
  Database['public']['Tables']['resources']['Update'];

// Enum needed for database operations
export enum ResourceCategory {
  TOOLS = 'tools',
  SKILLS = 'skills',
  FOOD = 'food',
  SUPPLIES = 'supplies',
  OTHER = 'other',
}

// TODO Replace with fields from Database
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
