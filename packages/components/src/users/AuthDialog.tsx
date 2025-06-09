import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { eventBus } from '@belongnetwork/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { logger, logComponentRender, logUserAction } from '@belongnetwork/core';

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
  logComponentRender('AuthDialog', { open });

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  // Listen for auth events
  useEffect(() => {
    const unsubscribeSignInSuccess = eventBus.on('auth.signIn.success', () => {
      logger.info('✅ AuthDialog: Sign in successful');
      setIsSubmitting(false);
      setError(null);
      onOpenChange(false);
    });

    const unsubscribeSignUpSuccess = eventBus.on('auth.signUp.success', () => {
      logger.info('✅ AuthDialog: Sign up successful');
      setIsSubmitting(false);
      setError(null);
      onOpenChange(false);
    });

    const unsubscribeSignInFailed = eventBus.on(
      'auth.signIn.failed',
      (event) => {
        logger.error('❌ AuthDialog: Sign in failed:', event.data.error);
        setIsSubmitting(false);
        setError(event.data.error);
      }
    );

    const unsubscribeSignUpFailed = eventBus.on(
      'auth.signUp.failed',
      (event) => {
        logger.error('❌ AuthDialog: Sign up failed:', event.data.error);
        setIsSubmitting(false);
        setError(event.data.error);
      }
    );

    return () => {
      unsubscribeSignInSuccess();
      unsubscribeSignUpSuccess();
      unsubscribeSignInFailed();
      unsubscribeSignUpFailed();
    };
  }, [onOpenChange]);

  const onSubmit = async (data: AuthFormData) => {
    logger.debug('🔐 Auth form submitted:', {
      mode,
      email: data.email,
      hasFirstName: !!data.firstName,
      hasLastName: !!data.lastName,
    });

    setIsSubmitting(true);
    setError(null);

    logUserAction(`auth_${mode}_attempt`, { email: data.email });

    if (mode === 'signin') {
      logger.debug('📝 Emitting sign in request...');
      eventBus.emit('auth.signIn.requested', {
        email: data.email,
        password: data.password,
      });
    } else {
      logger.debug('📝 Emitting sign up request...');
      eventBus.emit('auth.signUp.requested', {
        email: data.email,
        password: data.password,
        metadata: {
          firstName: data.firstName || '',
          lastName: data.lastName || '',
        },
      });
    }
  };

  const handleModeChange = (newMode: 'signin' | 'signup') => {
    logUserAction('auth_mode_change', { from: mode, to: newMode });
    setMode(newMode);
    setError(null);
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
