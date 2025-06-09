import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { eventBus } from '../eventBus/eventBus';
import { initialState } from './initialState';
import { logger } from '../utils/logger';
import type { BelongStore } from './types';
import type { Session } from '@supabase/supabase-js';
import type { Resource, Community } from '../types/entities';
import initializeAuthListeners from './authHandlers';
import { initializeResourceListeners } from './resourceHandlers';
import { initializeCommunityListeners } from './communityHandlers';

// Create the store with state and actions
export const useBelongStore = create<BelongStore>()(
  devtools(
    (set, get) => {
      // Define internal state management functions
      const setAuthSession = (user: any, session: Session | null) => {
        set(
          (state) => ({
            ...state,
            auth: {
              ...state.auth,
              user,
              session,
              isAuthenticated: true,
              token: session?.access_token || null,
              error: null,
              isLoading: false,
            },
          }),
          false,
          'auth/setSession'
        );
      };

      const clearAuthSession = () => {
        set(
          (state) => ({
            ...state,
            auth: {
              ...state.auth,
              user: null,
              session: null,
              isAuthenticated: false,
              token: null,
              isLoading: false,
            },
          }),
          false,
          'auth/clearSession'
        );
      };

      const setAuthError = (error: string) => {
        set(
          (state) => ({
            ...state,
            auth: {
              ...state.auth,
              error,
              isLoading: false,
            },
          }),
          false,
          'auth/setError'
        );
      };

      const setAuthLoading = (loading: boolean) => {
        set(
          (state) => ({
            ...state,
            auth: {
              ...state.auth,
              isLoading: loading,
            },
          }),
          false,
          'auth/setLoading'
        );
      };

      // Define community state management functions
      const setCommunitiesLoading = (isLoading: boolean) => {
        set(
          (state) => ({
            ...state,
            communities: {
              ...state.communities,
              isLoading,
            },
          }),
          false,
          'communities/setLoading'
        );
      };

      const setCommunitiesError = (error: string | null) => {
        set(
          (state) => ({
            ...state,
            communities: {
              ...state.communities,
              error,
            },
          }),
          false,
          'communities/setError'
        );
      };

      const setCommunities = (communities: Community[]) => {
        set(
          (state) => ({
            ...state,
            communities: {
              ...state.communities,
              list: communities,
            },
          }),
          false,
          'communities/setList'
        );
      };

      const setActiveCommunityInternal = (communityId: string) => {
        set(
          (state) => ({
            ...state,
            app: {
              ...state.app,
              activeCommunityId: communityId,
            },
          }),
          false,
          'app/setActiveCommunity'
        );
      };

      // Define resource state management functions
      const setResourcesLoading = (isLoading: boolean) => {
        set(
          (state) => ({
            ...state,
            resources: {
              ...state.resources,
              isLoading,
            },
          }),
          false,
          'resources/setLoading'
        );
      };

      const setResourcesError = (error: string | null) => {
        set(
          (state) => ({
            ...state,
            resources: {
              ...state.resources,
              error,
            },
          }),
          false,
          'resources/setError'
        );
      };

      const setResources = (resources: Resource[]) => {
        logger.debug('📦 Store: Setting resources in store:', resources);
        set(
          (state) => ({
            ...state,
            resources: {
              ...state.resources,
              list: resources,
            },
          }),
          false,
          'resources/setList'
        );
        logger.debug(
          '📦 Store: Resources state updated to:',
          get().resources.list
        );
      };

      const addResource = (resource: Resource) => {
        set(
          (state) => ({
            ...state,
            resources: {
              ...state.resources,
              list: [resource, ...state.resources.list],
            },
          }),
          false,
          'resources/add'
        );
      };

      const updateResourceInList = (updatedResource: Resource) => {
        set(
          (state) => ({
            ...state,
            resources: {
              ...state.resources,
              list: state.resources.list.map((resource) =>
                resource.id === updatedResource.id ? updatedResource : resource
              ),
            },
          }),
          false,
          'resources/update'
        );
      };

      const removeResource = (resourceId: string) => {
        set(
          (state) => ({
            ...state,
            resources: {
              ...state.resources,
              list: state.resources.list.filter(
                (resource) => resource.id !== resourceId
              ),
            },
          }),
          false,
          'resources/remove'
        );
      };

      // Initialize event listeners
      initializeAuthListeners(
        setAuthSession,
        clearAuthSession,
        setAuthError,
        setAuthLoading
      );
      initializeCommunityListeners(
        setCommunitiesLoading,
        setCommunitiesError,
        setCommunities,
        setActiveCommunityInternal
      );
      initializeResourceListeners(
        setResourcesLoading,
        setResourcesError,
        setResources,
        addResource,
        updateResourceInList,
        removeResource
      );

      return {
        // Spread the initial state
        ...initialState,

        // Actions that only emit events
        setActiveCommunity: (communityId: string) => {
          eventBus.emit('community.active.change.requested', { communityId });
        },

        signIn: (email: string, password: string) => {
          eventBus.emit('auth.signIn.requested', { email, password });
        },

        signUp: (
          email: string,
          password: string,
          metadata?: { firstName?: string; lastName?: string }
        ) => {
          eventBus.emit('auth.signUp.requested', { email, password, metadata });
        },

        signOut: () => {
          eventBus.emit('auth.signOut.requested', void 0);
        },

        // Internal auth state management actions
        setAuthSession,
        clearAuthSession,
        setAuthError,
        setAuthLoading,

        // Internal community state management actions
        setCommunitiesLoading,
        setCommunitiesError,
        setCommunities,

        // Resource state management actions
        setResourcesLoading,
        setResourcesError,
        setResources,
        addResource,
        updateResourceInList,
        removeResource,

        // Selectors and state updaters
        getActiveCommunity: () => {
          const state = get();
          if (!state.app.activeCommunityId) return null;
          return (
            state.communities.list.find(
              (community) => community.id === state.app.activeCommunityId
            ) || null
          );
        },

        setViewMode: (mode: 'member' | 'organizer') => {
          set(
            (state) => ({
              ...state,
              app: {
                ...state.app,
                viewMode: mode,
              },
            }),
            false,
            'app/setViewMode'
          );
        },
      };
    },
    {
      name: 'belong-store', // Name that will appear in DevTools
      enabled: import.meta.env.DEV, // Only enable in development
    }
  )
);