'use client';

import React, { useEffect, useRef, useState } from 'react';
import type * as L from 'leaflet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search } from 'lucide-react';

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (lat: number, lng: number) => void;
  address?: string;
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  address,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchAddress, setSearchAddress] = useState(address || '');
  const [currentCoords, setCurrentCoords] = useState({
    lat: latitude || 37.7749, // Default to San Francisco
    lng: longitude || -122.4194,
  });

  useEffect(() => {
    const initMap = async () => {
      if (typeof window === 'undefined' || !mapRef.current) return;

      const L = (await import('leaflet')).default;

      // Clean up existing map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      // Initialize map
      const map = L.map(mapRef.current).setView([currentCoords.lat, currentCoords.lng], 13);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add marker
      const marker = L.marker([currentCoords.lat, currentCoords.lng], {
        draggable: true,
      }).addTo(map);

      markerRef.current = marker;

      // Update coordinates on marker drag
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setCurrentCoords({ lat: position.lat, lng: position.lng });
        onLocationChange(position.lat, position.lng);
      });

      // Update marker on map click
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCurrentCoords({ lat, lng });
        onLocationChange(lat, lng);
      });
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update map center when coordinates change externally
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && (latitude || longitude)) {
      const newLat = latitude || currentCoords.lat;
      const newLng = longitude || currentCoords.lng;
      mapInstanceRef.current.setView([newLat, newLng], 13);
      markerRef.current.setLatLng([newLat, newLng]);
      setCurrentCoords({ lat: newLat, lng: newLng });
    }
  }, [latitude, longitude]);

  const handleSearchLocation = async () => {
    if (!searchAddress.trim()) return;

    try {
      // Using Nominatim (OpenStreetMap) geocoding service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);

        setCurrentCoords({ lat: newLat, lng: newLng });
        onLocationChange(newLat, newLng);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 15);
          markerRef.current.setLatLng([newLat, newLng]);
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;

          setCurrentCoords({ lat: newLat, lng: newLng });
          onLocationChange(newLat, newLng);

          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([newLat, newLng], 15);
            markerRef.current.setLatLng([newLat, newLng]);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Property Location on Map
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
          <Button onClick={handleSearchLocation} variant="secondary">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          <Button onClick={handleGetCurrentLocation} variant="outline">
            <MapPin className="h-4 w-4 mr-2" />
            My Location
          </Button>
        </div>

        {/* Map Container */}
        <div
          ref={mapRef}
          className="w-full h-96 rounded-lg border border-border"
          style={{ minHeight: '400px' }}
        />

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
          This helps buyers find your property on the interactive map view.
        </p>
      </CardContent>
    </Card>
  );
}

