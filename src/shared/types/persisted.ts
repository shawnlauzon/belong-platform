export interface Persisted {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IsPersisted<T> = T & Persisted;
