import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrustBadge } from '@/components/trust/TrustBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatTimeAgo, truncateText } from '@/lib/utils';
import { MapPin, Clock, CarFront } from 'lucide-react';
import { Resource } from '@/types';
import { Link } from '@tanstack/react-router';

interface ResourceCardProps {
  resource: Resource;
  onRequest?: (resourceId: string) => void;
}

export function ResourceCard({ resource, onRequest }: ResourceCardProps) {
  const getCategoryVariant = (category: string) => {
    const variants: Record<string, any> = {
      tools: 'tools',
      skills: 'skills',
      food: 'food',
      supplies: 'supplies',
      other: 'other'
    };
    
    return variants[category] || 'secondary';
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden transition-all hover:shadow-md animate-fade-in">
      <div className="relative">
        {resource.image_urls?.[0] ? (
          <img 
            src={resource.image_urls[0]} 
            alt={resource.title} 
            className="w-full h-48 object-cover" 
          />
        ) : (
          <div className="w-full h-48 bg-primary-50 flex items-center justify-center">
            <span className="text-primary-300 text-lg">No image available</span>
          </div>
        )}
        
        <div className="absolute top-2 left-2">
          <Badge variant={resource.type === 'offer' ? 'trust' : 'default'}>
            {resource.type === 'offer' ? 'Offering' : 'Requesting'}
          </Badge>
        </div>
        
        <div className="absolute top-2 right-2">
          <TrustBadge score={resource.owner?.trust_score || 0} />
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{resource.title}</CardTitle>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <Badge variant={getCategoryVariant(resource.category)}>
            {resource.category.charAt(0).toUpperCase() + resource.category.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <p className="text-sm text-warmgray-600 mb-4">
          {truncateText(resource.description, 120)}
        </p>
        
        <div className="space-y-2">
          {resource.distance_minutes && (
            <div className="flex items-center text-xs text-warmgray-500">
              <CarFront className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
              <span>{resource.distance_minutes} min drive</span>
            </div>
          )}
          
          <div className="flex items-center text-xs text-warmgray-500">
            <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
            <span>{resource.pickup_instructions || 'Contact for pickup details'}</span>
          </div>
          
          <div className="flex items-center text-xs text-warmgray-500">
            <Clock className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
            <span>{resource.availability || 'Flexible availability'}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="border-t border-gray-100 pt-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={resource.owner?.avatar_url} />
            <AvatarFallback>{resource.owner?.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="text-xs">
            <span className="text-warmgray-700 font-medium">{resource.owner?.name}</span>
            <p className="text-warmgray-500">{formatTimeAgo(resource.created_at)}</p>
          </div>
        </div>
        
        <Button 
          size="sm" 
          onClick={() => onRequest?.(resource.id)}
          className="whitespace-nowrap"
        >
          {resource.type === 'offer' ? 'Request' : 'Offer Help'}
        </Button>
      </CardFooter>
    </Card>
  );
}