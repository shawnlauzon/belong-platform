import { createFileRoute, redirect } from '@tanstack/react-router';
import { CommunityList } from '../components/communities/CommunityList';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
  // beforeLoad: ({ context }) => {
  //   // Redirect to auth if not authenticated
  //   if (!context.auth?.user) {
  //     throw redirect({
  //       to: '/auth',
  //     });
  //   }
  // },
});

function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage your communities and resources
          </p>
        </div>
        
        <CommunityList />
      </div>
    </div>
  );
}