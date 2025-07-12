export type ResourceResponse = ResourceResponseInput & {
  createdAt: Date;
  updatedAt: Date;
};

export type ResourceResponseInput = {
  resourceId: string;
  userId: string;
  status: 'accepted' | 'interested' | 'declined';
};
