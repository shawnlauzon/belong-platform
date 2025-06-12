import React from 'react';
import { MapPin, Clock, User } from 'lucide-react';
import { Badge, Card, Avatar } from '@belongnetwork/components';
import type { Resource } from '@belongnetwork/types';

interface ResourceCardProps {
  resource: Resource;
  onClick?: () => void;
}

export function ResourceCard({ resource, onClick }: ResourceCardProps) {
  const categoryColors = {
    tools: 'bg-blue-100 text-blue-800',
    skills: 'bg-green-100 text-green-800',
    food: 'bg-orange-100 text-orange-800',
    supplies: 'bg-purple-100 text-purple-800',
    other: 'bg-gray-100 text-gray-800',
  };

  const typeColors = {
    offer: 'bg-emerald-100 text-emerald-800',
    request: 'bg-amber-100 text-amber-800',
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Badge className={typeColors[resource.type]}>
              {resource.type}
            </Badge>
            <Badge className={categoryColors[resource.category as keyof typeof categoryColors]}>
              {resource.category}
            </Badge>
          </div>
        </div>

        {/* Title and Description */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {resource.title}
        </h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {resource.description}
        </p>

        {/* Image */}
        {resource.image_urls && resource.image_urls.length > 0 && (
          <div className="mb-4">
            <img
              src={resource.image_urls[0]}
              alt={resource.title}
              className="w-full h-32 object-cover rounded-md"
            />
          </div>
        )}

        {/* Footer */}
        <div className="space-y-2">
          {/* Owner */}
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <img 
                src={resource.owner.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${resource.owner.first_name}`}
                alt={resource.owner.first_name}
              />
            </Avatar>
            <span className="text-sm text-gray-600">
              {resource.owner.first_name} {resource.owner.last_name}
            </span>
          </div>

          {/* Availability */}
          {resource.availability && (
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{resource.availability}</span>
            </div>
          )}

          {/* Distance */}
          {resource.distance_minutes && (
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              <span>{resource.distance_minutes} min drive</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}