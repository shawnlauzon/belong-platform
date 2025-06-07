import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { ResourceList } from '@/components/resources/ResourceList';
import { ResourceMap } from '@/components/resources/ResourceMap';
import { ResourceForm } from '@/components/resources/ResourceForm';
import { EditResourceDialog } from '@/components/resources/EditResourceDialog';
import { Button } from '@/components/ui/button';
import { useResources, useResource } from '@/hooks/useResources';
import { useAppStore } from '@/core/state';
import { Resource } from '@/types';
import { Plus, List, MapPin } from 'lucide-react';
import { logger, logUserAction } from '@/lib/logger';

export const Route = createFileRoute('/resources')({
  component: ResourcesPage,
});

function ResourcesPage() {
  const userLocation = useAppStore(state => state.userLocation);
  const [viewType, setViewType] = useState<'list' | 'map'>('list');
  const [showForm, setShowForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  
  const { data: resources = [], isLoading } = useResources(8);
  const { data: editingResource } = useResource(editingResourceId || '');

  const handleRequestResource = (resourceId: string) => {
    logger.info('📦 ResourcesPage: Resource request clicked:', { resourceId });
    logUserAction('resource_request_clicked', { resourceId });
    alert(`Requesting resource: ${resourceId}`);
  };
  
  const handleEditResource = (resourceId: string) => {
    logger.info('📦 ResourcesPage: Edit resource clicked:', { resourceId });
    logUserAction('resource_edit_clicked', { resourceId });
    
    setEditingResourceId(resourceId);
    setShowEditDialog(true);
  };
  
  const handleFormComplete = () => {
    logger.debug('📦 ResourcesPage: Form completed');
    setShowForm(false);
  };

  const handleEditComplete = (updatedResource: Resource) => {
    logger.info('📦 ResourcesPage: Resource edit completed:', { 
      resourceId: updatedResource.id,
      title: updatedResource.title 
    });
    
    setShowEditDialog(false);
    setEditingResourceId(null);
  };

  const handleEditDialogClose = () => {
    logger.debug('📦 ResourcesPage: Edit dialog closed');
    setShowEditDialog(false);
    setEditingResourceId(null);
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
              onEditResource={handleEditResource}
            />
          )}
        </>
      )}

      {/* Edit Resource Dialog */}
      <EditResourceDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        resource={editingResource || null}
        onResourceUpdated={handleEditComplete}
      />
    </AppLayout>
  );
}