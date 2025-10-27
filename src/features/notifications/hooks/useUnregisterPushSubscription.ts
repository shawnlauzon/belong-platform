import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "../../../shared/hooks/useSupabase";
import { unregisterPushSubscription } from "../api/unregisterPushSubscription";

/**
 * Hook to unregister a push subscription
 */
export function useUnregisterPushSubscription() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (subscriptionId) =>
      unregisterPushSubscription(supabase, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push-subscriptions"] });
    },
  });
}
