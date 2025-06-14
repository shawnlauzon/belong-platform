import { createFileRoute, redirect } from '@tanstack/react-router';
import { CommunityDetail } from '../components/communities/CommunityDetail';

export const Route = createFileRoute('/community/$id')({
  component: CommunityDetailPage,
  beforeLoad: ({ context }) => {
    // Redirect to auth if not authenticated
    if (!context.auth?.user) {
      throw redirect({
        to: '/auth',
      });
    }
  },
});

function CommunityDetailPage() {
  const { id } = Route.useParams();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <CommunityDetail communityId={id} />
      </div>
    </div>
  );
}