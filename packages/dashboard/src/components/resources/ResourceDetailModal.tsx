import React from 'react';
import { useResource } from '@belongnetwork/api';
import { X, Package, User, Calendar, MapPin, Clock, Loader2 } from 'lucide-react';

interface ResourceDetailModalProps {
  resourceId: string;
  onClose: () => void;
}

export function ResourceDetailModal({ resourceId, onClose }: ResourceDetailModalProps) {
  const { data: resource, isLoading, error } = useResource(resourceId);

  // Handle escape key to close modal
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading resource details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Error</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">Error loading resource: {error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Not Found</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Resource not found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${
                resource.type === 'offer'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {resource.type}
            </span>
            <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full">
              {resource.category}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {resource.title}
          </h1>

          <p className="text-gray-600 mb-6 text-lg">{resource.description}</p>

          {/* Resource Images */}
          {resource.image_urls && resource.image_urls.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Images</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {resource.image_urls.map((url, index) => (
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
                  <User className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>
                    By {resource.owner.full_name || resource.owner.first_name}
                  </span>
                </div>

                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>Created {resource.created_at.toLocaleDateString()}</span>
                </div>

                {resource.availability && (
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{resource.availability}</span>
                  </div>
                )}

                {resource.location && (
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>
                      {resource.location.lat.toFixed(4)},{' '}
                      {resource.location.lng.toFixed(4)}
                    </span>
                  </div>
                )}

                {/* Contact Information */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Contact Information</h4>
                  <p className="text-blue-800 text-sm">
                    <strong>Email:</strong> {resource.owner.email}
                  </p>
                  <p className="text-blue-800 text-sm mt-1">
                    <strong>Name:</strong> {resource.owner.full_name || resource.owner.first_name}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Logistics
              </h3>
              <div className="space-y-3">
                {resource.pickup_instructions && (
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Pickup Instructions
                    </h4>
                    <p className="text-gray-600 text-sm mt-1">{resource.pickup_instructions}</p>
                  </div>
                )}

                {resource.parking_info && (
                  <div>
                    <h4 className="font-medium text-gray-900">Parking Info</h4>
                    <p className="text-gray-600 text-sm mt-1">{resource.parking_info}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-900">Meetup Flexibility</h4>
                  <p className="text-gray-600 text-sm mt-1">
                    {resource.meetup_flexibility &&
                      resource.meetup_flexibility
                        .replace('_', ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </p>
                </div>

                {/* Availability Status */}
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Availability Status</h4>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      resource.is_active ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className={`text-sm font-medium ${
                      resource.is_active ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {resource.is_active ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}