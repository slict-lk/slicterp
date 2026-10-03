'use client';

import React, { useEffect, useRef } from 'react';

interface MapViewProps {
  center: { lat: number; lng: number };
  zoom: number;
  markers: Array<{
    id: string;
    position: { lat: number; lng: number };
    title: string;
    price: string;
    type: string;
    bedrooms?: number | null;
    image?: string;
  }>;
  selectedMarkerId?: string | null;
  onMarkerClick?: (markerId: string) => void;
}

// Simple Leaflet-based map component (you can replace with Google Maps or Mapbox)
export default function MapView({
  center,
  zoom,
  markers,
  selectedMarkerId,
  onMarkerClick,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // Dynamically import Leaflet
    const initMap = async () => {
      if (typeof window === 'undefined') return;

      const L = (await import('leaflet')).default;

      if (!mapRef.current || mapInstanceRef.current) return;

      // Initialize map
      const map = L.map(mapRef.current).setView([center.lat, center.lng], zoom);

      // Add tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add markers
      markers.forEach((marker) => {
        const markerElement = L.marker([marker.position.lat, marker.position.lng])
          .addTo(map)
          .bindPopup(
            `
            <div class="p-2">
              ${marker.image ? `<img src="${marker.image}" alt="${marker.title}" class="w-full h-32 object-cover rounded mb-2" />` : ''}
              <h3 class="font-semibold">${marker.title}</h3>
              <p class="text-sm text-gray-600">${marker.type}${marker.bedrooms ? ` • ${marker.bedrooms} bed` : ''}</p>
              <p class="font-bold text-lg mt-1">${marker.price}</p>
            </div>
          `,
            { maxWidth: 250 }
          );

        markerElement.on('click', () => {
          if (onMarkerClick) {
            onMarkerClick(marker.id);
          }
        });

        markersRef.current.push({ id: marker.id, marker: markerElement });
      });
    };

    initMap();

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = [];
    };
  }, []);

  // Update map center when it changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([center.lat, center.lng], zoom);
    }
  }, [center, zoom]);

  // Handle selected marker
  useEffect(() => {
    if (selectedMarkerId && markersRef.current.length > 0) {
      const selected = markersRef.current.find((m) => m.id === selectedMarkerId);
      if (selected) {
        selected.marker.openPopup();
      }
    }
  }, [selectedMarkerId]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    />
  );
}

