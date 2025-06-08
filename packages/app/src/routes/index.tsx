import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { ThanksFeed } from '@/components/thanks/ThanksFeed';
import { ViewSwitcher } from '@/components/layout/ViewSwitcher';
import { useThanks } from '@/hooks/useThanks';
import { useAppStore } from '@/core/state';
import { useResources } from '@/hooks/useResources';
import { Plus, ChevronRight, Users } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { ShareResourceDialog } from '@/components/resources/ShareResourceDialog';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useAuth } from '@/lib/auth';
import { logger, logComponentRender, logUserAction } from '@/lib/logger';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  logComponentRender('HomePage');
  
  const userLocation = useAppStore(state => state.userLocation);
  const viewMode = useAppStore(state => state.viewMode);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { user } = useAuth();
  
  // Use React Query to fetch resources and thanks
  const { data: resources = [], isLoading: resourcesLoading } = useResources(8);
  const { data: thanks = [], isLoading: thanksLoading } = useThanks();
  
  // Get the 3 closest resources
  const nearbyResources = React.useMemo(() => {
    return [...resources]
      .sort((a, b) => (a.distance_minutes || 100) - (b.distance_minutes || 100))
      .slice(0, 3);
  }, [resources]);

  // Get the 2 most recent thanks
  const recentThanks = React.useMemo(() => {
    return thanks.slice(0, 2);
  }, [thanks]);
  
  const handleResourceRequest = (resourceId: string) => {
    logUserAction('resource_request_clicked', { resourceId, hasUser: !!user });
    
    if (!user) {
      logger.debug('👤 User not authenticated, showing auth dialog');
      setShowAuthDialog(true);
      return;
    }
    
    logger.info('📦 Resource requested:', { resourceId });
  };
  
  const handleShareClick = () => {
    logUserAction('share_resource_clicked', { hasUser: !!user });
    
    if (!user) {
      logger.debug('👤 User not authenticated, showing auth dialog');
      setShowAuthDialog(true);
      return;
    }
    
    logger.debug('📦 Opening share resource dialog');
    setShowShareDialog(true);
  };
  
  return (
    <AppLayout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-display font-bold text-warmgray-800">
          {viewMode === 'member' ? 'My Neighborhood' : 'Community Dashboard'}
        </h1>
        <ViewSwitcher />
      </div>
      
      {viewMode === 'member' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card 
              className="bg-gradient-to-br from-primary-500 to-primary-700 text-white cursor-pointer hover:shadow-lg transition-shadow"
              onClick={handleShareClick}
            >
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className="rounded-full bg-white bg-opacity-20 p-4">
                  <Plus className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Share Something</h3>
                  <p className="text-primary-100">Tools, skills, or items you'd like to share with neighbors</p>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="bg-gradient-to-br from-trust-500 to-trust-700 text-white cursor-pointer hover:shadow-lg transition-shadow"
              onClick={handleShareClick}
            >
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className="rounded-full bg-white bg-opacity-20 p-4">
                  <Plus className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Ask for Something</h3>
                  <p className="text-trust-100">Need something from your neighbors? Just ask!</p>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="bg-gray-100 hover:bg-gray-50 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => user ? undefined : setShowAuthDialog(true)}
            >
              <Link to={user ? "/profile/me" : "#"}>
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                  <div className="rounded-full bg-white p-4 shadow-sm">
                    <Users className="h-8 w-8 text-warmgray-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-warmgray-800 mb-2">My Profile</h3>
                    <p className="text-warmgray-500">View your trust score and sharing history</p>
                  </div>
                </CardContent>
              </Link>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* Nearby Resources */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-warmgray-800">
                  Nearby Resources
                </h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/resources" className="flex items-center gap-1">
                    <span>View All</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              
              {resourcesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm h-[200px] animate-pulse" />
                  ))}
                </div>
              ) : nearbyResources.length > 0 ? (
                <div className="space-y-4">
                  {nearbyResources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      onRequest={handleResourceRequest}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-warmgray-500">No nearby resources found</p>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Recent Thanks */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-warmgray-800">
                  Recent Thanks
                </h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/thanks" className="flex items-center gap-1">
                    <span>View All</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              
              <ThanksFeed thanks={recentThanks} isLoading={thanksLoading} />
            </div>
          </div>

          <ShareResourceDialog 
            open={showShareDialog} 
            onOpenChange={setShowShareDialog} 
          />

          <AuthDialog 
            open={showAuthDialog} 
            onOpenChange={setShowAuthDialog} 
          />
        </>
      )}
      
      {viewMode === 'organizer' && (
        <div className="space-y-6">
          <Card>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
                  <div className="text-2xl font-bold text-primary-600">145</div>
                  <div className="text-sm text-warmgray-500">Members</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
                  <div className="text-2xl font-bold text-primary-600">{resources.length}</div>
                  <div className="text-sm text-warmgray-500">Active Resources</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
                  <div className="text-2xl font-bold text-primary-600">{thanks.length}</div>
                  <div className="text-sm text-warmgray-500">Total Thanks</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
                  <div className="text-2xl font-bold text-primary-600">7.2</div>
                  <div className="text-sm text-warmgray-500">Avg Trust Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}