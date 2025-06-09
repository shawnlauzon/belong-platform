import React from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { TrustBadge } from '../trust';
import { Button } from '../ui/button';
import { User } from '@belongnetwork/core';
import { Link } from '@tanstack/react-router';
import { Heart, MessageCircle, User as UserIcon } from 'lucide-react';

interface MemberCardProps {
  member: User;
  communityId: string;
  showActions?: boolean;
}

export function MemberCard({
  member,
  communityId,
  showActions = true,
}: MemberCardProps) {
  const trustScore = member.trust_scores?.[communityId] ?? 0;

  return (
    <Card className="overflow-hidden animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {/* Clickable Avatar */}
          <Link
            to="/profile/$id"
            params={{ id: member.id }}
            className="hover:opacity-80 transition-opacity"
            title={`View ${member.first_name}'s profile`}
          >
            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
              <AvatarImage src={member.avatar_url} alt={member.first_name} />
              <AvatarFallback>{member.first_name[0]}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <div className="font-medium text-warmgray-900">
              <Link
                to="/profile/$id"
                params={{ id: member.id }}
                className="hover:text-primary-600 transition-colors"
                title={`View ${member.first_name}'s profile`}
              >
                {member.first_name}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <TrustBadge score={trustScore} showLabel />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center text-xs mb-4">
          <div className="bg-gray-50 p-2 rounded">
            <div className="font-semibold text-warmgray-900">
              {Math.floor(Math.random() * 100)}
            </div>
            <div className="text-warmgray-500">Shared</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="font-semibold text-warmgray-900">
              {Math.floor(Math.random() * 100)}
            </div>
            <div className="text-warmgray-500">Thanks</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="font-semibold text-warmgray-900">
              {Math.floor(Math.random() * 10)}
            </div>
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
                <UserIcon className="h-4 w-4" />
                <span>Profile</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1">
              <MessageCircle className="h-4 w-4" />
              <span>Message</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
