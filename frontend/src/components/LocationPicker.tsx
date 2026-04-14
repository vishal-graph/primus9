'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, TextField, Paper, Typography, Button, CircularProgress } from '@mui/material';
import { MyLocation } from '@mui/icons-material';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { geolocationErrorMessage } from '@/lib/geolocation-errors';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBKmPxBMomVgWR5r5eKJoImpjUCu4NcUAE';

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('Google Maps API key is not configured. Location picker may not work correctly.');
}

const mapContainerStyle = {
  width: '100%',
  height: '300px',
};

const defaultCenter = {
  lat: 28.6139, // Default to New Delhi
  lng: 77.2090,
};

interface LocationPickerProps {
  value: string;
  onChange: (location: string) => void;
  error?: boolean;
  helperText?: string;
}

export default function LocationPicker({ value, onChange, error, helperText }: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Initialize Google Maps services when script loads
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (typeof window !== 'undefined' && window.google?.maps?.places && !isScriptLoaded) {
        setIsScriptLoaded(true);
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      }
    };

    // Check immediately
    checkGoogleMaps();

    // Also check periodically in case script loads after component mounts (max 5 seconds)
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds at 100ms intervals
    const interval = setInterval(() => {
      attempts++;
      checkGoogleMaps();
      if (isScriptLoaded || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isScriptLoaded]);

  // Update map center when location changes
  useEffect(() => {
    if (selectedLocation) {
      setMapCenter(selectedLocation);
    }
  }, [selectedLocation]);

  // Handle clicking outside suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get place details from place ID
  const getPlaceDetails = useCallback((placeId: string) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      { placeId },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const location = { lat, lng };
          setSelectedLocation(location);
          const address = place.formatted_address || place.name || '';
          onChange(address);
          setShowSuggestions(false);
        }
      }
    );
  }, [onChange]);

  // Fetch autocomplete suggestions
  const fetchSuggestions = useCallback((inputValue: string) => {
    if (!autocompleteServiceRef.current || !inputValue.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: inputValue,
        componentRestrictions: { country: 'in' },
        types: ['geocode', 'establishment'],
      },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions.slice(0, 5)); // Show top 5 suggestions
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    );
  }, []);

  // Handle input changes with debouncing
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current) return;

    const input = inputRef.current;
    let timeoutId: NodeJS.Timeout;

    const handleInput = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchSuggestions(input.value);
      }, 300);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && suggestions.length > 0) {
        e.preventDefault();
        getPlaceDetails(suggestions[0].place_id);
      }
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('keydown', handleKeyDown);

    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeoutId);
    };
  }, [isScriptLoaded, fetchSuggestions, suggestions, getPlaceDetails]);

  // Initialize PlacesService when map is ready
  const onMapLoad = useCallback((map: google.maps.Map) => {
    if (map && typeof google !== 'undefined' && google.maps && google.maps.places) {
      placesServiceRef.current = new google.maps.places.PlacesService(map);
    }
  }, []);

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const location = { lat, lng };
      setSelectedLocation(location);
      
      // Reverse geocode to get address
      if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            onChange(results[0].formatted_address);
          } else {
            onChange(`${lat}, ${lng}`);
          }
        });
      } else {
        onChange(`${lat}, ${lng}`);
      }
    }
  }, [onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const location = { lat, lng };
        
        setSelectedLocation(location);
        setMapCenter(location);

        // Reverse geocode to get address
        if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location }, (results, status) => {
            setGettingLocation(false);
            if (status === 'OK' && results && results[0]) {
              onChange(results[0].formatted_address);
            } else {
              onChange(`${lat}, ${lng}`);
            }
          });
        } else {
          setGettingLocation(false);
          onChange(`${lat}, ${lng}`);
        }
      },
      (error) => {
        setGettingLocation(false);
        console.error('Error getting location:', error);
        const code = (error as GeolocationPositionError).code;
        const msg =
          typeof code === 'number'
            ? geolocationErrorMessage(code, error.message)
            : `Unable to get your location: ${error.message}`;
        alert(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [onChange]);

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      loadingElement={<Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>}
      libraries={['places']}
    >
      <Box>
        <Box sx={{ mb: 2, position: 'relative', display: 'flex', gap: 1 }}>
          <Box sx={{ flex: 1, position: 'relative' }}>
            <TextField
              fullWidth
              inputRef={inputRef}
              label="Search Location"
              variant="outlined"
              value={value}
              onChange={handleInputChange}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              error={error}
              helperText={helperText}
              placeholder="Type to search or click on the map"
            />
            {showSuggestions && suggestions.length > 0 && (
              <Paper
                ref={suggestionsRef}
                elevation={3}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  mt: 0.5,
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                {suggestions.map((prediction) => (
                  <Box
                    key={prediction.place_id}
                    onClick={() => getPlaceDetails(prediction.place_id)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <Typography variant="body2" fontWeight={500}>
                      {prediction.structured_formatting.main_text}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {prediction.structured_formatting.secondary_text}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            )}
          </Box>
          <Button
            variant="outlined"
            startIcon={gettingLocation ? <CircularProgress size={16} /> : <MyLocation />}
            onClick={getCurrentLocation}
            disabled={gettingLocation}
            sx={{ 
              minWidth: 'auto',
              px: 2,
              whiteSpace: 'nowrap'
            }}
            title="Get my current location"
          >
            {gettingLocation ? 'Locating...' : 'My Location'}
          </Button>
        </Box>
        
        <Paper elevation={2} sx={{ overflow: 'hidden', borderRadius: 1 }}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={selectedLocation ? 15 : 10}
            onClick={onMapClick}
            onLoad={onMapLoad}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
            }}
          >
            {selectedLocation && (
              <Marker
                position={selectedLocation}
                animation={google.maps.Animation.DROP}
              />
            )}
          </GoogleMap>
        </Paper>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Click "My Location" to use your current location, search for a place, or click on the map
        </Typography>
      </Box>
    </LoadScript>
  );
}
