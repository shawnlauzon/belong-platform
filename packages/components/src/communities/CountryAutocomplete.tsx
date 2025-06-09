import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Globe } from 'lucide-react';
import { logger, logUserAction, useBelongStore } from '@belongnetwork/core';

// Common countries list for autocomplete
const COMMON_COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Japan',
  'South Korea',
  'Singapore',
  'New Zealand',
  'Switzerland',
  'Austria',
  'Belgium',
  'Ireland',
  'Portugal',
  'Brazil',
  'Mexico',
  'Argentina',
  'Chile',
  'India',
  'China',
  'Thailand',
  'Malaysia',
  'Philippines',
  'Indonesia',
  'Vietnam',
  'South Africa',
  'Egypt',
  'Morocco',
  'Kenya',
  'Nigeria',
  'Ghana',
];

interface CountryAutocompleteProps {
  value: string;
  onChange: (country: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function CountryAutocomplete({
  value,
  onChange,
  disabled = false,
  placeholder = 'Type or select a country...',
  className = '',
}: CountryAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { list: communities } = useBelongStore((state) => state.communities);

  // Get existing countries from communities
  const existingCountries = communities
    .filter((c) => c.level === 'country')
    .map((c) => c.name);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filterSuggestions = (query: string) => {
    if (!query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase();

    // Combine existing countries and common countries, remove duplicates
    const allCountries = [
      ...new Set([...existingCountries, ...COMMON_COUNTRIES]),
    ];

    // Filter and sort by relevance
    const filtered = allCountries
      .filter((country) => country.toLowerCase().includes(lowerQuery))
      .sort((a, b) => {
        // Prioritize exact matches
        if (a.toLowerCase() === lowerQuery) return -1;
        if (b.toLowerCase() === lowerQuery) return 1;

        // Prioritize starts with
        const aStartsWith = a.toLowerCase().startsWith(lowerQuery);
        const bStartsWith = b.toLowerCase().startsWith(lowerQuery);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        // Prioritize existing countries
        const aExists = existingCountries.includes(a);
        const bExists = existingCountries.includes(b);
        if (aExists && !bExists) return -1;
        if (!aExists && bExists) return 1;

        // Alphabetical order
        return a.localeCompare(b);
      })
      .slice(0, 8); // Limit to 8 suggestions

    return filtered;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    const filtered = filterSuggestions(newValue);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setHighlightedIndex(-1);

    // If the input exactly matches a suggestion, auto-select it
    const exactMatch = filtered.find(
      (country) => country.toLowerCase() === newValue.toLowerCase()
    );

    if (exactMatch && exactMatch !== value) {
      onChange(exactMatch);
      logUserAction('country_auto_selected', { country: exactMatch });
    }
  };

  const handleSuggestionClick = (country: string) => {
    logger.info('🌍 CountryAutocomplete: Country selected:', { country });

    setInputValue(country);
    setShowSuggestions(false);
    setSuggestions([]);
    setHighlightedIndex(-1);

    onChange(country);

    logUserAction('country_selected', {
      country,
      isExisting: existingCountries.includes(country),
    });
  };

  const handleClear = () => {
    setInputValue('');
    setShowSuggestions(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    onChange('');

    logUserAction('country_cleared');

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSuggestionClick(suggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        // Allow custom country entry
        onChange(inputValue.trim());
        setShowSuggestions(false);
        logUserAction('country_custom_entered', { country: inputValue.trim() });
      }
    }
  };

  const handleFocus = () => {
    if (inputValue.trim()) {
      const filtered = filterSuggestions(inputValue);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
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
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full border rounded-md p-2 pr-16 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
          autoComplete="off"
        />

        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
              title="Clear country"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
          <Globe className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && !disabled && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((country, index) => {
            const isExisting = existingCountries.includes(country);
            const isHighlighted = index === highlightedIndex;

            return (
              <button
                key={country}
                type="button"
                onClick={() => handleSuggestionClick(country)}
                className={`w-full text-left px-3 py-2 focus:outline-none border-b border-gray-100 last:border-b-0 ${
                  isHighlighted ? 'bg-primary-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">
                      {country}
                    </span>
                  </div>
                  {isExisting && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      exists
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* No results message */}
      {showSuggestions &&
        suggestions.length === 0 &&
        inputValue.trim() &&
        !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3">
            <div className="flex items-center gap-2 text-gray-500">
              <Search className="h-4 w-4" />
              <span className="text-sm">
                No countries found. Press Enter to add "{inputValue}" as a new
                country.
              </span>
            </div>
          </div>
        )}
    </div>
  );
}
