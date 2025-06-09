import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { eventBus, useBelongStore } from '@belongnetwork/core';
import { Community } from '@belongnetwork/core';
import { Button } from '../ui/button';
import { CreateCommunityDialog } from './CreateCommunityDialog';
import { logger, logComponentRender, logUserAction } from '@belongnetwork/core';

export function CommunitySelector() {
  logComponentRender('CommunitySelector');

  const {
    list: communities = [],
    activeId: activeCommunityId,
    isLoading,
  } = useBelongStore((state) => state.communities);

  const [isOpen, setIsOpen] = useState(false);
  const [browseCommunityId, setBrowseCommunityId] = useState(
    activeCommunityId ?? 'worldwide'
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCommunity = communities.find((c) => c.id === activeCommunityId);

  // Set default active community when communities load
  useEffect(() => {
    if (communities.length > 0 && !activeCommunityId) {
      const defaultCommunity =
        communities.find((c) => c.id === 'south-austin') || communities[0];
      // setActiveCommunity(defaultCommunity);
      logger.debug('🏘️ CommunitySelector: Set default active community:', {
        communityId: defaultCommunity.id,
        communityName: defaultCommunity.name,
      });
    }
  }, [communities, activeCommunityId]);

  // Get the breadcrumb chain from worldwide down to the browse community
  const getBreadcrumbChain = () => {
    const chain: Community[] = [];
    let currentId: string | null = browseCommunityId;

    while (currentId) {
      const community = communities.find((c) => c.id === currentId);
      if (community) {
        chain.unshift(community);
        currentId = community.parent_id;
      } else {
        break;
      }
    }

    return chain;
  };

  // Get the active community's full chain for display
  const getActiveCommunityChain = () => {
    if (!activeCommunityId) return [];

    const chain: Community[] = [];
    let currentId: string | null = activeCommunityId;

    while (currentId) {
      const community = communities.find((c) => c.id === currentId);
      if (community) {
        chain.unshift(community);
        currentId = community.parent_id;
      } else {
        break;
      }
    }

    return chain;
  };

  // Get children of the current browse community
  const getChildCommunities = () => {
    return communities.filter((c) => c.parent_id === browseCommunityId);
  };

  const breadcrumbChain = getBreadcrumbChain();
  const activeCommunityChain = getActiveCommunityChain();
  const childCommunities = getChildCommunities();

  const handleCommunitySelect = (community: Community) => {
    logger.debug('🏘️ CommunitySelector: Community selected:', {
      communityId: community.id,
      communityName: community.name,
    });

    setIsOpen(false);
    eventBus.emit('community.active.change.requested', {
      communityId: community.id,
    });

    logUserAction('community_selected', {
      communityId: community.id,
      communityName: community.name,
      level: community.level,
    });
  };

  const handleBreadcrumbClick = (communityId: string) => {
    logger.debug('🏘️ CommunitySelector: Breadcrumb clicked:', { communityId });
    setBrowseCommunityId(communityId);

    logUserAction('community_breadcrumb_clicked', { communityId });
  };

  const handleCreateNew = () => {
    logger.debug('🏘️ CommunitySelector: Create new community clicked:', {
      parentCommunityId: browseCommunityId,
    });

    setIsOpen(false);
    setShowCreateDialog(true);

    logUserAction('community_create_dialog_opened', {
      parentCommunityId: browseCommunityId,
    });
  };

  const handleCommunityCreated = (newCommunity: Community) => {
    logger.info('🏘️ CommunitySelector: New community created:', newCommunity);

    // Select the newly created community
    eventBus.emit('community.active.change.requested', {
      communityId: newCommunity.id,
    });

    logUserAction('community_created_and_selected', {
      communityId: newCommunity.id,
      communityName: newCommunity.name,
      level: newCommunity.level,
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm text-warmgray-800 shadow-sm">
        <div className="animate-pulse">Loading communities...</div>
      </div>
    );
  }

  if (!activeCommunityId) {
    return (
      <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm text-warmgray-800 shadow-sm">
        <span>No community selected</span>
      </div>
    );
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm text-warmgray-800 hover:bg-gray-50 shadow-sm">
          {/* Display active community chain - each part separately clickable */}
          <div className="hidden sm:flex items-center gap-1">
            {activeCommunityChain.map((community, i) => (
              <React.Fragment key={community.id}>
                {i > 0 && <span className="text-warmgray-400 mx-1">›</span>}
                <button
                  onClick={() => {
                    setBrowseCommunityId(community.id);
                    setIsOpen(true);
                  }}
                  className={`hover:text-primary-600 transition-colors ${
                    i === activeCommunityChain.length - 1
                      ? 'font-medium text-warmgray-800'
                      : 'text-warmgray-500 hover:text-warmgray-700'
                  }`}
                >
                  {community.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Mobile view - just show current community name */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="sm:hidden font-medium"
          >
            {activeCommunity?.name}
          </button>

          {/* Dropdown arrow */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center"
          >
            <ChevronDown className="h-4 w-4 text-warmgray-400" />
          </button>
        </div>

        {isOpen && (
          <div className="absolute z-10 w-full max-w-md mt-1 bg-white rounded-lg border border-gray-200 shadow-lg animate-fade-in">
            {/* Breadcrumb navigation */}
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-1 text-xs">
                {breadcrumbChain.map((community, i) => (
                  <React.Fragment key={community.id}>
                    {i > 0 && <span className="text-warmgray-400 mx-1">›</span>}
                    <button
                      onClick={() => handleBreadcrumbClick(community.id)}
                      className={`hover:text-primary-600 transition-colors ${
                        i === breadcrumbChain.length - 1
                          ? 'font-medium text-warmgray-800'
                          : 'text-warmgray-500 hover:text-warmgray-700'
                      }`}
                    >
                      {community.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="py-2 max-h-64 overflow-y-auto">
              {/* Child communities */}
              {childCommunities.map((community) => (
                <div key={community.id} className="flex items-center">
                  <button
                    className="flex-1 px-4 py-2 text-left hover:bg-gray-50 flex justify-between items-center"
                    onClick={() => handleCommunitySelect(community)}
                  >
                    <div>
                      <span className="font-medium">{community.name}</span>
                      <p className="text-xs text-warmgray-500">
                        {community.description}
                      </p>
                    </div>
                    <div className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                      {community.member_count} members
                    </div>
                  </button>
                </div>
              ))}

              {/* Create New button */}
              <div className="border-t border-gray-100 mt-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCreateNew}
                  className="w-full justify-start gap-2 mx-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create New</span>
                </Button>
              </div>

              {/* No communities message */}
              {childCommunities.length === 0 && (
                <div className="px-4 py-3 text-center text-sm text-warmgray-500">
                  No communities found at this level
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Community Dialog */}
      <CreateCommunityDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        parentCommunityId={browseCommunityId}
        onCommunityCreated={handleCommunityCreated}
      />
    </>
  );
}
