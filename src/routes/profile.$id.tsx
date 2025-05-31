import React, { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrustScore } from '@/components/trust/TrustScore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { ThanksCard } from '@/components/thanks/ThanksCard';
import { mockMembers, mockResources, mockThanks } from '@/api/mockData';
import { MapPin, Calendar, MessageCircle, Heart } from 'lucide-react';
import { Member, Resource, Thanks } from '@/types';
import { User } from 'lucide-react';

export const Route = createFileRoute('/profile/$id')({
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = Route.useParams();
  const [member, setMember] = useState<Member | null>(null);
  const [memberResources, setMemberResources] = useState<Resource[]>([]);
  const [memberThanks, setMemberThanks] = useState<Thanks[]>([]);
  const [activeTab, setActiveTab] = useState<'resources' | 'thanks'>('resources');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to get member data
    const fetchData = async () => {
      setIsLoading(true);
      
      // Find member by ID (or use first member if ID is 'me')
      const foundMember = id === 'me' 
        ? mockMembers[0]
        : mockMembers.find(m => m.id === id) || null;
      
      if (foundMember) {
        // Get member's resources
        const resources = mockResources.filter(r => r.member_id === foundMember.id);
        
        // Get thanks where member is involved
        const thanks = mockThanks.filter(
          t => t.from_member_id === foundMember.id || t.to_member_id === foundMember.id
        );
        
        setMember(foundMember);
        setMemberResources(resources);
        setMemberThanks(thanks);
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, [id]);

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

  const isSelf = id === 'me';
  
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 h-32"></div>
          <div className="px-6 pb-6 -mt-16">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end">
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                <AvatarImage src={member.avatar_url} alt={member.name} />
                <AvatarFallback className="text-3xl">{member.name[0]}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold text-warmgray-900">{member.name}</h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1">
                  <div className="flex items-center text-sm text-warmgray-500">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>South Austin</span>
                  </div>
                  <div className="flex items-center text-sm text-warmgray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Member for {member.community_tenure_months} months</span>
                  </div>
                </div>
              </div>
              
              {!isSelf && (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>Message</span>
                  </Button>
                  <Button variant="trust" className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    <span>Thank</span>
                  </Button>
                </div>
              )}
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
                
                {isSelf && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm text-warmgray-500">Complete your profile to help neighbors get to know you better.</p>
                    <Button size="sm" variant="outline" className="mt-2">
                      Edit Profile
                    </Button>
                  </div>
                )}
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
        
        {activeTab === 'resources' && (
          <div className="space-y-6">
            {memberResources.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {memberResources.map(resource => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-warmgray-500">No resources shared yet</p>
                  {isSelf && (
                    <Button className="mt-4">Share Something</Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {activeTab === 'thanks' && (
          <div className="space-y-6">
            {memberThanks.length > 0 ? (
              <div className="space-y-6">
                {memberThanks.map(thanks => (
                  <ThanksCard key={thanks.id} thanks={thanks} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-warmgray-500">No thanks yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}