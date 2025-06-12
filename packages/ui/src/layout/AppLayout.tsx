import React from 'react';
import { Navigation } from './Navigation';
import { ViewSwitcher } from './ViewSwitcher';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
}

export function AppLayout({ children, currentPath }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPath={currentPath} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <ViewSwitcher />
        </div>
        {children}
      </main>
    </div>
  );
}