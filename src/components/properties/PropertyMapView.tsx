'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import map component to avoid SSR issues
const Map = dynamic(() => import('./MapView'), { ssr: false });

interface PropertyMapViewProps {
  properties: Array<{
    id: string;
    title: string;
    latitude?: number | null;
    longitude?: number | null;
    price: number;
    currency: string;
    propertyType: string;
    bedrooms?: number | null;
    images: string[];
  }>;
  center?: { lat: number; lng: number };
  zoom?: number;
  onPropertyClick?: (propertyId: string) => void;
}

interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  title: string;
  price: string;
  type: string;
  bedrooms?: number | null;
  image?: string;
}

export function PropertyMapView({
  properties,
  center,
  zoom = 12,
  onPropertyClick,
}: PropertyMapViewProps) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [mapCenter, setMapCenter] = useState(center);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  useEffect(() => {
    // Filter properties with valid coordinates
    const validProperties = properties.filter(
      (p) => p.latitude !== null && p.longitude !== null
    );

    // Create markers
    const newMarkers: MapMarker[] = validProperties.map((property) => ({
      id: property.id,
      position: {
        lat: property.latitude!,
        lng: property.longitude!,
      },
      title: property.title,
      price: `${property.currency} ${property.price.toLocaleString()}`,
      type: property.propertyType,
      bedrooms: property.bedrooms,
      image: property.images[0],
    }));

    setMarkers(newMarkers);

    // Calculate center if not provided
    if (!center && validProperties.length > 0) {
      const avgLat =
        validProperties.reduce((sum, p) => sum + (p.latitude || 0), 0) /
        validProperties.length;
      const avgLng =
        validProperties.reduce((sum, p) => sum + (p.longitude || 0), 0) /
        validProperties.length;
      setMapCenter({ lat: avgLat, lng: avgLng });
    }
  }, [properties, center]);

  const handleMarkerClick = (markerId: string) => {
    setSelectedProperty(markerId);
    if (onPropertyClick) {
      onPropertyClick(markerId);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  if (markers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Property Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <p>No properties with location data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Property Map
            <Badge variant="secondary">{markers.length} properties</Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGetCurrentLocation}
          >
            <Navigation className="mr-2 h-4 w-4" />
            My Location
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full rounded-lg overflow-hidden border">
          {mapCenter && (
            <Map
              center={mapCenter}
              zoom={zoom}
              markers={markers}
              selectedMarkerId={selectedProperty}
              onMarkerClick={handleMarkerClick}
            />
          )}
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Click on a marker to view property details</p>
        </div>
      </CardContent>
    </Card>
  );
}

