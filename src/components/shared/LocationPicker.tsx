import React from 'react';
import { Map, Marker } from 'react-map-gl';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { Coordinates } from '@/types';
import { DEFAULT_LOCATION } from '@/lib/mapbox';

interface LocationPickerProps {
  value: Coordinates | null;
  onChange: (location: Coordinates | null) => void;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [viewport, setViewport] = React.useState({
    latitude: value?.lat || DEFAULT_LOCATION.lat,
    longitude: value?.lng || DEFAULT_LOCATION.lng,
    zoom: 12
  });

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
            zoom: 12
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  return (
    <div className="space-y-2">
      <div className="h-[200px] rounded-lg overflow-hidden border border-gray-200">
        <Map
          {...viewport}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
          onClick={handleMapClick}
          onMove={evt => setViewport(evt.viewState)}
        >
          {value && (
            <Marker
              longitude={value.lng}
              latitude={value.lat}
              anchor="bottom"
            >
              <MapPin className="h-6 w-6 text-primary-500" />
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