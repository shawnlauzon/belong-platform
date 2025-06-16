import React from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { User } from '@belongnetwork/core';
import { Link } from '@tanstack/react-router';
import { MessageCircle, User as UserIcon } from 'lucide-react';

interface MemberCardProps {
  member: User;
  showActions?: boolean;
}

export function MemberCard({
  member,
  showActions = true,
}: MemberCardProps) {
  // Trust scores not implemented yet

  return (
    <Card className="overflow-hidden animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {/* Clickable Avatar */}
          <Link
            to="/profile/$id"
            params={{ id: member.id }}
            className="hover:opacity-80 transition-opacity"
            title={`View ${member.firstName}'s profile`}
          >
            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
              <AvatarImage src={member.avatarUrl} alt={member.firstName} />
              <AvatarFallback>{member.firstName[0]}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <div className="font-medium text-warmgray-900">
              <Link
                to="/profile/$id"
                params={{ id: member.id }}
                className="hover:text-primary-600 transition-colors"
                title={`View ${member.firstName}'s profile`}
              >
                {member.firstName}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              {/* Trust badge removed */}
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
