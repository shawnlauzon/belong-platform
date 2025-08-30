import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMapbox } from '../useMapbox';
import { ClientContext } from '../../../config';
import { BelongClient } from '../../../config/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

describe('useMapbox', () => {
  const mockSupabaseClient = {} as SupabaseClient<Database>;

  it('should throw error when used outside BelongProvider', () => {
    expect(() => {
      renderHook(() => useMapbox());
    }).toThrow('useMapbox must be used within BelongProvider');
  });

  it('should throw error when mapbox is not configured', () => {
    const mockClient: BelongClient = {
      supabase: mockSupabaseClient,
      mapbox: null,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ClientContext.Provider value={mockClient}>
        {children}
      </ClientContext.Provider>
    );

    expect(() => {
      renderHook(() => useMapbox(), { wrapper });
    }).toThrow('Mapbox client is not available. Please provide a mapboxPublicToken in BelongProvider config.');
  });

  it('should return mapbox client when configured', () => {
    const mockMapboxClient = {
      searchAddresses: vi.fn(),
      reverseGeocode: vi.fn(),
      getStaticMapUrl: vi.fn(),
      calculateDrivingTime: vi.fn(),
      getPublicToken: vi.fn(),
    };

    const mockClient: BelongClient = {
      supabase: mockSupabaseClient,
      mapbox: mockMapboxClient,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ClientContext.Provider value={mockClient}>
        {children}
      </ClientContext.Provider>
    );

    const { result } = renderHook(() => useMapbox(), { wrapper });
    expect(result.current).toBe(mockMapboxClient);
  });
});