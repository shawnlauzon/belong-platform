import { Coordinates } from '../../../shared';

export interface User {
  id: string;
  firstName: string;
  lastName?: string;
  fullName?: string;
  email: string;
  avatarUrl?: string;
  location?: Coordinates;
  createdAt: Date;
  updatedAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UserData
  extends Omit<User, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UserFilter {
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}
