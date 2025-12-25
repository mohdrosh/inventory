// client/src/components/MapPanel.js - COMPLETE PRODUCTION VERSION
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API_BASE_URL } from '../config';
import FloorMapModal from "./FloorMapModal";

export default function MapPanel({
  buildings = [],
  highlightBuildingId,
  focusBuildingId,
  onMarkerHover,
  onMarkerClick,
  onFloorMapStateChange,
}) {
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // Notify parent component when floor map opens/closes
  useEffect(() => {
    if (onFloorMapStateChange) {
      onFloorMapStateChange(!!selectedBuilding);
    }
  }, [selectedBuilding, onFloorMapStateChange]);

  const createIcon = (isHighlighted = false) =>
    L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: ${isHighlighted 
            ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' 
            : 'linear-gradient(135deg, #64748b 0%, #475569 100%)'};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid white;
          cursor: pointer;
        ">
          <div style="
            width: 12px;
            height: 12px;
            background-color: white;
            border-radius: 50%;
            transform: rotate(45deg);
            box-shadow: 0 0 8px rgba(255,255,255,0.5);
          "></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -28],
    });

  useEffect(() => {
    // Initialize map with bounds
    if (!mapRef.current) {
      const center = [34.946211, 134.429956];
      
      // Calculate 30km radius bounds
      const radiusInKm = 5;
      const latDegreesPer5km = radiusInKm / 111;
      const lonDegreesPer5km = radiusInKm / (111 * Math.cos(center[0] * Math.PI / 180));
      
      const southWest = L.latLng(center[0] - latDegreesPer5km, center[1] - lonDegreesPer5km);
      const northEast = L.latLng(center[0] + latDegreesPer5km, center[1] + lonDegreesPer5km);
      const bounds = L.latLngBounds(southWest, northEast);
      
      console.log('🗺️ Initializing map with 5km bounds:', bounds);
      
      mapRef.current = L.map("map", {
        center: center,
        zoom: 16,
        minZoom: 10,
        maxZoom: 18,
        zoomControl: false,
        tap: false, // Disable tap to prevent conflicts
        tapTolerance: 15,
        closePopupOnClick: false,
        trackResize: true,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://osm.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapRef.current);

      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
      
      // Test bounds visually (optional - remove in production if not needed)
      L.rectangle(bounds, {
        color: "#ff7800",
        weight: 2,
        fillOpacity: 0.1,
        interactive: false
      }).addTo(mapRef.current);
      
      console.log('✅ Map initialized successfully with bounds');
    }

    const map = mapRef.current;

    // Remove old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    console.log('📍 Adding', buildings.length, 'markers to map');

    // Add new markers
    buildings.forEach((b) => {
      const marker = L.marker([b.lat, b.lon], { 
        icon: createIcon(false),
        riseOnHover: true,
        interactive: true,
        draggable: false,
        keyboard: false,
        title: b.name,
      }).addTo(map);

      // CLICK HANDLER MUST BE REGISTERED BEFORE POPUP
      // This ensures click fires before popup opens
      marker.on("click", function(e) {
        console.log('🖱️ Marker CLICKED for building:', b.name);
        if (e.originalEvent) {
          e.originalEvent.stopPropagation();
          e.originalEvent.preventDefault();
        }
        
        marker.setIcon(createIcon(true));
        if (onMarkerClick) onMarkerClick(b.id);
        
        // Open floor map directly
        console.log('🚪 Opening floor map for:', b.name);
        setSelectedBuilding(b.name);
        
        // Close popup immediately
        setTimeout(() => {
          marker.closePopup();
        }, 0);
        
        return false;
      });

      // Mobile touch handler
      marker.on("touchend", function(e) {
        console.log('📱 Marker TOUCHED for building:', b.name);
        if (e.originalEvent) {
          e.originalEvent.stopPropagation();
          e.originalEvent.preventDefault();
        }
        
        marker.setIcon(createIcon(true));
        if (onMarkerClick) onMarkerClick(b.id);
        
        // Open floor map directly
        console.log('🚪 Opening floor map for:', b.name);
        setSelectedBuilding(b.name);
        
        setTimeout(() => {
          marker.closePopup();
        }, 0);
        
        return false;
      });

      // Create popup content AFTER click handlers
      const popupContent = document.createElement("div");
      popupContent.className = "building-popup";
      popupContent.style.cssText = "display: block; visibility: visible;";
      popupContent.innerHTML = `
        <div style="
          width: 180px;
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border: 1px solid #e5e7eb;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="
            position: relative;
            height: 60px;
            overflow: hidden;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          ">
            <img 
              src="${b.image}" 
              alt="${b.name}"
              style="
                width: 100%;
                height: 100%;
                object-fit: cover;
                opacity: 0.3;
              "
              onerror="this.style.display='none'"
            />
            <div style="
              position: absolute;
              inset: 0;
              background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
              display: flex;
              align-items: flex-end;
              padding: 8px 10px;
            ">
              <h3 style="
                margin: 0;
                font-size: 13px;
                font-weight: 700;
                color: white;
                line-height: 1.3;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                width: 100%;
                text-shadow: 0 1px 3px rgba(0,0,0,0.5);
              ">${b.name}</h3>
            </div>
          </div>
          
          <div style="padding: 10px;">
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 8px;
            ">
              <div style="
                display: flex;
                align-items: center;
                gap: 6px;
              ">
                <div style="
                  width: 28px;
                  height: 28px;
                  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                  border-radius: 6px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);
                ">
                  <svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                  </svg>
                </div>
                <div style="
                  display: flex;
                  flex-direction: column;
                  line-height: 1;
                ">
                  <span style="
                    font-size: 16px;
                    font-weight: 800;
                    color: #111827;
                    margin: 0;
                    padding: 0;
                  ">${b.total}</span>
                  <span style="
                    font-size: 9px;
                    font-weight: 600;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    margin-top: 1px;
                  ">Assets</span>
                </div>
              </div>
            </div>
            
            <button class="view-floor-map-btn" style="
              width: 100%;
              background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
              color: white;
              border: none;
              padding: 8px 10px;
              border-radius: 7px;
              font-size: 11px;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 5px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(79, 70, 229, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(79, 70, 229, 0.3)'">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
              </svg>
              <span>Floor Map</span>
            </button>
          </div>
        </div>
      `;

      // Make button clickable to open floor map
      const viewBtn = popupContent.querySelector('.view-floor-map-btn');
      viewBtn.onclick = (e) => {
        e.stopPropagation();
        console.log('🔘 Floor Map button clicked for:', b.name);
        setSelectedBuilding(b.name);
        marker.closePopup();
      };

      marker.bindPopup(popupContent, {
        closeButton: true,
        offset: [0, -12],
        className: 'custom-popup',
        maxWidth: 200,
        minWidth: 180,
        autoPan: true,
        keepInView: true,
        autoClose: false,
        closeOnClick: false,
        closeOnEscapeKey: true,
      });

      console.log('➕ Added marker for building:', b.name);

      // Desktop hover effects - Register AFTER popup is bound
      marker.on("mouseover", function() {
        console.log('🔍 Hovering over:', b.name);
        marker.setIcon(createIcon(true));
        setTimeout(() => {
          marker.openPopup();
        }, 0);
        if (onMarkerHover) onMarkerHover(b.id);
      });

      marker.on("mouseout", function() {
        const isHighlighted = highlightBuildingId === b.id;
        marker.setIcon(createIcon(isHighlighted));
        if (onMarkerHover) onMarkerHover(null);
      });

      markersRef.current[b.id] = marker;
    });

    return () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
    };
  }, [buildings, onMarkerHover, onMarkerClick, highlightBuildingId]);

  // Highlight from sidebar hover - OPENS POPUP
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const isHighlighted = id === highlightBuildingId;
      marker.setIcon(createIcon(isHighlighted));
      
      if (isHighlighted && highlightBuildingId) {
        setTimeout(() => {
          marker.openPopup();
        }, 0);
      }
    });
  }, [highlightBuildingId]);

  // Focus on building from sidebar click
  useEffect(() => {
    if (focusBuildingId && markersRef.current[focusBuildingId]) {
      const building = buildings.find((b) => b.id === focusBuildingId);
      if (building) {
        const marker = markersRef.current[focusBuildingId];
        
        marker.setIcon(createIcon(true));
        
        mapRef.current.setView([building.lat, building.lon], 17, { 
          animate: true,
          duration: 0.5
        });
        
        setTimeout(() => {
          marker.openPopup();
        }, 300);
      }
    }
  }, [focusBuildingId, buildings]);

  const handleCloseFloorMap = () => {
    console.log('❌ Closing floor map');
    setSelectedBuilding(null);
  };

  return (
    <>
      {/* Main Map */}
      <div
        id="map"
        className="w-full h-full rounded-lg relative"
        style={{ overflow: "hidden", borderRadius: "0.75rem" }}
      >
        <style jsx global>{`
          .custom-popup .leaflet-popup-content-wrapper {
            padding: 0 !important;
            border-radius: 10px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 5px 10px -5px rgba(0, 0, 0, 0.15);
            border: none;
            background: transparent;
            overflow: visible;
            opacity: 1 !important;
            visibility: visible !important;
          }
          .custom-popup .leaflet-popup-content {
            margin: 0 !important;
            padding: 0 !important;
            width: 180px !important;
            line-height: 1;
            opacity: 1 !important;
            visibility: visible !important;
          }
          .building-popup {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          .building-popup * {
            visibility: visible !important;
            opacity: 1 !important;
          }
          .custom-popup .leaflet-popup-tip {
            background: white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            width: 12px;
            height: 12px;
          }
          .custom-popup .leaflet-popup-close-button {
            color: white !important;
            font-size: 16px !important;
            font-weight: 700 !important;
            width: 20px !important;
            height: 20px !important;
            padding: 0 !important;
            top: 5px !important;
            right: 5px !important;
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(4px);
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            line-height: 1 !important;
            text-align: center;
            z-index: 10;
          }
          .custom-popup .leaflet-popup-close-button:hover {
            background: rgba(0, 0, 0, 0.5);
            transform: scale(1.05);
          }
          .custom-marker {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer !important;
          }
          .custom-marker:hover {
            transform: scale(1.15) translateY(-4px);
            filter: drop-shadow(0 8px 16px rgba(79, 70, 229, 0.4));
          }
        `}</style>
      </div>

      {/* Floor Map Modal */}
      {selectedBuilding && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
          <FloorMapModal
            buildingName={selectedBuilding}
            onClose={handleCloseFloorMap}
          />
        </div>
      )}
    </>
  );
}