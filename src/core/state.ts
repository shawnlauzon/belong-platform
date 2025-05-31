import { create } from 'zustand';
import { mockCommunities, mockMembers, mockResources } from '@/api/mockData';
import { Community, Coordinates, Member, Resource } from '@/types';
import { DEFAULT_LOCATION } from '@/lib/mapbox';

interface AppState {
  // User & Location
  currentUser: Member;
  userLocation: Coordinates;
  setUserLocation: (location: Coordinates) => void;
  
  // Community
  currentCommunity: Community;
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
  // Default user is the first mock member
  currentUser: mockMembers[0],
  
  // Default to Austin, TX coordinates
  userLocation: DEFAULT_LOCATION,
  setUserLocation: (location) => set({ userLocation: location }),
  
  // Default to South Austin community
  currentCommunity: mockCommunities[0],
  setCurrentCommunity: (community) => set({ currentCommunity: community }),
  
  // Initialize with mock resources
  resources: mockResources,
  addResource: (resource) => set((state) => ({ 
    resources: [...state.resources, resource] 
  })),
  updateResource: (id, updates) => set((state) => ({
    resources: state.resources.map(resource => 
      resource.id === id ? { ...resource, ...updates } : resource
    )
  })),
  
  // Default to member view
  viewMode: 'member',
  setViewMode: (mode) => set({ viewMode: mode })
}));