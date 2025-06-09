import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '~/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '~/ui/avatar';
import { TrustBadge } from '~/trust/TrustBadge';
import { formatTimeAgo } from '~/utils/formatters';
import { Thanks } from '@belongnetwork/core';
import { Link } from '@tanstack/react-router';

interface ThanksCardProps {
  thanks: Thanks;
}

export function ThanksCard({ thanks }: ThanksCardProps) {
  return (
    <Card className="overflow-hidden animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Clickable Avatar for the person giving thanks */}
            <Link
              to="/profile/$id"
              params={{ id: thanks.from_member?.id || '' }}
              className="hover:opacity-80 transition-opacity"
              title={`View ${thanks.from_member?.name}'s profile`}
            >
              <Avatar>
                <AvatarImage
                  src={thanks.from_member?.avatar_url}
                  alt={thanks.from_member?.name}
                />
                <AvatarFallback>{thanks.from_member?.name?.[0]}</AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <div className="font-medium text-warmgray-900">
                <Link
                  to="/profile/$id"
                  params={{ id: thanks.from_member?.id || '' }}
                  className="hover:text-primary-600 transition-colors"
                  title={`View ${thanks.from_member?.name}'s profile`}
                >
                  {thanks.from_member?.name}
                </Link>
              </div>
              <div className="text-xs text-warmgray-500 flex items-center gap-1">
                <span>thanked</span>
                <Link
                  to="/profile/$id"
                  params={{ id: thanks.to_member?.id || '' }}
                  className="font-medium text-warmgray-700 hover:text-primary-600 transition-colors"
                  title={`View ${thanks.to_member?.name}'s profile`}
                >
                  {thanks.to_member?.name}
                </Link>
                <span className="text-warmgray-400">•</span>
                <span>{formatTimeAgo(thanks.created_at)}</span>
              </div>
            </div>
          </div>
          <Link
            to="/profile/$id"
            params={{ id: thanks.to_member?.id || '' }}
            className="hover:opacity-80 transition-opacity"
            title={`View ${thanks.to_member?.name}'s profile`}
          >
            <TrustBadge
              score={thanks.to_member?.trust_score || 0}
              showLabel
              size="sm"
            />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="text-warmgray-700 text-sm mb-3">{thanks.message}</div>

        {thanks.impact_description && (
          <div className="bg-trust-50 border-l-2 border-trust-300 p-3 rounded-r-md text-xs text-warmgray-700 italic mb-3">
            <div className="text-xs text-trust-700 font-medium mb-1">
              Impact:
            </div>
            {thanks.impact_description}
          </div>
        )}

        {thanks.image_urls && thanks.image_urls.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2">
            {thanks.image_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt="Thanks"
                className="rounded-md w-full object-cover max-h-[250px]"
              />
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-warmgray-500">
          <span>For:</span>
          <span className="font-medium text-warmgray-700">
            {thanks.resource?.title || 'Resource sharing'}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
