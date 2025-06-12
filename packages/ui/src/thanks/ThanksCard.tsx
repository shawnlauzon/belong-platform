import React from 'react';
import { Heart, Package } from 'lucide-react';
import { Card, Avatar, Badge } from '@belongnetwork/components';
import type { Thanks } from '@belongnetwork/types';

interface ThanksCardProps {
  thanks: Thanks;
}

export function ThanksCard({ thanks }: ThanksCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start space-x-4">
        {/* From User Avatar */}
        <Avatar className="h-12 w-12">
          <img 
            src={thanks.from_user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${thanks.from_user.first_name}`}
            alt={thanks.from_user.first_name}
          />
        </Avatar>

        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center space-x-2 mb-2">
            <span className="font-medium text-gray-900">
              {thanks.from_user.first_name} {thanks.from_user.last_name}
            </span>
            <span className="text-gray-500">thanked</span>
            <span className="font-medium text-gray-900">
              {thanks.to_user.first_name} {thanks.to_user.last_name}
            </span>
            <Heart className="h-4 w-4 text-red-500 fill-current" />
          </div>

          {/* Resource Reference */}
          {thanks.resource && (
            <div className="flex items-center space-x-2 mb-3">
              <Package className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                for "{thanks.resource.title}"
              </span>
              <Badge variant="outline" className="text-xs">
                {thanks.resource.type}
              </Badge>
            </div>
          )}

          {/* Message */}
          <p className="text-gray-700 mb-3">
            {thanks.message}
          </p>

          {/* Impact Description */}
          {thanks.impact_description && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-3">
              <p className="text-sm text-orange-800">
                <strong>Impact:</strong> {thanks.impact_description}
              </p>
            </div>
          )}

          {/* Images */}
          {thanks.image_urls && thanks.image_urls.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {thanks.image_urls.slice(0, 4).map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Thanks image ${index + 1}`}
                  className="w-full h-24 object-cover rounded-md"
                />
              ))}
            </div>
          )}

          {/* Timestamp */}
          <div className="text-xs text-gray-500">
            {thanks.created_at.toLocaleDateString()} at {thanks.created_at.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </Card>
  );
}