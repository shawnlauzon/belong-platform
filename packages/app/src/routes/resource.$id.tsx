import { createFileRoute, redirect } from '@tanstack/react-router';
import { ResourceDetail } from '../components/resources/ResourceDetail';

export const Route = createFileRoute('/resource/$id')({
  component: ResourceDetailPage,
  beforeLoad: ({ context }) => {
    // Redirect to auth if not authenticated
    if (!context.auth?.user) {
      throw redirect({
        to: '/auth',
      });
    }
  },
});

function ResourceDetailPage() {
  const { id } = Route.useParams();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <ResourceDetail resourceId={id} />
      </div>
    </div>
  );
}