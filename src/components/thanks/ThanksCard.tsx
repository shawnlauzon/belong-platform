import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrustBadge } from '@/components/trust/TrustBadge';
import { formatTimeAgo } from '@/lib/utils';
import { Thanks } from '@/types';

interface ThanksCardProps {
  thanks: Thanks;
}

export function ThanksCard({ thanks }: ThanksCardProps) {
  return (
    <Card className="overflow-hidden animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={thanks.from_member?.avatar_url} alt={thanks.from_member?.name} />
              <AvatarFallback>{thanks.from_member?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-warmgray-900">{thanks.from_member?.name}</div>
              <div className="text-xs text-warmgray-500 flex items-center gap-1">
                <span>thanked</span>
                <span className="font-medium text-warmgray-700">{thanks.to_member?.name}</span>
                <span className="text-warmgray-400">•</span>
                <span>{formatTimeAgo(thanks.created_at)}</span>
              </div>
            </div>
          </div>
          <TrustBadge score={thanks.to_member?.trust_score || 0} showLabel size="sm" />
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="text-warmgray-700 text-sm mb-3">
          {thanks.message}
        </div>
        
        {thanks.impact_description && (
          <div className="bg-trust-50 border-l-2 border-trust-300 p-3 rounded-r-md text-xs text-warmgray-700 italic mb-3">
            <div className="text-xs text-trust-700 font-medium mb-1">Impact:</div>
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