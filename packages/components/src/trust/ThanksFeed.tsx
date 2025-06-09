import React from 'react';
import { ThanksCard } from './ThanksCard';
import { Thanks } from '@belongnetwork/core';

interface ThanksFeedProps {
  thanks: Thanks[];
  isLoading?: boolean;
}

export function ThanksFeed({ thanks, isLoading = false }: ThanksFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm h-[200px] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (thanks.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center shadow-sm">
        <h3 className="text-lg font-medium text-warmgray-700 mb-2">
          No thanks yet
        </h3>
        <p className="text-warmgray-500">
          When neighbors share their gratitude, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {thanks.map((item) => (
        <ThanksCard key={item.id} thanks={item} />
      ))}
    </div>
  );
}
