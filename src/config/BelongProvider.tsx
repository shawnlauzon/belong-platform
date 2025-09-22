import React, { useEffect, useMemo, createContext, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BelongClient, BelongClientConfig, createBelongClient } from './client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/shared';
import { useCurrentUser } from '@/features/auth';
import { createNotificationSubscription } from '@/features/notifications/api/createNotificationSubscription';

// Client context for dependency injection following architecture pattern
export const ClientContext = createContext<BelongClient | undefined>(undefined);

/**
 * Props for the BelongProvider component.
 */
interface BelongProviderProps {
  /** React children to render within the provider context */
  children: React.ReactNode;
  /** Configuration object for initializing Belong clients */
  config: BelongClientConfig;
}

/**
 * Internal realtime manager that handles all real-time subscriptions.
 * Consolidates notification, message, and community chat subscriptions.
 *
 * @internal
 */
const RealtimeManager: React.FC<{
  children: React.ReactNode;
  client: BelongClient;
  enableRealtime: boolean;
}> = ({ children, client, enableRealtime }) => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  // Channel states
  const [notificationChannel, setNotificationChannel] =
    useState<RealtimeChannel | null>(null);

  // 1. Notification subscription
  useEffect(() => {
    if (!enableRealtime || !client.supabase || !currentUser) {
      if (notificationChannel) {
        client.supabase?.removeChannel(notificationChannel);
        setNotificationChannel(null);
      }
      return;
    }

    const setupNotifications = async () => {
      try {
        const channel = await createNotificationSubscription(
          client.supabase,
          queryClient,
        );
        setNotificationChannel(channel);
        logger.info('Notification subscription established', {
          userId: currentUser.id,
        });
      } catch (error) {
        logger.error('Failed to setup notification subscription', {
          error,
          userId: currentUser.id,
        });
      }
    };

    setupNotifications();

    return () => {
      if (notificationChannel) {
        client.supabase?.removeChannel(notificationChannel);
        setNotificationChannel(null);
      }
    };
  // Note: notificationChannel is intentionally excluded to prevent infinite loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enableRealtime,
    client.supabase,
    currentUser,
    queryClient,
  ]);



  return <>{children}</>;
};

/**
 * Internal context provider that manages authentication state changes.
 * Handles automatic cache invalidation when users sign in/out.
 *
 * @internal
 */
const BelongContextProvider: React.FC<{
  children: React.ReactNode;
  client: BelongClient;
  enableRealtime: boolean;
}> = ({ children, client, enableRealtime }) => {
  const queryClient = useQueryClient();

  // Simplified auth state management following architecture document
  useEffect(() => {
    const {
      data: { subscription },
    } = client.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        queryClient.invalidateQueries({ queryKey: ['auth'] });
        queryClient.invalidateQueries({
          queryKey: ['user', session.user.id],
        });
      } else if (event === 'SIGNED_OUT') {
        queryClient.removeQueries({ queryKey: ['auth'] });
        queryClient.removeQueries({ queryKey: ['users'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [client.supabase, queryClient]);

  if (enableRealtime) {
    return (
      <RealtimeManager client={client} enableRealtime={enableRealtime}>
        {children}
      </RealtimeManager>
    );
  }

  return <>{children}</>;
};

/**
 * Main provider component for the Belong Network platform.
 *
 * This provider creates and manages Supabase and Mapbox clients, handles authentication
 * state changes, and provides React Query context for all platform hooks. Must wrap
 * your entire application or the parts that use Belong Network functionality.
 *
 * @param props - Provider configuration and children
 * @returns JSX element providing platform context
 *
 * @example
 * ```tsx
 * import { BelongProvider } from '@belongnetwork/platform';
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 *
 * const queryClient = new QueryClient();
 *
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <BelongProvider config={{
 *         supabase: {
 *           url: 'https://your-project.supabase.co',
 *           anonKey: 'your-anon-key'
 *         },
 *         mapbox: {
 *           accessToken: 'your-mapbox-token'
 *         }
 *       }}>
 *         <YourApp />
 *       </BelongProvider>
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Minimal setup without Mapbox
 * function MinimalApp() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <BelongProvider config={{
 *         supabase: {
 *           url: process.env.REACT_APP_SUPABASE_URL,
 *           anonKey: process.env.REACT_APP_SUPABASE_ANON_KEY
 *         }
 *       }}>
 *         <YourApp />
 *       </BelongProvider>
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 *
 * @category Providers
 */
export const BelongProvider: React.FC<BelongProviderProps> = ({
  children,
  config,
}) => {
  // Create client from config
  const client = useMemo(() => createBelongClient(config), [config]);
  const enableRealtime = config.enableRealtime ?? true;

  return (
    <ClientContext.Provider value={client}>
      <BelongContextProvider client={client} enableRealtime={enableRealtime}>
        {children}
      </BelongContextProvider>
    </ClientContext.Provider>
  );
};

