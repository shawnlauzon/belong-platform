import React from 'react';
import { useThanks } from '@belongnetwork/api';
import { ThanksCard } from './ThanksCard';

export function ThanksFeed() {
  const { data: thanks, isLoading, error } = useThanks();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load thanks. Please try again.</p>
      </div>
    );
  }

  if (!thanks || thanks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No thanks shared yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {thanks.map((thanksItem) => (
        <ThanksCard key={thanksItem.id} thanks={thanksItem} />
      ))}
    </div>
  );
}