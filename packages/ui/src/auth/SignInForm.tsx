import React, { useState } from 'react';
import { useSignIn } from '@belongnetwork/api';
import { Button } from '@belongnetwork/components';

interface SignInFormProps {
  onSuccess?: () => void;
}

export function SignInForm({ onSuccess }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const signInMutation = useSignIn();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signInMutation.mutate(
      { email, password },
      {
        onSuccess: () => {
          onSuccess?.();
        }
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Enter your email"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Enter your password"
          required
        />
      </div>

      {signInMutation.error && (
        <div className="text-red-600 text-sm">
          {signInMutation.error.message}
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full"
        disabled={signInMutation.isPending}
      >
        {signInMutation.isPending ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}