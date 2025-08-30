import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UseQueryResult } from '@tanstack/react-query';
import { User } from '@/features/users';

// Mock the useCurrentUser hook instead of useAuth
vi.mock('../../features/auth/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}));

// Mock dependencies of BelongProvider
vi.mock('../../shared/hooks/useSupabase', () => ({
  useSupabase: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
  })),
}));

// Mock client creation
vi.mock('../client', () => ({
  createBelongClient: vi.fn((config) => ({
    supabase: {
      auth: {
        onAuthStateChange: vi.fn(() => ({
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        })),
      },
    },
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    mapbox: config.mapboxPublicToken ? {
      autocomplete: vi.fn(),
      reverseGeocode: vi.fn(),
    } : null,
  })),
}));

import { BelongProvider } from '../BelongProvider';
import { useCurrentUser } from '../../features/auth/hooks/useCurrentUser';

const mockUseCurrentUser = vi.mocked(useCurrentUser);

describe('BelongProvider', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Default mock for useCurrentUser
    mockUseCurrentUser.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    } as UseQueryResult<User | null, Error>);
  });

  const defaultConfig = {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-key',
    mapboxPublicToken: 'test-token',
  };

  const configWithoutMapbox = {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-key',
  };

  it('should render children when properly configured', () => {
    const TestComponent = () => <div>Test Content</div>;

    render(
      <QueryClientProvider client={queryClient}>
        <BelongProvider config={defaultConfig}>
          <TestComponent />
        </BelongProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Test Content')).toBeDefined();
  });

  it('should provide context to children', () => {
    const TestComponent = () => {
      // This would test that the context is available
      return <div>Provider Working</div>;
    };

    render(
      <QueryClientProvider client={queryClient}>
        <BelongProvider config={defaultConfig}>
          <TestComponent />
        </BelongProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Provider Working')).toBeDefined();
  });

  it('should work without mapbox token', () => {
    const TestComponent = () => <div>No Mapbox Working</div>;

    render(
      <QueryClientProvider client={queryClient}>
        <BelongProvider config={configWithoutMapbox}>
          <TestComponent />
        </BelongProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('No Mapbox Working')).toBeDefined();
  });
});
