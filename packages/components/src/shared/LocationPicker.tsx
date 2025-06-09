import React from 'react';
import { Map, Marker, Source, Layer } from 'react-map-gl';
import { Button } from '~/ui/button';
import { MapPin } from 'lucide-react';
import { Coordinates, MAPBOX_TOKEN } from '@belongnetwork/core';
import { Feature, Polygon } from 'geojson';

interface LocationPickerProps {
  value: Coordinates | null;
  onChange: (location: Coordinates | null) => void;
  address?: string;
  addressBbox?: [number, number, number, number] | null;
}

export function LocationPicker({
  value,
  onChange,
  address,
  addressBbox,
}: LocationPickerProps) {
  const [viewport, setViewport] = React.useState({
    latitude: value?.lat,
    longitude: value?.lng,
    zoom: 12,
  });

  // Update viewport when value changes (e.g., from address selection)
  React.useEffect(() => {
    if (value) {
      setViewport((prev) => ({
        ...prev,
        latitude: value.lat,
        longitude: value.lng,
        zoom: 15, // Zoom in more when location is set
      }));
    }
  }, [value]);

  // Fit to address bbox if available
  React.useEffect(() => {
    if (addressBbox && value) {
      // Calculate center and zoom to fit the bounding box
      const [minLng, minLat, maxLng, maxLat] = addressBbox;
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      // Calculate appropriate zoom level based on bbox size
      const latDiff = maxLat - minLat;
      const lngDiff = maxLng - minLng;
      const maxDiff = Math.max(latDiff, lngDiff);

      let zoom = 15;
      if (maxDiff > 0.1) zoom = 10;
      else if (maxDiff > 0.05) zoom = 12;
      else if (maxDiff > 0.01) zoom = 14;

      setViewport({
        latitude: centerLat,
        longitude: centerLng,
        zoom,
      });
    }
  }, [addressBbox, value]);

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
            lng: position.coords.longitude,
          };
          onChange(newLocation);
          setViewport({
            latitude: newLocation.lat,
            longitude: newLocation.lng,
            zoom: 15,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  // Create a polygon for the address area if bbox is available
  const getAddressPolygon = (): Feature<Polygon> | null => {
    if (!addressBbox) return null;

    const [minLng, minLat, maxLng, maxLat] = addressBbox;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [minLng, minLat],
            [maxLng, minLat],
            [maxLng, maxLat],
            [minLng, maxLat],
            [minLng, minLat],
          ],
        ],
      },
    };
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-[200px] rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
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

  const addressPolygon = getAddressPolygon();

  return (
    <div className="space-y-2">
      <div className="h-[200px] rounded-lg overflow-hidden border border-gray-200">
        <Map
          {...viewport}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
          onClick={handleMapClick}
          onMove={(evt) => setViewport(evt.viewState)}
        >
          {/* Address area outline */}
          {addressPolygon && (
            <Source id="address-area" type="geojson" data={addressPolygon}>
              <Layer
                id="address-fill"
                type="fill"
                paint={{
                  'fill-color': '#f97316',
                  'fill-opacity': 0.1,
                }}
              />
              <Layer
                id="address-outline"
                type="line"
                paint={{
                  'line-color': '#f97316',
                  'line-width': 2,
                  'line-dasharray': [2, 2],
                }}
              />
            </Source>
          )}

          {/* Location marker */}
          {value && (
            <Marker longitude={value.lng} latitude={value.lat} anchor="bottom">
              <div className="relative">
                <MapPin className="h-6 w-6 text-primary-500" />
                {address && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap max-w-48 truncate">
                    {address.split(',')[0]} {/* Show just the street address */}
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
