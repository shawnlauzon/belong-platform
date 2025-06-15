import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode, FC } from 'react';

export const createTestQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

type WrapperProps = {
  children: ReactNode;
};

export const createWrapper = () => {
  const queryClient = createTestQueryClient();
  
  const Wrapper: FC<WrapperProps> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  return Wrapper;
};

export * from './resources/__tests__/test-utils';
