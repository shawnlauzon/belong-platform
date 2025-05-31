import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { ThanksFeed } from '@/components/thanks/ThanksFeed';
import { ThanksManager } from '@/features/thanks/ThanksManager';
import { useAppStore } from '@/core/state';
import { Thanks } from '@/types';
import { ViewSwitcher } from '@/components/layout/ViewSwitcher';
import { Button } from '@/components/ui/button';
import { Heart, User, Filter } from 'lucide-react';

export const Route = createFileRoute('/thanks')({
  component: ThanksPage,
});

function ThanksPage() {
  const [thanks, setThanks] = useState<Thanks[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'given' | 'received'>('all');
  const currentCommunity = useAppStore(state => state.currentCommunity);
  const viewMode = useAppStore(state => state.viewMode);
  
  // Load thanks on community change
  React.useEffect(() => {
    const loadThanks = async () => {
      setIsLoading(true);
      const feed = await ThanksManager.getThanksFeed(currentCommunity.id);
      setThanks(feed);
      setIsLoading(false);
    };
    
    loadThanks();
  }, [currentCommunity.id]);
  
  // Filter the thanks based on the selected filter
  const filteredThanks = React.useMemo(() => {
    if (filter === 'all') return thanks;
    if (filter === 'given') return thanks.filter(t => t.from_member_id === '1'); // Current user ID
    if (filter === 'received') return thanks.filter(t => t.to_member_id === '1'); // Current user ID
    return thanks;
  }, [thanks, filter]);
  
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
          {viewMode === 'member' && (
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
          
          {viewMode === 'organizer' && (
            <ViewSwitcher />
          )}
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto">
        <ThanksFeed thanks={filteredThanks} isLoading={isLoading} />
      </div>
    </AppLayout>
  );
}