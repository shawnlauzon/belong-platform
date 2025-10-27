import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "../../../shared/hooks/useSupabase";
import { fetchPushSubscriptions } from "../api/fetchPushSubscriptions";
import type { PushSubscription } from "../types/pushSubscription";

/**
 * Hook to fetch all push subscriptions for the current user
 */
export function usePushSubscriptions() {
  const supabase = useSupabase();

  return useQuery<PushSubscription[], Error>({
    queryKey: ["push-subscriptions"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User must be authenticated");
      }

      return fetchPushSubscriptions(supabase, user.id);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
