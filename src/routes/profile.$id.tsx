import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrustScore } from '@/components/trust/TrustScore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { ThanksCard } from '@/components/thanks/ThanksCard';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { useAuth } from '@/lib/auth';
import { useMember } from '@/hooks/useMembers';
import { formatTenure, getInitials } from '@/lib/utils';
import { MapPin, Calendar, MessageCircle, Heart, User, Edit } from 'lucide-react';

export const Route = createFileRoute('/profile/$id')({
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'resources' | 'thanks'>('resources');
  
  const { data: member, isLoading } = useMember(id === 'me' ? user?.id || '' : id);
  const isSelf = id === 'me' || user?.id === id;

  if (isLoading || !member) {
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
          <ProfileEditor />
        </div>
      </AppLayout>
    );
  }

  const getAvatarInitials = () => {
    return getInitials(member.first_name, member.last_name, member.name);
  };

  const getDisplayName = () => {
    if (member.first_name && member.last_name) {
      return `${member.first_name} ${member.last_name}`;
    } else if (member.first_name) {
      return member.first_name;
    } else if (member.last_name) {
      return member.last_name;
    }
    return member.name; // Fallback to the name field
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 h-32"></div>
          <div className="px-6 pb-6 -mt-16">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end">
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                <AvatarImage src={member.avatar_url || undefined} alt={getDisplayName()} />
                <AvatarFallback className="text-3xl">{getAvatarInitials()}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold text-warmgray-900">{getDisplayName()}</h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1">
                  {member.location && (
                    <div className="flex items-center text-sm text-warmgray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>South Austin</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-warmgray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{formatTenure(member.created_at)}</span>
                  </div>
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
                    <Button variant="outline" className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>Message</span>
                    </Button>
                    <Button variant="trust" className="flex items-center gap-1">
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
              <TrustScore 
                score={member.trust_score} 
                size="lg" 
                showBreakdown 
                memberId={member.id}
              />
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
                    <div className="font-medium text-warmgray-700">Resources Shared</div>
                    <div className="mt-1 text-warmgray-900">{member.resources_shared}</div>
                  </div>
                  <div>
                    <div className="font-medium text-warmgray-700">Thanks Received</div>
                    <div className="mt-1 text-warmgray-900">{member.thanks_received}</div>
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
            <p className="text-warmgray-500">Resources will be displayed here in a future update.</p>
          </div>
        )}
        
        {activeTab === 'thanks' && (
          <div className="bg-white rounded-lg p-6 text-center">
            <p className="text-warmgray-500">Thanks will be displayed here in a future update.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}