import React, { useState } from 'react';
import { useCreateThanks } from '@belongnetwork/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Button } from '@belongnetwork/components';
import { ThanksForm } from './ThanksForm';
import { Heart } from 'lucide-react';

interface CreateThanksDialogProps {
  resourceId?: string;
  toUserId?: string;
}

export function CreateThanksDialog({ resourceId, toUserId }: CreateThanksDialogProps) {
  const [open, setOpen] = useState(false);
  const createThanksMutation = useCreateThanks();

  const handleSubmit = (data: any) => {
    createThanksMutation.mutate(data, {
      onSuccess: () => {
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <Heart className="h-4 w-4" />
          <span>Say Thanks</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Say Thanks</DialogTitle>
        </DialogHeader>
        <ThanksForm
          onSubmit={handleSubmit}
          isLoading={createThanksMutation.isPending}
          resourceId={resourceId}
          toUserId={toUserId}
        />
      </DialogContent>
    </Dialog>
  );
}