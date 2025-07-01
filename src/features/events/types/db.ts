import { Database } from '../../../types';

export type EventRow = Database['public']['Tables']['events']['Row'];
export type EventAttendanceRow =
  Database['public']['Tables']['event_attendances']['Row'];
