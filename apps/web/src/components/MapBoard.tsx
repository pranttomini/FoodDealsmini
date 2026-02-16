import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Deal, DealType, Language } from '../types';
import { getTranslation } from '../translations';

interface MapBoardProps {
  deals: Deal[];
  onDealClick: (deal: Deal) => void;
  center: { lat: number; lng: number };
  lang: Language;
  darkMode?: boolean;
}

export const MapBoard: React.FC<MapBoardProps> = ({ deals, onDealClick, center, lang, darkMode = false }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const t = (key: any) => getTranslation(lang, key);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = L.map(mapContainer.current, {
        zoomControl: false,
        attributionControl: false,
        center: [center.lat, center.lng],
        zoom: 13
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    markersLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    return () => {
        map.remove();
        mapInstance.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Manage tile layer based on dark mode
  useEffect(() => {
    if (!mapInstance.current) return;

    // Remove existing tile layer
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    // Create new tile layer with appropriate theme
    const tileUrl = darkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const newTileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    });

    newTileLayer.addTo(mapInstance.current);
    tileLayerRef.current = newTileLayer;
  }, [darkMode]);

  // Smoothly pan map when center (user location) changes
  useEffect(() => {
    if (mapInstance.current) {
      mapInstance.current.flyTo([center.lat, center.lng], 13, { duration: 1.5 });
    }
  }, [center.lat, center.lng]);

  // Update Markers
  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current) return;

    markersLayer.current.clearLayers();

    deals.forEach(deal => {
        const colorClass = getTailwindColor(deal.dealType);
        const bubbleBg = darkMode ? 'bg-slate-800' : 'bg-white';
        const bubbleBorder = darkMode ? 'border-slate-700' : 'border-gray-100';
        const bubbleText = darkMode ? 'text-white' : 'text-gray-900';
        const pinBorder = darkMode ? 'border-slate-800' : 'border-white';

        // Construct HTML for the marker
        // Using inline SVG for the pin to ensure it renders without React context issues in Leaflet
        const html = `
            <div class="flex flex-col items-center group transition-transform hover:scale-110 cursor-pointer" style="transform-origin: bottom center;">
                <div class="${bubbleBg} px-2 py-0.5 rounded-md shadow-md mb-1 text-xs font-bold border ${bubbleBorder} whitespace-nowrap ${bubbleText}">
                    ${deal.price.toFixed(2)}€
                </div>
                <div class="p-1.5 rounded-full shadow-lg border-2 ${pinBorder} ${colorClass} text-white relative">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                        <circle cx="12" cy="10" r="3" fill="white" stroke="none"/>
                   </svg>
                </div>
                <div class="w-1.5 h-1.5 bg-black/20 rounded-full blur-[1px] mt-0.5"></div>
            </div>
        `;

        const icon = L.divIcon({
            className: 'bg-transparent border-none', // Remove default Leaflet square styles
            html: html,
            iconSize: [40, 60],
            iconAnchor: [20, 50] // Anchor the bottom of the pin to the coordinate
        });

        const marker = L.marker([deal.location.lat, deal.location.lng], { icon });
        
        // Add click listener
        marker.on('click', () => {
            onDealClick(deal);
        });

        marker.addTo(markersLayer.current!);
    });

  }, [deals, onDealClick, darkMode]);

  return (
    <div className="w-full h-full relative z-0">
        <div ref={mapContainer} className={`w-full h-full outline-none ${darkMode ? 'bg-slate-900' : 'bg-gray-50'}`} />

        {/* Floating pill for area search indication */}
        <div className={`absolute bottom-24 left-1/2 transform -translate-x-1/2 ${darkMode ? 'bg-slate-800/90 border-slate-700 text-slate-300' : 'bg-white/90 border-gray-100 text-gray-500'} backdrop-blur-md px-4 py-2 rounded-full text-xs font-medium shadow-sm pointer-events-none z-[400] flex items-center gap-2 border`}>
            {t('searchingArea')}
        </div>
    </div>
  );
};

// Helper to map DealTypes to Tailwind classes
// We use classes that we know are in the project (e.g. from DealCard) so Tailwind generates them
const getTailwindColor = (type: DealType) => {
    switch(type) {
        case DealType.OPENING: return 'bg-purple-500 border-purple-600';
        case DealType.HAPPY_HOUR: return 'bg-orange-500 border-orange-600';
        case DealType.LAST_MINUTE: return 'bg-red-500 border-red-600';
        case DealType.LUNCH: return 'bg-blue-500 border-blue-600';
        default: return 'bg-gray-900 border-black';
    }
};