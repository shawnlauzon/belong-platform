import { Coordinates } from '../../../shared';

export interface UserDetail {
  id: string;
  firstName: string;
  lastName?: string;
  fullName?: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  location?: Coordinates;
  createdAt: Date;
  updatedAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UserData extends Omit<UserDetail, 'createdAt' | 'updatedAt'> {}

export interface UserFilter {
  email?: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}
