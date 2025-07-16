import { Resource } from '../../resources';

export interface Agenda {
  items: Todo[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface Todo {
  id: string;
  type: TodoType;
  title: string;
  description: string;
  dueDate?: Date; // For time-sensitive items
  resource?: Resource; // For resource-related todos
}

export type TodoType =
  | 'shoutout-offer' // Offer shoutout (accepted offers needing thank you)
  | 'shoutout-favor' // Favor shoutout (accepted favors needing thank you)
  | 'upcoming-event'; // Upcoming event (confirmed gatherings)
