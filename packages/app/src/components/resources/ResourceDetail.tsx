import React from 'react';
import { useResource } from '@belongnetwork/api';
import { Package, User, Calendar, MapPin, Clock, Loader2 } from 'lucide-react';

interface ResourceDetailProps {
  resourceId: string;
}

export function ResourceDetail({ resourceId }: ResourceDetailProps) {
  const { data: resource, isLoading, error } = useResource(resourceId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading resource...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">
          Error loading resource: {error.message}
        </p>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Resource not found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-4">
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${
          resource.type === 'offer' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-blue-100 text-blue-800'
        }`}>
          {resource.type}
        </span>
        <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full">
          {resource.category}
        </span>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        {resource.title}
      </h1>

      <p className="text-gray-600 mb-6 text-lg">
        {resource.description}
      </p>

      {/* Resource Images */}
      {resource.imageUrls && resource.imageUrls.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Images</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resource.imageUrls!.map((url: string, index: number) => (
              <img
                key={index}
                src={url}
                alt={`${resource.title} ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg border border-gray-200"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Resource Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Details</h3>
          <div className="space-y-3">
            <div className="flex items-center text-gray-600">
              <User className="w-4 h-4 mr-2" />
              <span>
                By {resource.owner.fullName || resource.owner.firstName}
              </span>
            </div>
            
            <div className="flex items-center text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              <span>
                Created {resource.createdAt.toLocaleDateString()}
              </span>
            </div>

            {resource.availability && (
              <div className="flex items-center text-gray-600">
                <Clock className="w-4 h-4 mr-2" />
                <span>{resource.availability}</span>
              </div>
            )}

            {resource.location && (
              <div className="flex items-center text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span>
                  {resource.location.lat.toFixed(4)}, {resource.location.lng.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Logistics</h3>
          <div className="space-y-3">
            {resource.pickupInstructions && (
              <div>
                <h4 className="font-medium text-gray-900">Pickup Instructions</h4>
                <p className="text-gray-600">{resource.pickupInstructions}</p>
              </div>
            )}

            {resource.parkingInfo && (
              <div>
                <h4 className="font-medium text-gray-900">Parking Info</h4>
                <p className="text-gray-600">{resource.parkingInfo}</p>
              </div>
            )}

            <div>
              <h4 className="font-medium text-gray-900">Meetup Flexibility</h4>
              <p className="text-gray-600">
                {resource.meetupFlexibility?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Not specified'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}