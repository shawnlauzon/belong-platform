import React, { useEffect, useMemo, createContext, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createBelongClient,
  type BelongClient,
  type BelongClientConfig,
  logger,
} from "@belongnetwork/core";
import { useAuth } from "../hooks/useAuth";
import { User } from "@belongnetwork/types";
import { queryKeys } from "../../shared/queryKeys";

// Client context for internal usage
const ClientContext = createContext<BelongClient | undefined>(undefined);

// Hook to access Supabase client
export const useSupabase = () => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error("useSupabase must be used within BelongProvider");
  }
  return context.supabase;
};

// Hook to access Mapbox client
export const useMapbox = () => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error("useMapbox must be used within BelongProvider");
  }
  return context.mapbox;
};

interface BelongContextValue {
  // Current user data
  currentUser: User | null;
  isAuthenticated: boolean;
  isPending: boolean;
  isError: boolean;
  error: Error | null;

  // Auth mutations
  signIn: ReturnType<typeof useAuth>["signIn"];
  signUp: ReturnType<typeof useAuth>["signUp"];
  signOut: ReturnType<typeof useAuth>["signOut"];
  updateProfile: ReturnType<typeof useAuth>["updateProfile"];
}

const BelongContext = React.createContext<BelongContextValue | undefined>(
  undefined,
);

export const useBelong = (): BelongContextValue => {
  const context = React.useContext(BelongContext);
  if (context === undefined) {
    throw new Error("useBelong must be used within BelongProvider");
  }
  return context;
};

interface BelongProviderProps {
  children: React.ReactNode;
  config: BelongClientConfig;
}

// Inner component that uses useAuth - this runs after ClientContext is provided
const BelongContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const supabase = useSupabase(); // Use new hook
  const authHook = useAuth();

  // Centralized auth state change handler - this is where ALL auth state management happens
  useEffect(() => {
    // Check for existing session on mount
    const checkInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        // Invalidate caches to ensure fresh data for existing session
        queryClient.invalidateQueries({ queryKey: queryKeys.auth });
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.byId(session.user.id),
        });
        logger.info("🔐 API: Existing session detected, invalidated caches");
      }
    };

    checkInitialSession();

    // Set up auth state listener for all auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug("🔐 API: Auth state change detected", {
        event,
        userId: session?.user?.id,
      });

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        // Invalidate auth state to refetch with new session
        await queryClient.invalidateQueries({ queryKey: queryKeys.auth });

        if (session?.user?.id) {
          // Invalidate user profile data for the authenticated user
          await queryClient.invalidateQueries({
            queryKey: queryKeys.users.byId(session.user.id),
          });
        }

        logger.info(
          "🔐 API: Auth state changed to SIGNED_IN, invalidated caches",
        );
      } else if (event === "SIGNED_OUT") {
        // Get current user ID before clearing auth cache
        const currentAuthUser = queryClient.getQueryData(queryKeys.auth) as {
          id: string;
        } | null;

        // Remove auth state
        queryClient.removeQueries({ queryKey: queryKeys.auth });

        // Remove current user profile data
        if (currentAuthUser?.id) {
          queryClient.removeQueries({
            queryKey: queryKeys.users.byId(currentAuthUser.id),
          });
        }

        logger.info("🔐 API: Auth state changed to SIGNED_OUT, removed caches");
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, supabase]);

  const contextValue: BelongContextValue = {
    // Current user data
    currentUser: authHook.currentUser || null,
    isAuthenticated: authHook.isAuthenticated,
    isPending: authHook.isPending,
    isError: authHook.isError,
    error: authHook.error,

    // Auth mutations
    signIn: authHook.signIn,
    signUp: authHook.signUp,
    signOut: authHook.signOut,
    updateProfile: authHook.updateProfile,
  };

  return (
    <BelongContext.Provider value={contextValue}>
      {children}
    </BelongContext.Provider>
  );
};

export const BelongProvider: React.FC<BelongProviderProps> = ({
  children,
  config,
}) => {
  // Create client instance from config
  const client = useMemo(() => createBelongClient(config), [config]);

  return (
    <ClientContext.Provider value={client}>
      <BelongContextProvider>{children}</BelongContextProvider>
    </ClientContext.Provider>
  );
};
