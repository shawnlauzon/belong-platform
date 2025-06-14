import { createFileRoute, redirect } from '@tanstack/react-router';
import { AuthForms } from '../components/auth/AuthForms';
import { useAuth } from '../providers/AuthProvider';

export const Route = createFileRoute('/auth')({
  component: AuthPage,
  beforeLoad: () => {
    // Note: We can't access context in beforeLoad, so we handle redirect in component
  },
});

function AuthPage() {
  const { user } = useAuth();

  // Redirect to dashboard if already authenticated
  if (user) {
    window.location.href = '/dashboard';
    return null;
  }

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