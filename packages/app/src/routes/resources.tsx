import { createFileRoute, redirect } from '@tanstack/react-router';
import { ResourceList } from '../components/resources/ResourceList';

export const Route = createFileRoute('/resources')({
  component: ResourcesPage,
  // beforeLoad: ({ context }) => {
  //   // Redirect to auth if not authenticated
  //   if (!context.auth?.user) {
  //     throw redirect({
  //       to: '/auth',
  //     });
  //   }
  // },
});

function ResourcesPage() {
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