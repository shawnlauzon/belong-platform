import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { logger, logComponentRender, logUserAction } from '@/lib/logger';

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
  const { signIn, signUp } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthFormData) => {
    logger.debug('🔐 Auth form submitted:', {
      mode,
      email: data.email,
      hasFirstName: !!data.firstName,
      hasLastName: !!data.lastName
    });
    
    try {
      logUserAction(`auth_${mode}_attempt`, { email: data.email });
      
      if (mode === 'signin') {
        logger.debug('📝 Attempting sign in...');
        await signIn(data.email, data.password);
        logger.info('✅ Sign in successful');
      } else {
        logger.debug('📝 Attempting sign up...');
        await signUp(data.email, data.password, {
          firstName: data.firstName || '',
          lastName: data.lastName || '',
        });
        logger.info('✅ Sign up successful');
      }
      
      logUserAction(`auth_${mode}_success`, { email: data.email });
      onOpenChange(false);
    } catch (error) {
      logger.error(`❌ ${mode} failed:`, error);
      
      // Log detailed error information
      if (error && typeof error === 'object') {
        logger.error('  Error details:', {
          message: (error as any).message,
          status: (error as any).status,
          statusText: (error as any).statusText,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint
        });
      }
      
      // Set user-friendly error message
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error && typeof error === 'object' && (error as any).message) {
        const message = (error as any).message;
        if (message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the confirmation link.';
        } else if (message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Try signing in instead.';
        } else if (message.includes('No API key found')) {
          errorMessage = 'Configuration error. Please contact support.';
          logger.error('🚨 API Key Error - This suggests an Edge Function is being called without proper headers');
        }
      }
      
      logUserAction(`auth_${mode}_error`, { email: data.email, errorMessage });
      setError('root', { message: errorMessage });
    }
  };

  const handleModeChange = (newMode: 'signin' | 'signup') => {
    logUserAction('auth_mode_change', { from: mode, to: newMode });
    setMode(newMode);
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
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <input
                  type="text"
                  {...register('lastName')}
                  className="w-full border rounded-md p-2"
                  placeholder="Enter your last name"
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500">{errors.lastName.message}</p>
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
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {errors.root && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.root.message}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleModeChange(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}