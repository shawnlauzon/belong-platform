import React, { useState } from 'react';
import { useCreateResource } from '@belongnetwork/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Button } from '@belongnetwork/components';
import { ResourceForm } from './ResourceForm';
import { Plus } from 'lucide-react';

export function ShareResourceDialog() {
  const [open, setOpen] = useState(false);
  const createResourceMutation = useCreateResource();

  const handleSubmit = (data: any) => {
    createResourceMutation.mutate(data, {
      onSuccess: () => {
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Share Resource</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share a Resource</DialogTitle>
        </DialogHeader>
        <ResourceForm
          onSubmit={handleSubmit}
          isLoading={createResourceMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}