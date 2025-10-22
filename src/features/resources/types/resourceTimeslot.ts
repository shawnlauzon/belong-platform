import { IsPersisted } from '@/shared';
import { ResourceTimeslotStatus } from './resourceRow';

export type ResourceTimeslot = IsPersisted<ResourceTimeslotInput> & {
  voteCount: number;
};

export type ResourceTimeslotInput = {
  resourceId: string;
  startTime: Date;
  endTime: Date;
  status: ResourceTimeslotStatus;
};
