// useBelongStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { initialState } from './initialState';
import type { AppState, BelongStore } from '../types/store';

// Create the store with just the state
const createBelongStore = (
  set: (
    partial:
      | Partial<AppState>
      | ((state: AppState) => Partial<AppState>)
  ) => void,
  get: () => AppState
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
        users: {
          current: state.users.current,
          profiles: state.users.profiles,
        },
        communities: {
          list: state.communities.list,
          currentId: state.communities.currentId,
        },
      }),
    }
  )
);
