import React, { useEffect, useMemo, createContext, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createBelongClient,
  type BelongClient,
  type BelongClientConfig,
  logger,
} from "@belongnetwork/core";

// Client context for dependency injection following architecture pattern
const ClientContext = createContext<BelongClient | undefined>(undefined);

// Hook to access Supabase client - matches architecture document
export const useSupabase = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useSupabase must be used within BelongProvider');
  }
  return context.supabase;
};

// Hook to access Mapbox client
export const useMapbox = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useMapbox must be used within BelongProvider");
  }
  return context.mapbox;
};

interface BelongProviderProps {
  children: React.ReactNode;
  config: BelongClientConfig;
}

// Simplified auth state management component following architecture pattern
const BelongContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  // Simplified auth state management following architecture document
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        queryClient.invalidateQueries({ queryKey: ["auth"] });
        queryClient.invalidateQueries({
          queryKey: ["user", session.user.id],
        });
      } else if (event === "SIGNED_OUT") {
        queryClient.removeQueries({ queryKey: ["auth"] });
        queryClient.removeQueries({ queryKey: ["users"] });
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, queryClient]);

  return <>{children}</>;
};

// Main provider following architecture document structure
export const BelongProvider: React.FC<BelongProviderProps> = ({
  children,
  config,
}) => {
  // Create client from config
  const client = useMemo(() => createBelongClient(config), [config]);

  return (
    <ClientContext.Provider value={client}>
      <BelongContextProvider>
        {children}
      </BelongContextProvider>
    </ClientContext.Provider>
  );
};
