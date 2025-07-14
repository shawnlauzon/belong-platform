import { Gathering } from '../../gatherings';
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
  dueDate?: Date; // For gatherings and time-sensitive items
  gathering?: Gathering; // For gathering-related todos
  resource?: Resource; // For resource-related todos
}

export type TodoType =
  | 'gathering-confirmed' // Upcoming confirmed gatherings (user said yes)
  | 'gathering-maybe' // Upcoming maybe gatherings (user said maybe)
  | 'gathering-organizer' // My future gatherings (user is organizer)
  | 'shoutout-gathering' // Gathering shoutout (attended gatherings needing thank you)
  | 'shoutout-offer' // Offer shoutout (accepted offers needing thank you)
  | 'shoutout-favor'; // Favor shoutout (accepted favors needing thank you)
