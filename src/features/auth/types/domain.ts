import { Coordinates } from '../../../shared';

export interface Account {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  fullName?: string;
  avatarUrl?: string;
  location?: Coordinates;
  createdAt: Date;
  updatedAt: Date;
}
