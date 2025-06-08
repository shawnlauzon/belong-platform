// useBelongStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { initialState } from './initialState';
import type { BelongState, BelongStore } from '../types/store';

// Create the store with just the state
const createBelongStore = (
  set: (
    partial:
      | Partial<BelongState>
      | ((state: BelongState) => Partial<BelongState>)
  ) => void,
  get: () => BelongState
): Omit<BelongStore, keyof typeof initialState> => {
  return {
    // No actions for now
  };
};

// Create the store with persistence
export const useBelongStore = create<BelongStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createBelongStore(set, get),
    }),
    {
      name: 'belong-store',
      storage: createJSONStorage(() => localStorage),
      // Persist only the necessary parts of the state
      partialize: (state) => ({
        auth: {
          user: state.auth.user,
          session: state.auth.session,
        },
        profile: {
          id: state.profile.id,
          email: state.profile.email,
          first_name: state.profile.first_name,
          last_name: state.profile.last_name,
          avatar_url: state.profile.avatar_url,
          bio: state.profile.bio,
          location: state.profile.location,
          created_at: state.profile.created_at,
          updated_at: state.profile.updated_at,
        },
        community: {
          currentCommunity: state.community.currentCommunity,
          communities: state.community.communities,
        },
      }),
    }
  )
);
