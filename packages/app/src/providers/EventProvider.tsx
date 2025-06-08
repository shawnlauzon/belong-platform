// @belongnetwork/app/src/providers/EventProvider.tsx
import { initializeResourceEvents } from '@belongnetwork/resource-services';
import { initializeTrustEvents } from '@belongnetwork/trust-services';
// import { initializeUserEvents } from '@belongnetwork/user-services';
import { initializeCommunityEvents } from '@belongnetwork/community-services';
import { useEffect } from 'react';

export function EventProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize all event handlers on app startup
    initializeResourceEvents();
    initializeTrustEvents();
    initializeCommunityEvents();
    // initializeUserEvents();

    // Cleanup not needed - events live for app lifetime
  }, []);

  return <>{children}</>;
}
