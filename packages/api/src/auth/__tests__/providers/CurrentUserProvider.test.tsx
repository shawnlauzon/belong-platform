import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { BelongContextProvider, useCurrentUserContext } from '../../providers/CurrentUserProvider';

// Mock the useCurrentUserQuery hook
vi.mock('../../hooks/useCurrentUserQuery', () => ({
  useCurrentUserQuery: vi.fn(),
}));

vi.mock('@belongnetwork/core', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockUseCurrentUserQuery = vi.mocked(await import('../../hooks/useCurrentUserQuery')).useCurrentUserQuery;

describe('BelongContextProvider', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should provide pending state while fetching user', () => {
    mockUseCurrentUserQuery.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
      error: null,
    } as any);

    const TestComponent = () => {
      const data = useCurrentUserContext();
      return (
        <div>
          <div data-testid="pending-state">{data.isPending ? 'loading' : 'not-loading'}</div>
          <div data-testid="user-data">{data.currentUser?.email || 'no-user'}</div>
        </div>
      );
    };

    render(
      <BelongContextProvider>
        <TestComponent />
      </BelongContextProvider>,
      { wrapper }
    );

    expect(screen.getByTestId('pending-state').textContent).toBe('loading');
    expect(screen.getByTestId('user-data').textContent).toBe('no-user');
  });

  it('should provide error state on fetch failure', () => {
    const error = new Error('Failed to fetch user');
    mockUseCurrentUserQuery.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
      error,
    } as any);

    const TestComponent = () => {
      const data = useCurrentUserContext();
      return (
        <div>
          <div data-testid="error-state">{data.isError ? 'error' : 'no-error'}</div>
          <div data-testid="error-message">{data.error?.message || 'no-error-message'}</div>
          <div data-testid="user-data">{data.currentUser?.email || 'no-user'}</div>
        </div>
      );
    };

    render(
      <BelongContextProvider>
        <TestComponent />
      </BelongContextProvider>,
      { wrapper }
    );

    expect(screen.getByTestId('error-state').textContent).toBe('error');
    expect(screen.getByTestId('error-message').textContent).toBe('Failed to fetch user');
    expect(screen.getByTestId('user-data').textContent).toBe('no-user');
  });

  it('should provide user data to children when successful', () => {
    const userData = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };

    mockUseCurrentUserQuery.mockReturnValue({
      isPending: false,
      isError: false,
      data: userData,
      error: null,
    } as any);

    const TestComponent = () => {
      const data = useCurrentUserContext();
      return (
        <div>
          <div data-testid="success-state">{data.isError ? 'error' : 'success'}</div>
          <div data-testid="user-email">{data.currentUser?.email || 'no-user'}</div>
          <div data-testid="user-name">{data.currentUser?.firstName || 'no-name'}</div>
        </div>
      );
    };

    render(
      <BelongContextProvider>
        <TestComponent />
      </BelongContextProvider>,
      { wrapper }
    );

    expect(screen.getByTestId('success-state').textContent).toBe('success');
    expect(screen.getByTestId('user-email').textContent).toBe('test@example.com');
    expect(screen.getByTestId('user-name').textContent).toBe('Test');
  });

  it('should provide null user when not authenticated', () => {
    mockUseCurrentUserQuery.mockReturnValue({
      isPending: false,
      isError: false,
      data: null,
      error: null,
    } as any);

    const TestComponent = () => {
      const data = useCurrentUserContext();
      return (
        <div>
          <div data-testid="auth-state">{data.currentUser ? 'authenticated' : 'not-authenticated'}</div>
          <div data-testid="user-data">{data.currentUser?.email || 'no-user'}</div>
        </div>
      );
    };

    render(
      <BelongContextProvider>
        <TestComponent />
      </BelongContextProvider>,
      { wrapper }
    );

    expect(screen.getByTestId('auth-state').textContent).toBe('not-authenticated');
    expect(screen.getByTestId('user-data').textContent).toBe('no-user');
  });
});