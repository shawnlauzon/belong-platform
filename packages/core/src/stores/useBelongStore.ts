import { create } from 'zustand';
import { eventBus } from '../eventBus/eventBus';
import { initialState } from './initialState';
import type { BelongState, BelongStore } from './types';

// Create the store with state and actions
export const useBelongStore = create<BelongStore>((set, get) => ({
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

  // Selectors and state updaters
  getActiveCommunity: () => {
    const state = get();
    if (!state.communities.activeId) return null;
    return (
      state.communities.list.find(
        (community) => community.id === state.communities.activeId
      ) || null
    );
  },

  setViewMode: (mode: 'member' | 'organizer') => {
    set((state) => ({
      ...state,
      app: {
        ...state.app,
        viewMode: mode,
      },
    }));
  },
}));