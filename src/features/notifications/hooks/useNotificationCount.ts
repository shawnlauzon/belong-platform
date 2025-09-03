import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { fetchNotificationCount } from '../api/fetchNotificationCount';
import { notificationKeys } from '../queries';

interface UseNotificationCountResult {
  data: number | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useNotificationCount(): UseNotificationCountResult {
  const supabase = useSupabase();

  const query = useQuery({
    queryKey: notificationKeys.counts(),
    queryFn: () => fetchNotificationCount(supabase),
    enabled: !!supabase,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}