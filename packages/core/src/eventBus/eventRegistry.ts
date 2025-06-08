import { create } from 'zustand';
import { Community, Coordinates, Resource } from '~/types/entities';
import { DEFAULT_LOCATION } from '~/config/mapbox';

interface AppState {
  // User Location
  userLocation: Coordinates;
  setUserLocation: (location: Coordinates) => void;

  // Community
  currentCommunity: Community | null;
  setCurrentCommunity: (community: Community) => void;

  // Resources
  resources: Resource[];
  addResource: (resource: Resource) => void;
  updateResource: (id: string, updates: Partial<Resource>) => void;

  // View mode
  viewMode: 'member' | 'organizer';
  setViewMode: (mode: 'member' | 'organizer') => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Default to Austin, TX coordinates
  userLocation: DEFAULT_LOCATION,
  setUserLocation: (location) => set({ userLocation: location }),

  // No default community - will be set when communities load
  currentCommunity: null,
  setCurrentCommunity: (community) => set({ currentCommunity: community }),

  // Initialize with empty resources - will be loaded from API
  resources: [],
  addResource: (resource) =>
    set((state) => ({
      resources: [...state.resources, resource],
    })),
  updateResource: (id, updates) =>
    set((state) => ({
      resources: state.resources.map((resource) =>
        resource.id === id ? { ...resource, ...updates } : resource
      ),
    })),

  // Default to member view
  viewMode: 'member',
  setViewMode: (mode) => set({ viewMode: mode }),
}));
