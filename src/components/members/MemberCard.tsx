import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrustBadge } from '@/components/trust/TrustBadge';
import { Button } from '@/components/ui/button';
import { Member } from '@/types';
import { Link } from '@tanstack/react-router';
import { TrustCalculator } from '@/features/trust/TrustCalculator';
import { Heart, MessageCircle, User } from 'lucide-react';

interface MemberCardProps {
  member: Member;
  showActions?: boolean;
}

export function MemberCard({ member, showActions = true }: MemberCardProps) {
  const trustTier = TrustCalculator.getTrustTier(member.trust_score);

  return (
    <Card className="overflow-hidden animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {/* Clickable Avatar */}
          <Link 
            to="/profile/$id" 
            params={{ id: member.id }}
            className="hover:opacity-80 transition-opacity"
            title={`View ${member.name}'s profile`}
          >
            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
              <AvatarImage src={member.avatar_url} alt={member.name} />
              <AvatarFallback>{member.name[0]}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <div className="font-medium text-warmgray-900">
              <Link 
                to="/profile/$id" 
                params={{ id: member.id }}
                className="hover:text-primary-600 transition-colors"
                title={`View ${member.name}'s profile`}
              >
                {member.name}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <TrustBadge score={member.trust_score} showLabel />
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center text-xs mb-4">
          <div className="bg-gray-50 p-2 rounded">
            <div className="font-semibold text-warmgray-900">{member.resources_shared}</div>
            <div className="text-warmgray-500">Shared</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="font-semibold text-warmgray-900">{member.thanks_received}</div>
            <div className="text-warmgray-500">Thanks</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="font-semibold text-warmgray-900">{member.community_tenure_months}</div>
            <div className="text-warmgray-500">Months</div>
          </div>
        </div>
        
        {showActions && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-1"
              asChild
            >
              <Link to={`/profile/${member.id}`}>
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-1"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Message</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}