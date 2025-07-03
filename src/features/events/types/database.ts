import type { Database } from '../../../shared/types/database';

export type EventRow = Database['public']['Tables']['events']['Row'];
export type EventInsertDbData =
  Database['public']['Tables']['events']['Insert'];
export type EventUpdateDbData =
  Database['public']['Tables']['events']['Update'];

// Database types for event_attendances table (will be available once migrations are applied)
export type EventAttendanceRow =
  Database['public']['Tables']['event_attendances']['Row'];
export type EventAttendanceInsertDbData =
  Database['public']['Tables']['event_attendances']['Insert'];
export type EventAttendanceUpdateDbData =
  Database['public']['Tables']['event_attendances']['Update'];
