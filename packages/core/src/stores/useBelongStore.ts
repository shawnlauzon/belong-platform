// useBelongStore.ts
import { create, SetState } from 'zustand';
import { eventBus } from '../eventBus/eventBus';
import { initialState } from './initialState';
import type { BelongState, BelongStore } from './types';

// Create the store with just the state
const createBelongStore = (set: SetState<BelongState>) => {
  // Doesn't seem like we need the type here
  // Omit<BelongStore, keyof typeof initialState> => {
  return {
    viewMode: 'member', // default value

    // Actions that only emit events
    setActiveCommunity: (communityId: string) => {
      eventBus.emit('community.active.change.requested', { communityId });
    },

    getActiveCommunity: () => null,

    setViewMode: (mode: 'member' | 'organizer') =>
      set((_state) => ({ app: { viewMode: mode } })),

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
      eventBus.emit('auth.signOut.requested', {});
    },
  };
};

// Create the store with persistence
export const useBelongStore = create<BelongStore>(
  (set) => ({
    ...initialState,
    ...createBelongStore(set),
  })
  // (set, get) => ({
  //   // ...initialState,
  //   // ...createBelongStore(),
  //   // Selectors
  //   // setViewMode: (mode) => set({ viewMode: mode }),
  //   // getActiveCommunity: () => {
  //   //   const state = get();
  //   //   if (!state.communities.activeId) return null;
  //   //   return (
  //   //     state.communities.list.find(
  //   //       (community) => community.id === state.communities.activeId
  //   //     ) || null
  //   //   );
  //   // },
  // }))
  // {
  //   name: 'belong-store',
  //   storage: createJSONStorage(() => localStorage),
  //   // Persist only the necessary parts of the state
  //   partialize: (state) => ({
  //     auth: {
  //       user: state.auth.user,
  //       session: state.auth.session,
  //       location: state.auth.location,
  //     },
  //     users: {
  //       list: state.users.list,
  //       activeId: state.users.activeId, // TODO Remove this
  //     },
  //     communities: {
  //       list: state.communities.list,
  //       activeId: state.communities.activeId,
  //     },
  //   }),
  // }
  // )
);
