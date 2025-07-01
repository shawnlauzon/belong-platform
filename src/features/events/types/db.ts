import { Database } from '../../../shared/types/database';

export type EventRow = Database['public']['Tables']['events']['Row'];

// Database types for event_attendances table (will be available once migrations are applied)
export type EventAttendanceRow =
  Database['public']['Tables']['event_attendances']['Row'];
export type EventAttendanceInsertDbData =
  Database['public']['Tables']['event_attendances']['Insert'];
export type EventAttendanceUpdateDbData =
  Database['public']['Tables']['event_attendances']['Update'];
