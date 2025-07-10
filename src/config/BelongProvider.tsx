import React, { useEffect, useMemo, createContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BelongClient, BelongClientConfig, createBelongClient } from './client';

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
 * Internal context provider that manages authentication state changes.
 * Handles automatic cache invalidation when users sign in/out.
 *
 * @internal
 */
const BelongContextProvider: React.FC<{ 
  children: React.ReactNode;
  client: BelongClient;
}> = ({
  children,
  client,
}) => {
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

  return (
    <ClientContext.Provider value={client}>
      <BelongContextProvider client={client}>{children}</BelongContextProvider>
    </ClientContext.Provider>
  );
};
