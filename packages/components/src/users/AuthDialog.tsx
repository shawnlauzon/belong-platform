import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSignIn, useSignUp } from '@belongnetwork/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(2, 'First name is required').optional(),
  lastName: z.string().min(2, 'Last name is required').optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  const signIn = useSignIn();
  const signUp = useSignUp();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const isSubmitting = signIn.isPending || signUp.isPending;
  const error = signIn.error?.message || signUp.error?.message || null;

  const onSubmit = async (data: AuthFormData) => {
    if (mode === 'signin') {
      signIn.mutate(
        {
          email: data.email,
          password: data.password,
        },
        {
          onSuccess: () => {
            reset();
            onOpenChange(false);
          },
        }
      );
    } else {
      signUp.mutate(
        {
          email: data.email,
          password: data.password,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
        },
        {
          onSuccess: () => {
            reset();
            onOpenChange(false);
          },
        }
      );
    }
  };

  const handleModeChange = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-white">
        <DialogHeader>
          <DialogTitle>
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <input
                  type="text"
                  {...register('firstName')}
                  className="w-full border rounded-md p-2"
                  placeholder="Enter your first name"
                  disabled={isSubmitting}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <input
                  type="text"
                  {...register('lastName')}
                  className="w-full border rounded-md p-2"
                  placeholder="Enter your last name"
                  disabled={isSubmitting}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              {...register('email')}
              className="w-full border rounded-md p-2"
              placeholder="Enter your email"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              {...register('password')}
              className="w-full border rounded-md p-2"
              placeholder="Enter your password"
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Please wait...'
                : mode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                handleModeChange(mode === 'signin' ? 'signup' : 'signin')
              }
              disabled={isSubmitting}
            >
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
