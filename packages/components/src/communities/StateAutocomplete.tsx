import React, { useState, useRef, useEffect } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { useCommunities } from '@/hooks/useCommunities';
import { logger, logUserAction } from '@/lib/logger';

// Common states/provinces by country
const STATES_BY_COUNTRY: Record<string, string[]> = {
  'United States': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
  ],
  'Canada': [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
    'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
    'Quebec', 'Saskatchewan', 'Yukon'
  ],
  'Australia': [
    'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia',
    'Tasmania', 'Australian Capital Territory', 'Northern Territory'
  ],
  'Germany': [
    'Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse',
    'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate',
    'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'
  ],
  'United Kingdom': [
    'England', 'Scotland', 'Wales', 'Northern Ireland'
  ],
  'France': [
    'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Brittany', 'Centre-Val de Loire',
    'Corsica', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandy', 'Nouvelle-Aquitaine',
    'Occitania', 'Pays de la Loire', 'Provence-Alpes-Côte d\'Azur'
  ],
  'Spain': [
    'Andalusia', 'Aragon', 'Asturias', 'Balearic Islands', 'Basque Country', 'Canary Islands',
    'Cantabria', 'Castile and León', 'Castile-La Mancha', 'Catalonia', 'Extremadura', 'Galicia',
    'La Rioja', 'Madrid', 'Murcia', 'Navarre', 'Valencia'
  ],
  'Italy': [
    'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia',
    'Lazio', 'Liguria', 'Lombardy', 'Marche', 'Molise', 'Piedmont', 'Puglia', 'Sardinia',
    'Sicily', 'Tuscany', 'Trentino-Alto Adige', 'Umbria', 'Valle d\'Aosta', 'Veneto'
  ],
  'Brazil': [
    'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo',
    'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba',
    'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul',
    'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
  ],
  'Mexico': [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
    'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'México',
    'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro',
    'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
    'Veracruz', 'Yucatán', 'Zacatecas'
  ],
  'India': [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
    'West Bengal'
  ]
};

interface StateAutocompleteProps {
  value: string;
  onChange: (state: string) => void;
  country: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function StateAutocomplete({ 
  value, 
  onChange, 
  country,
  disabled = false,
  placeholder = "Type or select a state/province...",
  className = ""
}: StateAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: communities = [] } = useCommunities();

  // Get existing states from communities for the selected country
  const existingStates = communities
    .filter(c => c.level === 'state')
    .filter(c => {
      // Find the parent country
      const parentCountry = communities.find(parent => 
        parent.id === c.parent_id && parent.level === 'country'
      );
      return parentCountry?.name === country;
    })
    .map(c => c.name);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Reset when country changes
  useEffect(() => {
    if (!country) {
      setInputValue('');
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [country]);

  const filterSuggestions = (query: string) => {
    if (!query.trim() || !country) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    
    // Get states for the selected country
    const countryStates = STATES_BY_COUNTRY[country] || [];
    
    // Combine existing states and common states, remove duplicates
    const allStates = [...new Set([...existingStates, ...countryStates])];
    
    // Filter and sort by relevance
    const filtered = allStates
      .filter(state => state.toLowerCase().includes(lowerQuery))
      .sort((a, b) => {
        // Prioritize exact matches
        if (a.toLowerCase() === lowerQuery) return -1;
        if (b.toLowerCase() === lowerQuery) return 1;
        
        // Prioritize starts with
        const aStartsWith = a.toLowerCase().startsWith(lowerQuery);
        const bStartsWith = b.toLowerCase().startsWith(lowerQuery);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        // Prioritize existing states
        const aExists = existingStates.includes(a);
        const bExists = existingStates.includes(b);
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
    const exactMatch = filtered.find(state => 
      state.toLowerCase() === newValue.toLowerCase()
    );
    
    if (exactMatch && exactMatch !== value) {
      onChange(exactMatch);
      logUserAction('state_auto_selected', { state: exactMatch, country });
    }
  };

  const handleSuggestionClick = (state: string) => {
    logger.info('🗺️ StateAutocomplete: State selected:', { state, country });
    
    setInputValue(state);
    setShowSuggestions(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    
    onChange(state);
    
    logUserAction('state_selected', { 
      state, 
      country,
      isExisting: existingStates.includes(state) 
    });
  };

  const handleClear = () => {
    setInputValue('');
    setShowSuggestions(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    onChange('');
    
    logUserAction('state_cleared', { country });
    
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
      setHighlightedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSuggestionClick(suggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        // Allow custom state entry
        onChange(inputValue.trim());
        setShowSuggestions(false);
        logUserAction('state_custom_entered', { state: inputValue.trim(), country });
      }
    }
  };

  const handleFocus = () => {
    if (inputValue.trim() && country) {
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

  const getPlaceholderText = () => {
    if (!country) return "Select a country first...";
    return placeholder;
  };

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
          placeholder={getPlaceholderText()}
          disabled={disabled || !country}
          className="w-full border rounded-md p-2 pr-16 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
          autoComplete="off"
        />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {inputValue && !disabled && country && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
              title="Clear state/province"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
          <MapPin className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && !disabled && country && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((state, index) => {
            const isExisting = existingStates.includes(state);
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">
                      {state}
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
      {showSuggestions && suggestions.length === 0 && inputValue.trim() && !disabled && country && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3">
          <div className="flex items-center gap-2 text-gray-500">
            <Search className="h-4 w-4" />
            <span className="text-sm">
              No states found. Press Enter to add "{inputValue}" as a new state/province.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}