'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search } from 'lucide-react';

interface GoogleMapsLocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (lat: number, lng: number) => void;
  address?: string;
  apiKey?: string;
}

export function GoogleMapsLocationPicker({
  latitude,
  longitude,
  onLocationChange,
  address,
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
}: GoogleMapsLocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [searchAddress, setSearchAddress] = useState(address || '');
  const [currentCoords, setCurrentCoords] = useState({
    lat: latitude || 37.7749,
    lng: longitude || -122.4194,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    if (window.google) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup is handled by Google Maps
    };
  }, [apiKey]);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: currentCoords,
      zoom: 13,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;

    // Add marker
    const marker = new google.maps.Marker({
      position: currentCoords,
      map: map,
      draggable: true,
      title: 'Property Location',
    });

    markerRef.current = marker;

    // Update coordinates on marker drag
    marker.addListener('dragend', () => {
      const position = marker.getPosition();
      if (position) {
        const newLat = position.lat();
        const newLng = position.lng();
        setCurrentCoords({ lat: newLat, lng: newLng });
        onLocationChange(newLat, newLng);
      }
    });

    // Update marker on map click
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        marker.setPosition(e.latLng);
        setCurrentCoords({ lat, lng });
        onLocationChange(lat, lng);
      }
    });
  }, [isLoaded]);

  // Update map when coordinates change externally
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && (latitude || longitude)) {
      const newLat = latitude || currentCoords.lat;
      const newLng = longitude || currentCoords.lng;
      const newPosition = { lat: newLat, lng: newLng };

      mapInstanceRef.current.setCenter(newPosition);
      markerRef.current.setPosition(newPosition);
      setCurrentCoords(newPosition);
    }
  }, [latitude, longitude]);

  const handleSearchLocation = async () => {
    if (!searchAddress.trim() || !isLoaded) return;

    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address: searchAddress }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        const newLat = location.lat();
        const newLng = location.lng();

        setCurrentCoords({ lat: newLat, lng: newLng });
        onLocationChange(newLat, newLng);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setCenter(location);
          mapInstanceRef.current.setZoom(15);
          markerRef.current.setPosition(location);
        }
      } else {
        console.error('Geocoding failed:', status);
      }
    });
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;
          const newPosition = { lat: newLat, lng: newLng };

          setCurrentCoords(newPosition);
          onLocationChange(newLat, newLng);

          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setCenter(newPosition);
            mapInstanceRef.current.setZoom(15);
            markerRef.current.setPosition(newPosition);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <MapPin className="h-5 w-5" />
            Google Maps Not Configured
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-destructive/10 rounded-lg">
            <p className="text-sm">
              To use Google Maps, please add your API key to the environment variables:
            </p>
            <code className="block mt-2 p-2 bg-muted rounded text-xs">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Get your API key from: <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud Console</a>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Property Location on Google Maps
        </CardTitle>
        <CardDescription>
          Click on the map or drag the marker to set the exact location. You can also search for an address.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Box */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="search-location" className="sr-only">Search Address</Label>
            <Input
              id="search-location"
              placeholder="Search for an address..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
            />
          </div>
          <Button onClick={handleSearchLocation} variant="secondary" disabled={!isLoaded}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          <Button onClick={handleGetCurrentLocation} variant="outline" disabled={!isLoaded}>
            <MapPin className="h-4 w-4 mr-2" />
            My Location
          </Button>
        </div>

        {/* Map Container */}
        <div
          ref={mapRef}
          className="w-full h-96 rounded-lg border border-border"
          style={{ minHeight: '400px' }}
        >
          {!isLoaded && (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading Google Maps...</p>
              </div>
            </div>
          )}
        </div>

        {/* Coordinates Display */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <Label className="text-xs text-muted-foreground">Latitude</Label>
            <p className="font-mono text-sm font-semibold">{currentCoords.lat.toFixed(6)}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Longitude</Label>
            <p className="font-mono text-sm font-semibold">{currentCoords.lng.toFixed(6)}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 <strong>Tip:</strong> Click anywhere on the map or drag the marker to set the property location.
          This helps buyers find your property on the map view.
        </p>
      </CardContent>
    </Card>
  );
}

