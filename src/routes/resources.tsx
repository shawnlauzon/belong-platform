import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { ResourceList } from '@/components/resources/ResourceList';
import { ResourceMap } from '@/components/resources/ResourceMap';
import { ResourceForm } from '@/components/resources/ResourceForm';
import { Button } from '@/components/ui/button';
import { useResources } from '@/hooks/useResources';
import { useAppStore } from '@/core/state';
import { Plus, List, MapPin } from 'lucide-react';

export const Route = createFileRoute('/resources')({
  component: ResourcesPage,
});

function ResourcesPage() {
  const userLocation = useAppStore(state => state.userLocation);
  const [viewType, setViewType] = useState<'list' | 'map'>('list');
  const [showForm, setShowForm] = useState(false);
  const { data: resources = [], isLoading } = useResources(8);

  const handleRequestResource = (resourceId: string) => {
    alert(`Requesting resource: ${resourceId}`);
  };
  
  const handleFormComplete = () => {
    setShowForm(false);
  };
  
  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-warmgray-800">Resources Near You</h1>
          <p className="text-warmgray-500">
            {resources.length} resources within an 8-minute drive
          </p>
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="bg-white rounded-lg shadow-sm flex p-1">
            <Button
              variant={viewType === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('list')}
              className="flex items-center gap-1"
            >
              <List className="h-4 w-4" />
              <span>List</span>
            </Button>
            <Button
              variant={viewType === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('map')}
              className="flex items-center gap-1"
            >
              <MapPin className="h-4 w-4" />
              <span>Map</span>
            </Button>
          </div>
          
          <Button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            <span>Share</span>
          </Button>
        </div>
      </div>
      
      {showForm ? (
        <ResourceForm onComplete={handleFormComplete} />
      ) : (
        <>
          {viewType === 'map' ? (
            <ResourceMap 
              resources={resources} 
              userLocation={userLocation} 
              onRequestResource={handleRequestResource}
            />
          ) : (
            <ResourceList 
              resources={resources}
              isLoading={isLoading}
              onRequestResource={handleRequestResource}
            />
          )}
        </>
      )}
    </AppLayout>
  );
}