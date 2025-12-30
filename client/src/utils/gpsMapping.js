// GPS to Floor Map Coordinate Mapping Utility
// This utility converts real-world GPS coordinates to SVG positions on floor maps

/**
 * CONFIGURATION: Building GPS Reference Points
 * You need to measure the GPS coordinates at the corners of your building
 * and map them to the SVG coordinate system (0-500 x, 0-300 y)
 * 
 * To get GPS coordinates:
 * 1. Use Google Maps and right-click to get lat/lng
 * 2. Use a GPS device at each corner
 * 3. Use a smartphone GPS app
 */

// Building GPS Reference Configuration
// Maps GPS coordinates to SVG floor map positions
// 
// HOW TO CONFIGURE FOR YOUR BUILDING:
// 1. Get GPS coordinates of your building corners using Google Maps or a GPS device
// 2. Match them to the SVG coordinates of your floor map (typically 0-500 x, 0-300 y)
// 3. The system uses these 4 points to interpolate any GPS coordinate to the correct map position

const BUILDING_GPS_CONFIG = {
  // SPring-8 High Throughput Building
  // Based on ACTUAL asset coordinates from database: lat ~34.69, lon ~135.19
  // Building spans approximately 60m x 35m
  "High Throughput Building": {
    referencePoints: [
      // Northwest corner (top-left on map)
      { gps: { lat: 34.6904, lng: 135.1930 }, svg: { x: 10, y: 10 } },
      // Northeast corner (top-right on map)
      { gps: { lat: 34.6904, lng: 135.1942 }, svg: { x: 490, y: 10 } },
      // Southwest corner (bottom-left on map)
      { gps: { lat: 34.6895, lng: 135.1930 }, svg: { x: 10, y: 290 } },
      // Southeast corner (bottom-right on map)
      { gps: { lat: 34.6895, lng: 135.1942 }, svg: { x: 490, y: 290 } },
    ],
    floors: {
      "1F": { zOffset: 0 },
      "2F": { zOffset: 0 },
    }
  },
  
  // Add more buildings here as needed:
  // "Another Building": {
  //   referencePoints: [...],
  //   floors: {...}
  // }
};

/**
 * Convert GPS coordinates to SVG floor map coordinates
 * Uses bilinear interpolation for accurate mapping
 */
export function gpsToSvgCoordinates(lat, lng, buildingName, floor) {
  const config = BUILDING_GPS_CONFIG[buildingName];
  if (!config) {
    console.warn(`No GPS config for building: ${buildingName}`);
    return null;
  }

  const refs = config.referencePoints;
  
  // Calculate the GPS bounds
  const minLat = Math.min(...refs.map(r => r.gps.lat));
  const maxLat = Math.max(...refs.map(r => r.gps.lat));
  const minLng = Math.min(...refs.map(r => r.gps.lng));
  const maxLng = Math.max(...refs.map(r => r.gps.lng));
  
  // Calculate SVG bounds
  const minX = Math.min(...refs.map(r => r.svg.x));
  const maxX = Math.max(...refs.map(r => r.svg.x));
  const minY = Math.min(...refs.map(r => r.svg.y));
  const maxY = Math.max(...refs.map(r => r.svg.y));
  
  // Normalize GPS to 0-1 range
  const normalizedLat = (lat - minLat) / (maxLat - minLat);
  const normalizedLng = (lng - minLng) / (maxLng - minLng);
  
  // Map to SVG coordinates
  // Note: Latitude increases going North, but SVG Y increases going down
  const svgX = minX + normalizedLng * (maxX - minX);
  const svgY = maxY - normalizedLat * (maxY - minY); // Inverted for Y axis
  
  // Clamp to valid range
  return {
    x: Math.max(minX, Math.min(maxX, svgX)),
    y: Math.max(minY, Math.min(maxY, svgY)),
    isInBounds: lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
  };
}

/**
 * Convert SVG coordinates back to GPS (useful for debugging)
 */
export function svgToGpsCoordinates(x, y, buildingName) {
  const config = BUILDING_GPS_CONFIG[buildingName];
  if (!config) return null;

  const refs = config.referencePoints;
  
  const minLat = Math.min(...refs.map(r => r.gps.lat));
  const maxLat = Math.max(...refs.map(r => r.gps.lat));
  const minLng = Math.min(...refs.map(r => r.gps.lng));
  const maxLng = Math.max(...refs.map(r => r.gps.lng));
  
  const minX = Math.min(...refs.map(r => r.svg.x));
  const maxX = Math.max(...refs.map(r => r.svg.x));
  const minY = Math.min(...refs.map(r => r.svg.y));
  const maxY = Math.max(...refs.map(r => r.svg.y));
  
  const normalizedX = (x - minX) / (maxX - minX);
  const normalizedY = (maxY - y) / (maxY - minY); // Inverted
  
  return {
    lat: minLat + normalizedY * (maxLat - minLat),
    lng: minLng + normalizedX * (maxLng - minLng)
  };
}

/**
 * Check if GPS coordinates are within a specific room
 */
export function isInRoom(lat, lng, room, buildingName) {
  const svgPos = gpsToSvgCoordinates(lat, lng, buildingName);
  if (!svgPos) return false;
  
  // Parse room polygon coordinates
  const points = room.coordinates.split(' ').map(p => {
    const [x, y] = p.split(',').map(Number);
    return { x, y };
  });
  
  // Point-in-polygon test using ray casting
  return isPointInPolygon(svgPos.x, svgPos.y, points);
}

/**
 * Ray casting algorithm for point-in-polygon test
 */
function isPointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Calculate distance between two GPS points (in meters)
 */
export function gpsDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Get building configuration for calibration
 */
export function getBuildingConfig(buildingName) {
  return BUILDING_GPS_CONFIG[buildingName] || null;
}

/**
 * Update building GPS reference points (for calibration)
 */
export function updateBuildingConfig(buildingName, referencePoints) {
  if (!BUILDING_GPS_CONFIG[buildingName]) {
    BUILDING_GPS_CONFIG[buildingName] = { referencePoints: [], floors: {} };
  }
  BUILDING_GPS_CONFIG[buildingName].referencePoints = referencePoints;
}

export default {
  gpsToSvgCoordinates,
  svgToGpsCoordinates,
  isInRoom,
  gpsDistance,
  getBuildingConfig,
  updateBuildingConfig
};
