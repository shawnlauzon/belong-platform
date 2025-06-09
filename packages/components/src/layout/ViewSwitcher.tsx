import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Users, User } from 'lucide-react';
import { eventBus } from '@belongnetwork/core';

interface ViewSwitcherProps {
  initialView?: 'member' | 'organizer';
}

export function ViewSwitcher({ initialView = 'member' }: ViewSwitcherProps) {
  const [activeView, setActiveView] = useState<'member' | 'organizer'>(
    initialView
  );

  const handleViewChange = (view: 'member' | 'organizer') => {
    setActiveView(view);
    eventBus.emit('view.changed', { view });
  };

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1 text-sm">
      <Button
        variant={activeView === 'member' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleViewChange('member')}
        className="flex items-center gap-1"
      >
        <User className="h-4 w-4" />
        <span>Member</span>
      </Button>
      <Button
        variant={activeView === 'organizer' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleViewChange('organizer')}
        className="flex items-center gap-1"
      >
        <Users className="h-4 w-4" />
        <span>Organizer</span>
      </Button>
    </div>
  );
}
