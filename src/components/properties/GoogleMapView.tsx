'use client';

import React, { useEffect, useRef, useState } from 'react';

interface GoogleMapViewProps {
  latitude: number;
  longitude: number;
  title?: string;
  address?: string;
  apiKey?: string;
  height?: string;
}

export function GoogleMapView({
  latitude,
  longitude,
  title = 'Property Location',
  address,
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  height = '400px',
}: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.google) {
      setIsLoaded(true);
      return;
    }

    if (!apiKey) {
      setError('Google Maps API key not configured');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError('Failed to load Google Maps');
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const position = { lat: latitude, lng: longitude };

    const map = new google.maps.Map(mapRef.current, {
      center: position,
      zoom: 15,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    });

    const marker = new google.maps.Marker({
      position: position,
      map: map,
      title: title,
    });

    // Add info window
    if (address || title) {
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 200px;">
            <h3 style="font-weight: 600; margin: 0 0 4px 0;">${title}</h3>
            ${address ? `<p style="margin: 0; font-size: 14px; color: #666;">${address}</p>` : ''}
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      // Open by default
      infoWindow.open(map, marker);
    }
  }, [isLoaded, latitude, longitude, title, address]);

  if (error) {
    return (
      <div 
        className="w-full rounded-lg border border-border bg-muted flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center p-4">
          <p className="text-sm text-destructive font-semibold mb-2">{error}</p>
          <p className="text-xs text-muted-foreground">
            Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef}
      className="w-full rounded-lg border border-border"
      style={{ height }}
    >
      {!isLoaded && (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
