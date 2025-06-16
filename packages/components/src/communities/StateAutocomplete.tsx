import React, { useState, useRef, useEffect } from 'react';
import { Search, X, MapPin } from 'lucide-react';

// US states for autocomplete
const US_STATES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
  'District of Columbia',
];

interface StateAutocompleteProps {
  value: string;
  onChange: (state: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function StateAutocomplete({
  value,
  onChange,
  disabled = false,
  placeholder = 'Type or select a US state...',
  className = '',
}: StateAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filterSuggestions = (query: string) => {
    if (!query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase();

    // Filter and sort by relevance
    const filtered = US_STATES
      .filter((state) => state.toLowerCase().includes(lowerQuery))
      .sort((a, b) => {
        // Prioritize exact matches
        if (a.toLowerCase() === lowerQuery) return -1;
        if (b.toLowerCase() === lowerQuery) return 1;

        // Prioritize starts with
        const aStartsWith = a.toLowerCase().startsWith(lowerQuery);
        const bStartsWith = b.toLowerCase().startsWith(lowerQuery);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

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
      (state) => state.toLowerCase() === newValue.toLowerCase()
    );

    if (exactMatch && exactMatch !== value) {
      onChange(exactMatch);
    }
  };

  const handleSuggestionClick = (state: string) => {
    setInputValue(state);
    setShowSuggestions(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    onChange(state);
  };

  const handleClear = () => {
    setInputValue('');
    setShowSuggestions(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    onChange('');

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
        // Allow custom state entry
        onChange(inputValue.trim());
        setShowSuggestions(false);
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
              title="Clear state"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
          <MapPin className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && !disabled && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((state, index) => {
            const isHighlighted = index === highlightedIndex;

            return (
              <button
                key={state}
                type="button"
                onClick={() => handleSuggestionClick(state)}
                className={`w-full text-left px-3 py-2 focus:outline-none border-b border-gray-100 last:border-b-0 ${
                  isHighlighted ? 'bg-primary-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900">
                    {state}
                  </span>
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
                No states found. Press Enter to add "{inputValue}" as a custom
                state.
              </span>
            </div>
          </div>
        )}
    </div>
  );
}
