import React, { createContext, useContext, type ReactNode } from 'react';
import { createBelongClient, type BelongClient, type BelongClientConfig } from '@belongnetwork/core';

interface BelongClientContextType {
  client: BelongClient;
}

const BelongClientContext = createContext<BelongClientContextType | null>(null);

interface BelongClientProviderProps {
  children: ReactNode;
  config: BelongClientConfig;
}

/**
 * Provider component that creates and provides a configured Belong client to child components
 * 
 * @param props.config - Configuration for the Belong client
 * @param props.children - Child components that will have access to the client
 * 
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <BelongClientProvider
 *       config={{
 *         supabaseUrl: 'https://your-project.supabase.co',
 *         supabaseAnonKey: 'your-anon-key',
 *         mapboxPublicToken: 'your-mapbox-token',
 *         logLevel: 'info'
 *       }}
 *     >
 *       <QueryClient client={queryClient}>
 *         <YourApp />
 *       </QueryClient>
 *     </BelongClientProvider>
 *   );
 * }
 * ```
 */
export function BelongClientProvider({ children, config }: BelongClientProviderProps) {
  // Create client once and memoize it
  const client = React.useMemo(() => createBelongClient(config), [config]);

  return (
    <BelongClientContext.Provider value={{ client }}>
      {children}
    </BelongClientContext.Provider>
  );
}

/**
 * Hook to access the configured Belong client from context
 * 
 * @returns The configured Belong client
 * @throws Error if used outside of BelongClientProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { supabase, mapbox, logger } = useBelongClient();
 *   
 *   // Use the configured clients
 *   const { data } = await supabase.from('communities').select('*');
 *   const addresses = await mapbox.searchAddresses('Austin, TX');
 *   logger.info('Component rendered');
 * }
 * ```
 */
export function useBelongClient(): BelongClient {
  const context = useContext(BelongClientContext);
  
  if (!context) {
    throw new Error('useBelongClient must be used within a BelongClientProvider');
  }
  
  return context.client;
}

export default BelongClientProvider;