import { useContext } from 'react';
import { ClientContext } from '../../config/BelongProvider';

// Hook to access Supabase client - matches architecture document
export const useSupabase = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useSupabase must be used within BelongProvider');
  }
  return context.supabase;
};
