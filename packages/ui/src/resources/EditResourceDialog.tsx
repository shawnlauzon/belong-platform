import React, { useState } from 'react';
import { useUpdateResource } from '@belongnetwork/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from '@belongnetwork/components';
import { ResourceForm } from './ResourceForm';
import { Edit } from 'lucide-react';
import type { Resource } from '@belongnetwork/types';

interface EditResourceDialogProps {
  resource: Resource;
}

export function EditResourceDialog({ resource }: EditResourceDialogProps) {
  const [open, setOpen] = useState(false);
  const updateResourceMutation = useUpdateResource();

  const handleSubmit = (data: any) => {
    updateResourceMutation.mutate(
      { ...data, id: resource.id },
      {
        onSuccess: () => {
          setOpen(false);
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center space-x-2"
      >
        <Edit className="h-4 w-4" />
        <span>Edit</span>
      </Button>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Resource</DialogTitle>
        </DialogHeader>
        <ResourceForm
          onSubmit={handleSubmit}
          isLoading={updateResourceMutation.isPending}
          initialData={{
            type: resource.type,
            category: resource.category,
            title: resource.title,
            description: resource.description,
            image_urls: resource.image_urls,
            pickup_instructions: resource.pickup_instructions,
            parking_info: resource.parking_info,
            meetup_flexibility: resource.meetup_flexibility,
            availability: resource.availability,
            location: resource.location
          }}
        />
      </DialogContent>
    </Dialog>
  );
}