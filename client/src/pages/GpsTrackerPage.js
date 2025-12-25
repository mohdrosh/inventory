// GPS Tracker Page - Run this on a mobile device to track an asset's location in real-time
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Wifi, WifiOff, Play, Square, RefreshCw, Smartphone, AlertCircle, CheckCircle, Navigation } from 'lucide-react';
import { API_BASE_URL } from '../config';

const GpsTrackerPage = () => {
  const [assetId, setAssetId] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [error, setError] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [serverStatus, setServerStatus] = useState('unknown');
  const [updateInterval, setUpdateInterval] = useState(2000); // 2 seconds default
  const [assets, setAssets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const watchIdRef = useRef(null);
  const sendIntervalRef = useRef(null);
  const lastSentPositionRef = useRef(null);

  // Fetch assets for selection
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/assets`);
        if (response.ok) {
          const data = await response.json();
          setAssets(data);
          setServerStatus('connected');
        }
      } catch (err) {
        setServerStatus('disconnected');
      }
    };
    fetchAssets();
  }, []);

  // Send GPS update to server
  const sendGpsUpdate = useCallback(async (position) => {
    if (!assetId || !position) return;

    // Only send if position has changed significantly (> 1 meter)
    if (lastSentPositionRef.current) {
      const distance = calculateDistance(
        lastSentPositionRef.current.latitude,
        lastSentPositionRef.current.longitude,
        position.latitude,
        position.longitude
      );
      if (distance < 1) return; // Skip if moved less than 1 meter
    }

    try {
      const response = await fetch(`${API_BASE_URL}/assets/${assetId}/gps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        lastSentPositionRef.current = position;
        setUpdateCount(prev => prev + 1);
        setLastUpdateTime(new Date());
        setServerStatus('connected');
        setError(null);
      } else {
        const data = await response.json();
        setError(`Server error: ${data.error}`);
        setServerStatus('error');
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
      setServerStatus('disconnected');
    }
  }, [assetId]);

  // Calculate distance between two GPS points (in meters)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Start GPS tracking
  const startTracking = useCallback(() => {
    if (!assetId) {
      setError('Please select an asset to track');
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsTracking(true);
    setError(null);
    setUpdateCount(0);

    // Watch position with high accuracy
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const position = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date(pos.timestamp)
        };
        setCurrentPosition(position);
      },
      (err) => {
        setError(`GPS Error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Send updates at interval
    sendIntervalRef.current = setInterval(() => {
      if (currentPosition) {
        sendGpsUpdate(currentPosition);
      }
    }, updateInterval);

  }, [assetId, updateInterval, currentPosition, sendGpsUpdate]);

  // Stop GPS tracking
  const stopTracking = useCallback(() => {
    setIsTracking(false);
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }
  }, []);

  // Send current position immediately
  const sendNow = () => {
    if (currentPosition) {
      sendGpsUpdate(currentPosition);
    }
  };

  // Update interval when it changes during tracking
  useEffect(() => {
    if (isTracking && sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = setInterval(() => {
        if (currentPosition) {
          sendGpsUpdate(currentPosition);
        }
      }, updateInterval);
    }
  }, [updateInterval, isTracking, currentPosition, sendGpsUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
      }
    };
  }, []);

  // Filter assets based on search
  const filteredAssets = assets.filter(a => 
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.id?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 20);

  const selectedAsset = assets.find(a => a.id === assetId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-purple-900 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Navigation className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">GPS Tracker</h1>
          </div>
          <p className="text-gray-400 text-sm">Track asset location in real-time</p>
        </div>

        {/* Server Status */}
        <div className={`flex items-center justify-center gap-2 mb-4 p-2 rounded-lg ${
          serverStatus === 'connected' ? 'bg-green-900/30 text-green-400' :
          serverStatus === 'disconnected' ? 'bg-red-900/30 text-red-400' :
          'bg-yellow-900/30 text-yellow-400'
        }`}>
          {serverStatus === 'connected' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span className="text-sm">
            Server: {serverStatus === 'connected' ? 'Connected' : serverStatus === 'disconnected' ? 'Disconnected' : 'Checking...'}
          </span>
        </div>

        {/* Asset Selection */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-700">
          <label className="block text-sm text-gray-400 mb-2">Select Asset to Track</label>
          
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isTracking}
          />
          
          {searchQuery && !isTracking && (
            <div className="max-h-40 overflow-y-auto bg-gray-900 rounded-lg border border-gray-700">
              {filteredAssets.map(asset => (
                <button
                  key={asset.id}
                  onClick={() => {
                    setAssetId(asset.id);
                    setSearchQuery('');
                  }}
                  className="w-full p-2 text-left hover:bg-gray-700 text-white text-sm border-b border-gray-800 last:border-0"
                >
                  <div className="font-medium">{asset.name}</div>
                  <div className="text-xs text-gray-500">{asset.id} • {asset.room}</div>
                </button>
              ))}
            </div>
          )}
          
          {selectedAsset && (
            <div className="mt-2 p-3 bg-blue-900/30 rounded-lg border border-blue-700">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-white font-medium">{selectedAsset.name}</div>
                  <div className="text-xs text-gray-400">ID: {selectedAsset.id} • {selectedAsset.building} • {selectedAsset.room}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Update Interval */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-700">
          <label className="block text-sm text-gray-400 mb-2">Update Interval</label>
          <div className="flex gap-2">
            {[1000, 2000, 5000, 10000].map(interval => (
              <button
                key={interval}
                onClick={() => setUpdateInterval(interval)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                  updateInterval === interval
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {interval / 1000}s
              </button>
            ))}
          </div>
        </div>

        {/* Current Position */}
        {currentPosition && (
          <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-400">Current Position</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Latitude</div>
                <div className="text-white font-mono">{currentPosition.latitude.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-gray-500">Longitude</div>
                <div className="text-white font-mono">{currentPosition.longitude.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-gray-500">Accuracy</div>
                <div className="text-white font-mono">{currentPosition.accuracy?.toFixed(1)}m</div>
              </div>
              <div>
                <div className="text-gray-500">Updates Sent</div>
                <div className="text-white font-mono">{updateCount}</div>
              </div>
            </div>
            {lastUpdateTime && (
              <div className="mt-2 text-xs text-gray-500">
                Last sent: {lastUpdateTime.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-3">
          {!isTracking ? (
            <button
              onClick={startTracking}
              disabled={!assetId}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-medium transition"
            >
              <Play className="w-5 h-5" />
              Start Tracking
            </button>
          ) : (
            <>
              <button
                onClick={stopTracking}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition"
              >
                <Square className="w-5 h-5" />
                Stop
              </button>
              <button
                onClick={sendNow}
                className="flex items-center justify-center gap-2 py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition"
              >
                <RefreshCw className="w-5 h-5" />
                Send Now
              </button>
            </>
          )}
        </div>

        {/* Tracking Status */}
        {isTracking && (
          <div className="mt-4 flex items-center justify-center gap-2 text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm">Tracking active - GPS updates every {updateInterval/1000}s</span>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-gray-800/30 rounded-xl p-4 border border-gray-700">
          <h3 className="text-white font-medium mb-2">How to use:</h3>
          <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
            <li>Select an asset you want to track</li>
            <li>Choose how often to send updates</li>
            <li>Tap "Start Tracking" and allow GPS access</li>
            <li>Walk around - the floor map will update in real-time!</li>
            <li>Open the floor map on another device to see movement</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default GpsTrackerPage;
