import React, { useState } from 'react';
import { Users, Settings } from 'lucide-react';
import { Button } from '@belongnetwork/components';

export function ViewSwitcher() {
  const [viewMode, setViewMode] = useState<'member' | 'organizer'>('member');

  return (
    <div className="flex items-center space-x-2 bg-white rounded-lg p-1 shadow-sm border">
      <Button
        variant={viewMode === 'member' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setViewMode('member')}
        className="flex items-center space-x-2"
      >
        <Users className="h-4 w-4" />
        <span>Member</span>
      </Button>
      <Button
        variant={viewMode === 'organizer' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setViewMode('organizer')}
        className="flex items-center space-x-2"
      >
        <Settings className="h-4 w-4" />
        <span>Organizer</span>
      </Button>
    </div>
  );
}