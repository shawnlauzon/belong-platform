import React from 'react';
import { useCurrentUserQuery } from '../hooks/useCurrentUserQuery';
import { User } from '@belongnetwork/types';

interface BelongContextValue {
  currentUser: User | null;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

const BelongContext = React.createContext<BelongContextValue | undefined>(undefined);

export const useCurrentUserContext = (): BelongContextValue => {
  const context = React.useContext(BelongContext);
  if (context === undefined) {
    throw new Error('useCurrentUserContext must be used within BelongContextProvider');
  }
  return context;
};

interface BelongProviderProps {
  children: React.ReactNode;
}

export const BelongContextProvider: React.FC<BelongProviderProps> = ({ children }) => {
  const currentUserQuery = useCurrentUserQuery();

  const contextValue: BelongContextValue = {
    currentUser: currentUserQuery.data || null,
    isPending: currentUserQuery.isPending,
    isError: currentUserQuery.isError,
    error: currentUserQuery.error,
  };

  return (
    <BelongContext.Provider value={contextValue}>
      {children}
    </BelongContext.Provider>
  );
};