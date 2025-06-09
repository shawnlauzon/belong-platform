import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { Coordinates } from '@belongnetwork/core';
import { logger, logUserAction } from '@belongnetwork/core';
import { mapbox } from '@belongnetwork/core';

interface AddressSuggestion {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  context?: Array<{
    id: string;
    text: string;
  }>;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (
    address: string,
    coordinates: Coordinates | null,
    bbox?: [number, number, number, number]
  ) => void;
  placeholder?: string;
  className?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Start typing your address...',
  className = '',
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Update internal state when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      logger.debug('🔍 AddressAutocomplete: Searching for addresses:', {
        query,
      });

      const results = await mapbox.searchAddresses(query);
      setSuggestions(results);
      setShowSuggestions(true);

      logUserAction('address_search', {
        query,
        resultCount: results.length,
      });
    } catch (error) {
      logger.error('❌ AddressAutocomplete: Search error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the search
    debounceRef.current = setTimeout(() => {
      if (newValue.trim()) {
        searchAddresses(newValue);
      } else {
        setSuggestions([]);
      }
    }, 300);
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    const coordinates: Coordinates = {
      lat: suggestion.center[1],
      lng: suggestion.center[0],
    };

    logger.info('📍 AddressAutocomplete: Address selected:', {
      address: suggestion.place_name,
      coordinates,
      bbox: suggestion.bbox,
    });

    setInputValue(suggestion.place_name);
    setShowSuggestions(false);
    setSuggestions([]);

    onChange(suggestion.place_name, coordinates, suggestion.bbox);

    logUserAction('address_selected', {
      address: suggestion.place_name,
      coordinates,
      hasBbox: !!suggestion.bbox,
    });
  };

  const handleClear = () => {
    setInputValue('');
    setShowSuggestions(false);
    setSuggestions([]);
    onChange('', null);

    logUserAction('address_cleared');

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleFocus = () => {
    if (inputValue.length >= 3) {
      setShowSuggestions(true);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="w-full border rounded-md p-2 pr-16 focus:outline-none focus:ring-2 focus:ring-primary-400"
          autoComplete="off"
        />

        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>
          )}
          {!isLoading && inputValue && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!isLoading && !inputValue && (
            <MapPin className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="font-medium text-gray-900">
                {suggestion.place_name.split(',')[0]}
              </div>
              {suggestion.context && (
                <div className="text-xs text-gray-500 truncate">
                  {suggestion.context
                    .filter(
                      (ctx) =>
                        ctx.id.includes('postcode') || ctx.id.includes('place')
                    )
                    .map((ctx) => ctx.text)
                    .join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions &&
        !isLoading &&
        suggestions.length === 0 &&
        inputValue.length >= 3 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3">
            <div className="flex items-center gap-2 text-gray-500">
              <Search className="h-4 w-4" />
              <span className="text-sm">
                No addresses found for "{inputValue}"
              </span>
            </div>
          </div>
        )}
    </div>
  );
}
