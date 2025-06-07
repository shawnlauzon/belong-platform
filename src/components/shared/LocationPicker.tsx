import React from 'react';
import { Map, Marker, Source, Layer } from 'react-map-gl';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { Coordinates } from '@/types';
import { DEFAULT_LOCATION } from '@/lib/mapbox';

interface LocationPickerProps {
  value: Coordinates | null;
  onChange: (location: Coordinates | null) => void;
  zipCode?: string;
}

export function LocationPicker({ value, onChange, zipCode }: LocationPickerProps) {
  const [viewport, setViewport] = React.useState({
    latitude: value?.lat || DEFAULT_LOCATION.lat,
    longitude: value?.lng || DEFAULT_LOCATION.lng,
    zoom: 12
  });

  // Update viewport when value changes (e.g., from zip code)
  React.useEffect(() => {
    if (value) {
      setViewport(prev => ({
        ...prev,
        latitude: value.lat,
        longitude: value.lng,
        zoom: 13 // Zoom in a bit when location is set
      }));
    }
  }, [value]);

  const handleMapClick = (event: any) => {
    const { lat, lng } = event.lngLat;
    onChange({ lat, lng });
  };

  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          onChange(newLocation);
          setViewport({
            latitude: newLocation.lat,
            longitude: newLocation.lng,
            zoom: 13
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  // Create a simple polygon for zip code area (approximate)
  const getZipCodePolygon = (center: Coordinates) => {
    // Create a rough square around the center point
    // In a real app, you'd use actual zip code boundary data
    const offset = 0.02; // Roughly 1-2 miles
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [center.lng - offset, center.lat - offset],
          [center.lng + offset, center.lat - offset],
          [center.lng + offset, center.lat + offset],
          [center.lng - offset, center.lat + offset],
          [center.lng - offset, center.lat - offset]
        ]]
      }
    };
  };

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  if (!mapboxToken) {
    return (
      <div className="h-[200px] rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
        <div className="text-center p-4">
          <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Map preview not available</p>
          <p className="text-sm text-gray-500">Please add your Mapbox token to .env</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="h-[200px] rounded-lg overflow-hidden border border-gray-200">
        <Map
          {...viewport}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={mapboxToken}
          onClick={handleMapClick}
          onMove={evt => setViewport(evt.viewState)}
        >
          {/* Zip code area outline */}
          {zipCode && value && (
            <Source
              id="zipcode-area"
              type="geojson"
              data={getZipCodePolygon(value)}
            >
              <Layer
                id="zipcode-fill"
                type="fill"
                paint={{
                  'fill-color': '#f97316',
                  'fill-opacity': 0.1
                }}
              />
              <Layer
                id="zipcode-outline"
                type="line"
                paint={{
                  'line-color': '#f97316',
                  'line-width': 2,
                  'line-dasharray': [2, 2]
                }}
              />
            </Source>
          )}

          {/* Location marker */}
          {value && (
            <Marker
              longitude={value.lng}
              latitude={value.lat}
              anchor="bottom"
            >
              <div className="relative">
                <MapPin className="h-6 w-6 text-primary-500" />
                {zipCode && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {zipCode}
                  </div>
                )}
              </div>
            </Marker>
          )}
        </Map>
      </div>
      
      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
        >
          Use Current Location
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
          >
            Clear Location
          </Button>
        )}
      </div>
    </div>
  );
}