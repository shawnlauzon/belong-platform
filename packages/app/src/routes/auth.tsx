import { createFileRoute, redirect } from '@tanstack/react-router';
import { AuthForms } from '../components/auth/AuthForms';

export const Route = createFileRoute('/auth')({
  component: AuthPage,
  beforeLoad: ({ context }) => {
    // Redirect to dashboard if already authenticated
    if (context.auth?.user) {
      throw redirect({
        to: '/dashboard',
      });
    }
  },
});

function AuthPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Belong Network
          </h1>
          <p className="mt-2 text-gray-600">
            Connect with your local community
          </p>
        </div>
        <AuthForms />
      </div>
    </div>
  );
}