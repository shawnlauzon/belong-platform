import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { mockCommunities } from '@/api/mockData';
import { eventBus } from '@/core/eventBus';
import { Community } from '@/types';

export function CommunitySelector() {
  const [activeCommunity, setActiveCommunity] = useState<Community>(mockCommunities[0]);
  const [isOpen, setIsOpen] = useState(false);

  // Get the nested community chain
  const getCommunityChain = () => {
    const chain: Community[] = [activeCommunity];
    let currentId = activeCommunity.parent_id;
    
    while (currentId) {
      const parent = mockCommunities.find(c => c.id === currentId);
      if (parent) {
        chain.push(parent);
        currentId = parent.parent_id;
      } else {
        break;
      }
    }
    
    return chain.reverse();
  };
  
  const communityChain = getCommunityChain();

  const handleCommunitySelect = (community: Community) => {
    setActiveCommunity(community);
    setIsOpen(false);
    eventBus.emit('community.changed', { communityId: community.id });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm text-warmgray-800 hover:bg-gray-50 shadow-sm"
      >
        <span className="hidden sm:flex items-center gap-1">
          {communityChain.map((community, i) => (
            <React.Fragment key={community.id}>
              {i > 0 && <span className="text-warmgray-400 mx-1">›</span>}
              <span className={i === communityChain.length - 1 ? 'font-medium' : 'text-warmgray-500'}>
                {community.name}
              </span>
            </React.Fragment>
          ))}
        </span>
        <span className="sm:hidden font-medium">{activeCommunity.name}</span>
        <ChevronDown className="h-4 w-4 text-warmgray-400" />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 w-full max-w-md mt-1 bg-white rounded-lg border border-gray-200 shadow-lg animate-fade-in">
          <ul className="py-2 divide-y divide-gray-100">
            {mockCommunities.map((community) => (
              <li key={community.id}>
                <button
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex justify-between items-center"
                  onClick={() => handleCommunitySelect(community)}
                >
                  <div>
                    <span className="font-medium">{community.name}</span>
                    <p className="text-xs text-warmgray-500">{community.description}</p>
                  </div>
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                    {community.member_count} members
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}