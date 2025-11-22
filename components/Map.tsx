import React, { useEffect, useRef, useState } from 'react';
import { User as UserType, Location } from '../types';

// Declare global Leaflet variable since we load it via CDN
declare global {
  interface Window {
    L: any;
  }
}

interface MapProps {
  userLocation: Location | null;
  destination?: string | null; // We won't geocode destination in this simple view, but we could
  userRole: 'rider' | 'driver' | 'landing';
}

const Map: React.FC<MapProps> = ({ userLocation, userRole }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const driverMarkersRef = useRef<any[]>([]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      // Default to Manila if no location yet
      const initialLat = userLocation?.lat || 14.5995;
      const initialLng = userLocation?.lng || 120.9842;

      const map = window.L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([initialLat, initialLng], 15);

      // Light/Minimalist Tile Layer (CartoDB Positron)
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      mapInstanceRef.current = map;
    }
  }, []);

  // Update User Marker & View
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L || !userLocation) return;

    const iconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="w-4 h-4 bg-slate-900 rounded-full z-10 ring-4 ring-white shadow-xl"></div>
        <div class="absolute inset-0 bg-slate-900/20 rounded-full animate-ping scale-150"></div>
      </div>
    `;

    const customIcon = window.L.divIcon({
      html: iconHtml,
      className: 'custom-marker-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userMarkerRef.current = window.L.marker([userLocation.lat, userLocation.lng], { icon: customIcon }).addTo(map);
    }

    // Only fly to location on first load or significant change to avoid jitter
    map.flyTo([userLocation.lat, userLocation.lng], 16, {
       animate: true,
       duration: 1.5
    });

  }, [userLocation]);

  // Simulate Nearby Drivers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L || !userLocation) return;

    // Clear existing
    driverMarkersRef.current.forEach(m => map.removeLayer(m));
    driverMarkersRef.current = [];

    // Create 3-5 random drivers around the user
    const driverCount = 4;
    for (let i = 0; i < driverCount; i++) {
        const latOffset = (Math.random() - 0.5) * 0.005;
        const lngOffset = (Math.random() - 0.5) * 0.005;
        
        const driverIconHtml = `
          <div class="relative">
             <div class="w-3 h-3 bg-amber-500 rounded-full shadow-lg shadow-amber-500/50 border border-white"></div>
             ${userRole === 'rider' ? '<div class="absolute -inset-2 bg-amber-500/20 rounded-full animate-pulse"></div>' : ''}
          </div>
        `;
        
        const driverIcon = window.L.divIcon({
            html: driverIconHtml,
            className: 'driver-marker',
            iconSize: [12, 12]
        });

        const marker = window.L.marker(
            [userLocation.lat + latOffset, userLocation.lng + lngOffset], 
            { icon: driverIcon }
        ).addTo(map);

        driverMarkersRef.current.push(marker);
    }

    // Animate drivers slightly
    const interval = setInterval(() => {
       driverMarkersRef.current.forEach(marker => {
           const cur = marker.getLatLng();
           const moveLat = (Math.random() - 0.5) * 0.0002;
           const moveLng = (Math.random() - 0.5) * 0.0002;
           marker.setLatLng([cur.lat + moveLat, cur.lng + moveLng]);
       });
    }, 2000);

    return () => clearInterval(interval);
  }, [userLocation, userRole]);

  return (
    <div className="absolute inset-0 z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
      {/* Gradient Overlay for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-slate-50/90 to-transparent pointer-events-none z-[400]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-50/80 to-transparent pointer-events-none z-[400]" />
    </div>
  );
};

export default Map;