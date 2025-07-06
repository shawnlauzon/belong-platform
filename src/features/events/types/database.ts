import { Database } from '@/shared/types/database';

export type EventRow = Database['public']['Tables']['events']['Row'];
export type EventInsert = Database['public']['Tables']['events']['Insert'];
export type EventUpdate = Database['public']['Tables']['events']['Update'];

export type EventAttendanceRow = Database['public']['Tables']['event_attendances']['Row'];
export type EventAttendanceInsert = Database['public']['Tables']['event_attendances']['Insert'];
export type EventAttendanceUpdate = Database['public']['Tables']['event_attendances']['Update'];