import { createFileRoute } from '@tanstack/react-router';
import { CommunityDetail } from '../components/communities/CommunityDetail';
import { useAuth } from '../providers/AuthProvider';

export const Route = createFileRoute('/community/$id')({
  component: CommunityDetailPage,
});

function CommunityDetailPage() {
  const { id } = Route.useParams();
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
        <CommunityDetail communityId={id} />
      </div>
    </div>
  );
}