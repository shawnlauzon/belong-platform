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
  | 'shoutout-request' // Request shoutout (accepted requests needing thank you)
  | 'my-resource-pending-claims' // Review pending claims on my resources
  | 'my-resource-ready-to-fulfill' // Fulfill accepted claims on my resources
  | 'my-claim-ready-to-complete' // Complete my accepted claims
  | 'my-resource-active' // Manage my active resources
  | 'my-claim-interested' // Track resources I'm interested in
  | 'my-claim-confirmed' // Attend resources I'm confirmed for
  | 'my-resource-organizing'; // Organize my upcoming events
