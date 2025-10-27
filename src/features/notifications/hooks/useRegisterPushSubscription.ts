import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "../../../shared/hooks/useSupabase";
import { registerPushSubscription } from "../api/registerPushSubscription";
import type {
  PushSubscription,
  PushSubscriptionInput,
} from "../types/pushSubscription";

/**
 * Hook to register a new push subscription
 */
export function useRegisterPushSubscription() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<PushSubscription, Error, PushSubscriptionInput>({
    mutationFn: (subscription) =>
      registerPushSubscription(supabase, subscription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push-subscriptions"] });
    },
  });
}
