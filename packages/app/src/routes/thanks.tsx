import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@belongnetwork/components';
import { ThanksFeed } from '@belongnetwork/components';
import { Thanks, useBelongStore } from '@belongnetwork/core';
import { ViewSwitcher } from '@belongnetwork/components';
import { Button } from '@belongnetwork/components';
import { Heart, User } from 'lucide-react';

export const Route = createFileRoute('/thanks')({
  component: ThanksPage,
});

function ThanksPage() {
  const [filter, setFilter] = useState<'all' | 'given' | 'received'>('all');
  const user = useBelongStore((state) => state.auth.user);
  const viewMode = useBelongStore((state) => state.app.viewMode);

  // Use the new hook to fetch thanks from the database
  const { list: thanks, isLoading } = useBelongStore((state) => state.thanks);

  // Filter the thanks based on the selected filter
  const filteredThanks = React.useMemo(() => {
    if (!user) return thanks;

    if (filter === 'all') return thanks;
    if (filter === 'given')
      return thanks.filter((t) => t.from_member_id === user.id);
    if (filter === 'received')
      return thanks.filter((t) => t.to_member_id === user.id);
    return thanks;
  }, [thanks, filter, user]);

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-warmgray-800">
            {viewMode === 'member' ? 'Gratitude' : 'Community Gratitude'}
          </h1>
          <p className="text-warmgray-500">
            See how neighbors are helping each other
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {viewMode === 'member' && user && (
            <div className="bg-white rounded-lg shadow-sm flex p-1">
              <Button
                variant={filter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('all')}
                className="flex items-center gap-1"
              >
                <Heart className="h-4 w-4" />
                <span>All</span>
              </Button>
              <Button
                variant={filter === 'given' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('given')}
                className="flex items-center gap-1"
              >
                <User className="h-4 w-4" />
                <span>My Thanks</span>
              </Button>
              <Button
                variant={filter === 'received' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('received')}
                className="flex items-center gap-1"
              >
                <User className="h-4 w-4" />
                <span>To Me</span>
              </Button>
            </div>
          )}

          {viewMode === 'organizer' && <ViewSwitcher />}
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <ThanksFeed thanks={filteredThanks} isLoading={isLoading} />
      </div>
    </AppLayout>
  );
}
