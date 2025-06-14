import { createFileRoute } from '@tanstack/react-router';
import { ResourceList } from '../components/resources/ResourceList';
import { useAuth } from '../providers/AuthProvider';

export const Route = createFileRoute('/resources')({
  component: ResourcesPage,
});

function ResourcesPage() {
  const { user, loading } = useAuth();

  // Redirect to auth if not authenticated
  if (!loading && !user) {
    window.location.href = '/auth';
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">All Resources</h1>
          <p className="mt-2 text-gray-600">
            Browse and manage community resources
          </p>
        </div>
        
        <ResourceList />
      </div>
    </div>
  );
}