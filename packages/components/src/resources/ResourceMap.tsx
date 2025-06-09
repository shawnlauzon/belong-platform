import React, { useState, useRef, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import { ResourceCard } from './ResourceCard';
import {
  Resource,
  Coordinates,
  MAPBOX_PUBLIC_TOKEN,
} from '@belongnetwork/core';
import { TrustBadge } from '../trust/TrustBadge';
import { MapPin, User } from 'lucide-react';

import 'mapbox-gl/dist/mapbox-gl.css';

interface ResourceMapProps {
  resources: Resource[];
  userLocation: Coordinates;
  onRequestResource: (resourceId: string) => void;
}

export function ResourceMap({
  resources,
  userLocation,
  onRequestResource,
}: ResourceMapProps) {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null
  );
  const mapRef = useRef<any>(null);
  const [viewport, setViewport] = useState({
    latitude: userLocation.lat,
    longitude: userLocation.lng,
    zoom: 12,
  });

  // When user location changes, update the map view
  useEffect(() => {
    if (userLocation) {
      setViewport((prev) => ({
        ...prev,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
      }));
    }
  }, [userLocation]);

  const handleMarkerClick = (resource: Resource) => {
    setSelectedResource(resource);
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      tools: 'bg-blue-500',
      skills: 'bg-purple-500',
      food: 'bg-green-500',
      supplies: 'bg-amber-500',
      other: 'bg-gray-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  if (!MAPBOX_PUBLIC_TOKEN) {
    return (
      <div className="h-[500px] rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
        <div className="text-center p-4">
          <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Map preview not available</p>
          <p className="text-sm text-gray-500">
            Please add your Mapbox token to .env
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[500px] rounded-lg overflow-hidden shadow-md">
      <Map
        {...viewport}
        ref={mapRef}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_PUBLIC_TOKEN}
        onMove={(evt) => setViewport(evt.viewState)}
      >
        {/* User location marker */}
        <Marker
          longitude={userLocation.lng}
          latitude={userLocation.lat}
          anchor="center"
        >
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white">
              <User className="h-4 w-4" />
            </div>
            <div className="absolute -bottom-1 -right-1">
              <TrustBadge score={8.5} size="xs" />
            </div>
          </div>
        </Marker>

        {/* Resource markers */}
        {resources.map((resource) => (
          <Marker
            key={resource.id}
            longitude={resource.location.lng}
            latitude={resource.location.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              handleMarkerClick(resource);
            }}
          >
            <div className="relative cursor-pointer transform transition-transform hover:scale-110">
              <div
                className={`h-8 w-8 ${resource.type === 'offer' ? getCategoryColor(resource.category) : 'bg-primary-500'} rounded-full flex items-center justify-center text-white`}
              >
                <MapPin className="h-4 w-4" />
              </div>
              <div className="absolute -bottom-1 -right-1">
                <TrustBadge
                  score={resource.owner?.trust_score || 0}
                  size="xs"
                />
              </div>
            </div>
          </Marker>
        ))}

        {/* Selected resource popup */}
        {selectedResource && (
          <Popup
            longitude={selectedResource.location.lng}
            latitude={selectedResource.location.lat}
            anchor="bottom"
            onClose={() => setSelectedResource(null)}
            closeOnClick={false}
            className="max-w-sm"
          >
            <div className="p-2">
              <ResourceCard
                resource={selectedResource}
                onRequest={() => {
                  onRequestResource(selectedResource.id);
                  setSelectedResource(null);
                }}
              />
            </div>
          </Popup>
        )}

        <NavigationControl position="bottom-right" />
      </Map>
    </div>
  );
}
