// Real-time GPS Position Hook
// Provides real-time asset position updates via polling or WebSocket

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { gpsToSvgCoordinates } from './gpsMapping';

/**
 * Hook for real-time asset position tracking
 * 
 * @param {string} buildingName - The building to track assets in
 * @param {string} floor - The floor to track
 * @param {Object} options - Configuration options
 * @param {number} options.pollingInterval - How often to fetch updates (ms), default 5000
 * @param {boolean} options.useWebSocket - Use WebSocket for real-time (if available)
 * @param {boolean} options.enabled - Whether tracking is enabled
 */
export function useRealtimeAssetPositions(buildingName, floor, options = {}) {
  const {
    pollingInterval = 5000,
    useWebSocket = false,
    enabled = true
  } = options;

  const [assetPositions, setAssetPositions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);

  // Fetch asset positions from API
  const fetchPositions = useCallback(async () => {
    if (!buildingName || !floor) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/assets?building=${encodeURIComponent(buildingName)}&floor=${encodeURIComponent(floor)}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch assets');
      
      const assets = await response.json();
      
      // Convert GPS to SVG coordinates for each asset
      const positions = {};
      assets.forEach(asset => {
        if (asset.latitude && asset.longitude) {
          // Asset has GPS coordinates - use them
          const svgPos = gpsToSvgCoordinates(
            asset.latitude,
            asset.longitude,
            buildingName,
            floor
          );
          
          if (svgPos && svgPos.isInBounds) {
            positions[asset.id] = {
              ...asset,
              svgX: svgPos.x,
              svgY: svgPos.y,
              hasGps: true,
              lastGpsUpdate: asset.gps_updated_at || new Date().toISOString()
            };
          } else {
            // GPS out of bounds - fall back to room-based positioning
            positions[asset.id] = {
              ...asset,
              hasGps: false,
              useRoomPosition: true
            };
          }
        } else {
          // No GPS - use room-based positioning
          positions[asset.id] = {
            ...asset,
            hasGps: false,
            useRoomPosition: true
          };
        }
      });

      setAssetPositions(positions);
      setLastUpdate(new Date());
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching asset positions:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [buildingName, floor]);

  // Setup WebSocket connection (for true real-time)
  const setupWebSocket = useCallback(() => {
    if (!useWebSocket) return;

    // WebSocket URL - adjust based on your server
    const wsUrl = API_BASE_URL.replace('http', 'ws').replace('/api', '') + '/ws/positions';
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('GPS WebSocket connected');
        // Subscribe to position updates for this building/floor
        wsRef.current.send(JSON.stringify({
          type: 'subscribe',
          building: buildingName,
          floor: floor
        }));
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'position_update') {
          const { assetId, latitude, longitude, timestamp } = data;
          const svgPos = gpsToSvgCoordinates(latitude, longitude, buildingName, floor);
          
          if (svgPos && svgPos.isInBounds) {
            setAssetPositions(prev => ({
              ...prev,
              [assetId]: {
                ...prev[assetId],
                svgX: svgPos.x,
                svgY: svgPos.y,
                hasGps: true,
                lastGpsUpdate: timestamp
              }
            }));
            setLastUpdate(new Date());
          }
        }
      };

      wsRef.current.onerror = (err) => {
        console.error('WebSocket error:', err);
        // Fall back to polling
        setupPolling();
      };

      wsRef.current.onclose = () => {
        console.log('GPS WebSocket closed');
      };
    } catch (err) {
      console.error('WebSocket setup failed:', err);
      setupPolling();
    }
  }, [buildingName, floor, useWebSocket]);

  // Setup polling
  const setupPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Initial fetch
    fetchPositions();
    
    // Setup polling interval
    intervalRef.current = setInterval(fetchPositions, pollingInterval);
  }, [fetchPositions, pollingInterval]);

  // Initialize tracking
  useEffect(() => {
    if (!enabled || !buildingName || !floor) {
      setAssetPositions({});
      return;
    }

    if (useWebSocket) {
      setupWebSocket();
    } else {
      setupPolling();
    }

    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, buildingName, floor, useWebSocket, setupWebSocket, setupPolling]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchPositions();
  }, [fetchPositions]);

  return {
    assetPositions,
    loading,
    error,
    lastUpdate,
    refresh,
    isRealtime: useWebSocket && wsRef.current?.readyState === WebSocket.OPEN
  };
}

/**
 * Hook to track user's current GPS position
 * Useful for "find me" or "nearby assets" features
 */
export function useUserGpsPosition(options = {}) {
  const { enableHighAccuracy = true, watchPosition = true } = options;
  
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    const handleSuccess = (pos) => {
      setPosition({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: new Date(pos.timestamp)
      });
      setLoading(false);
      setError(null);
    };

    const handleError = (err) => {
      setError(err.message);
      setLoading(false);
    };

    const geoOptions = {
      enableHighAccuracy,
      timeout: 10000,
      maximumAge: 0
    };

    if (watchPosition) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
    } else {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enableHighAccuracy, watchPosition]);

  return { position, error, loading };
}

export default {
  useRealtimeAssetPositions,
  useUserGpsPosition
};
