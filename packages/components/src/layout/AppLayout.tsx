import React, { ReactNode } from 'react';
import { Navigation } from './Navigation';
import { CommunitySelector } from '../communities/CommunitySelector';

interface AppLayoutProps {
  children: ReactNode;
  showCommunitySelector?: boolean;
}

export function AppLayout({
  children,
  showCommunitySelector = true,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-amber-50">
      <Navigation />

      {showCommunitySelector && (
        <div className="container mx-auto px-4 py-2">
          <CommunitySelector />
        </div>
      )}

      <main className="container mx-auto px-4 py-6">{children}</main>

      <footer className="bg-white border-t border-gray-200 py-4 mt-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-primary-600">
              <span className="font-display font-bold text-lg">Belong</span>
              <span className="text-sm text-warmgray-500">
                © 2025 Belong Network
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-warmgray-500">
              <a href="#" className="hover:text-primary-600 transition-colors">
                About
              </a>
              <a href="#" className="hover:text-primary-600 transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-primary-600 transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-primary-600 transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
