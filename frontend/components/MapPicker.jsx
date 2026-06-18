"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

// Khobar, Saudi Arabia as default center
const DEFAULT_CENTER = [26.2172, 50.1971];

function LocationMarker({ onLocationSelected }) {
  const [position, setPosition] = useState(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelected(e.latlng);
    },
  });

  return position === null ? null : <Marker position={position}></Marker>;
}

export default function MapPicker({ onLocationSelected }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="h-64 w-full bg-zinc-900 animate-pulse rounded-lg flex items-center justify-center text-zinc-500">جاري تحميل الخريطة...</div>;

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden border border-zinc-850 z-0">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onLocationSelected={onLocationSelected} />
      </MapContainer>
    </div>
  );
}
