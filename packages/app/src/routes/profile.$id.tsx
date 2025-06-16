import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@belongnetwork/components';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@belongnetwork/components';
// import { TrustScore } from '@belongnetwork/components';
import { Button } from '@belongnetwork/components';
import { Avatar, AvatarFallback, AvatarImage } from '@belongnetwork/components';
import { ResourceCard } from '@belongnetwork/components';
// import { ThanksCard } from '@belongnetwork/components';
import { ProfileEditor } from '@belongnetwork/components';
import { logger } from '@belongnetwork/core';
// import { useBelongStore } from '@belongnetwork/core';
import {
  MapPin,
  Calendar,
  MessageCircle,
  Heart,
  User,
  Edit,
} from 'lucide-react';
import { logComponentRender } from '@belongnetwork/core';

export const Route = createFileRoute('/profile/$id')({
  component: ProfilePage,
});

function ProfilePage() {
  logComponentRender('ProfilePage');

  const { id } = Route.useParams();
  // const user = useBelongStore((state: any) => state.auth.user);
  const user: any = null; // TODO: implement auth store
  const [isEditing, setIsEditing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'resources' | 'thanks'>(
    'resources'
  );

  // const member = useBelongStore((state: any) =>
  //   state.users.list.find((u: any) => u.id === id)
  // );
  const member: any = null; // TODO: implement user store
  // const isLoading = useBelongStore((state: any) => state.users.isLoading);
  const isLoading = false; // TODO: implement loading state
  const isSelf = id === 'me' || user?.id === id;

  // Define helper functions early to avoid hoisting issues
  const getAvatarInitials = () => {
    if (!member) return '';
    return (
      (member.first_name?.charAt(0).toUpperCase() || '') +
      (member.last_name?.charAt(0).toUpperCase() || '')
    );
  };

  const getDisplayName = () => {
    if (!member) return '';
    if (member.first_name && member.last_name) {
      return `${member.first_name} ${member.last_name}`;
    } else if (member.first_name) {
      return member.first_name;
    } else if (member.last_name) {
      return member.last_name;
    }
    return member.first_name || 'Unknown User'; // Fallback
  };

  // Handle save completion - return to view mode
  const handleSaveComplete = () => {
    logger.info(
      '👤 ProfilePage: Profile save completed, returning to view mode'
    );
    setIsEditing(false);
  };

  // Log member data when it's loaded
  React.useEffect(() => {
    if (member) {
      logger.debug('👤 ProfilePage: Member data loaded:', {
        memberId: member?.id,
        displayName: getDisplayName(),
        firstName: member.first_name,
        lastName: member.last_name,
        trustScores: member?.trust_scores,
        hasAvatar: !!member.avatar_url,
        avatarUrl: member?.avatar_url,
        isSelfProfile: isSelf,
        isEditing: isEditing,
        activeTab: activeTab,
      });

      // Log detailed name information
      logger.debug('👤 ProfilePage: Name breakdown:', {
        firstName: member.first_name || 'Not set',
        lastName: member.last_name || 'Not set',
        displayName: getDisplayName(),
        avatarInitials: getAvatarInitials(),
      });

      // Log trust and activity metrics
      logger.debug('👤 ProfilePage: Activity metrics:', {
        trustScores: member?.trust_scores,
      });
    }
  }, [member, isSelf, isEditing, activeTab]);

  // Log loading state
  React.useEffect(() => {
    logger.debug('👤 ProfilePage: Loading state changed:', {
      isLoading,
      hasMember: !!member,
      userId: user?.id,
      profileId: id,
      isSelf,
    });
  }, [isLoading, member, user?.id, id, isSelf]);

  if (isLoading || !member) {
    logger.debug('👤 ProfilePage: Showing loading state');
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
            <div className="h-6 w-48 bg-gray-200 rounded"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isEditing && isSelf) {
    logger.debug('👤 ProfilePage: Showing edit mode');
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-display font-bold text-warmgray-800">
              Edit Profile
            </h1>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
          <ProfileEditor onSaveComplete={handleSaveComplete} />
        </div>
      </AppLayout>
    );
  }

  logger.debug('👤 ProfilePage: Rendering profile view for:', {
    displayName: getDisplayName(),
    isSelf,
    isEditing,
    activeTab,
  });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 h-32"></div>
          <div className="px-6 pb-6 -mt-16">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end">
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                <AvatarImage
                  src={member?.avatar_url || undefined}
                  alt={getDisplayName()}
                />
                <AvatarFallback className="text-3xl">
                  {getAvatarInitials()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold text-warmgray-900">
                  {getDisplayName()}
                </h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1">
                  {/* {member.location && (
                    <div className="flex items-center text-sm text-warmgray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>South Austin</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-warmgray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{formatTenure(member.created_at)}</span>
                  </div> */}
                </div>
              </div>

              <div className="flex gap-2">
                {isSelf ? (
                  <Button
                    variant="outline"
                    className="flex items-center gap-1"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Message</span>
                    </Button>
                    <Button variant="outline" className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      <span>Thank</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Trust Score</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {/* <TrustScore
                score={member.trust_score}
                size="lg"
                showBreakdown
                memberId={member.id}
              /> */}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-warmgray-700">
                      Resources Shared
                    </div>
                    {/* <div className="mt-1 text-warmgray-900">
                      {member.resources_shared}
                    </div> */}
                  </div>
                  <div>
                    <div className="font-medium text-warmgray-700">
                      Thanks Received
                    </div>
                    {/* <div className="mt-1 text-warmgray-900">
                      {member.thanks_received}
                    </div> */}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 bg-white shadow-sm rounded-lg p-1">
          <div className="flex">
            <Button
              variant={activeTab === 'resources' ? 'default' : 'ghost'}
              className="flex-1 flex items-center justify-center gap-2 rounded-md"
              onClick={() => setActiveTab('resources')}
            >
              <User className="h-4 w-4" />
              <span>{isSelf ? 'My Resources' : 'Resources'}</span>
            </Button>
            <Button
              variant={activeTab === 'thanks' ? 'default' : 'ghost'}
              className="flex-1 flex items-center justify-center gap-2 rounded-md"
              onClick={() => setActiveTab('thanks')}
            >
              <Heart className="h-4 w-4" />
              <span>Thanks</span>
            </Button>
          </div>
        </div>

        {/* Resources and Thanks tabs content */}
        {activeTab === 'resources' && (
          <div className="bg-white rounded-lg p-6 text-center">
            <p className="text-warmgray-500">
              Resources will be displayed here in a future update.
            </p>
          </div>
        )}

        {activeTab === 'thanks' && (
          <div className="bg-white rounded-lg p-6 text-center">
            <p className="text-warmgray-500">
              Thanks will be displayed here in a future update.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
