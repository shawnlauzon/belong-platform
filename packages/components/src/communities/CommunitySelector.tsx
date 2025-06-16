import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { CreateCommunityDialog } from './CreateCommunityDialog';

// Temporary type until API package is properly configured
interface TempCommunity {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  memberCount?: number;
}

// Temporary hook until API package is properly configured
function useCommunities() {
  return {
    data: [] as TempCommunity[],
    isLoading: false,
  };
}

export function CommunitySelector() {
  const { data: communities = [], isLoading } = useCommunities();
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>('worldwide');
  const [browseCommunityId, setBrowseCommunityId] = useState('worldwide');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCommunity = communities.find((c: TempCommunity) => c.id === selectedCommunityId);

  // Set default selected community when communities load
  useEffect(() => {
    if (communities.length > 0 && selectedCommunityId === 'worldwide') {
      const defaultCommunity =
        communities.find((c: TempCommunity) => c.id === 'south-austin') || communities[0];
      if (defaultCommunity) {
        setSelectedCommunityId(defaultCommunity.id);
      }
    }
  }, [communities, selectedCommunityId]);

  // Get the breadcrumb chain from worldwide down to the browse community
  const getBreadcrumbChain = () => {
    const chain: TempCommunity[] = [];
    let currentId: string | null = browseCommunityId;

    while (currentId) {
      const community = communities.find((c: TempCommunity) => c.id === currentId);
      if (community) {
        chain.unshift(community);
        currentId = community.parentId || null;
      } else {
        break;
      }
    }

    return chain;
  };

  // Get the selected community's full chain for display
  const getSelectedCommunityChain = () => {
    if (!selectedCommunityId) return [];

    const chain: TempCommunity[] = [];
    let currentId: string | null = selectedCommunityId;

    while (currentId) {
      const community = communities.find((c: TempCommunity) => c.id === currentId);
      if (community) {
        chain.unshift(community);
        currentId = community.parentId || null;
      } else {
        break;
      }
    }

    return chain;
  };

  // Get children of the current browse community
  const getChildCommunities = () => {
    return communities.filter((c: TempCommunity) => c.parentId === browseCommunityId);
  };

  const breadcrumbChain = getBreadcrumbChain();
  const selectedCommunityChain = getSelectedCommunityChain();
  const childCommunities = getChildCommunities();

  const handleCommunitySelect = (community: TempCommunity) => {
    setSelectedCommunityId(community.id);
    setIsOpen(false);
  };

  const handleBreadcrumbClick = (communityId: string) => {
    setBrowseCommunityId(communityId);
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    setShowCreateDialog(true);
  };

  const handleCommunityCreated = (community: { id: string }) => {
    // Select the newly created community
    setSelectedCommunityId(community.id);
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

  if (!selectedCommunityId) {
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
          {/* Display selected community chain - each part separately clickable */}
          <div className="hidden sm:flex items-center gap-1">
            {selectedCommunityChain.map((community, i) => (
              <React.Fragment key={community.id}>
                {i > 0 && <span className="text-warmgray-400 mx-1">›</span>}
                <button
                  onClick={() => {
                    setBrowseCommunityId(community.id);
                    setIsOpen(true);
                  }}
                  className={`hover:text-primary-600 transition-colors ${
                    i === selectedCommunityChain.length - 1
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
            {selectedCommunity?.name}
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
              {childCommunities.map((community: TempCommunity) => (
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
                      {community.memberCount} members
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
        parentCommunity={communities.find((c: TempCommunity) => c.id === browseCommunityId) || undefined}
        onCommunityCreated={handleCommunityCreated}
      />
    </>
  );
}
