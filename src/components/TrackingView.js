// src/components/TrackingView.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio, CheckCircle, Clock, Gauge, MapPin,
  QrCode, Smartphone, Download, Share2, X, ArrowRight
} from 'lucide-react';
import { io } from 'socket.io-client'; // npm install socket.io-client

const API_URL = "https://trackease-backend-teq8.onrender.com/api";
const SOCKET_URL = "https://trackease-backend-teq8.onrender.com"; // same origin as backend

function TrackingView({ trackingData, driverInfo, onStopTracking, onError }) {
  const [currentLocation, setCurrentLocation] = useState(trackingData.initialLocation || null);
  const [speed, setSpeed] = useState(0);
  const [trackingDuration, setTrackingDuration] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mapType, setMapType] = useState('street');

  const watchIdRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const layersRef = useRef({});
  const startTimeRef = useRef(null);
  const lastPositionRef = useRef(trackingData.initialLocation || null);
  const socketRef = useRef(null);

  const fromStage = trackingData.fromStage || '';
  const toStage = trackingData.toStage || '';

  // Auto-resume tracking on mount (backend /resume-tracking)
  useEffect(() => {
    const resumeTracking = async () => {
      try {
        const token = localStorage.getItem('driverToken');
        if (!token) return;
        await fetch(`${API_URL}/bus/resume-tracking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            busNumber: trackingData.busNumber,
            fromStage,
            toStage
          })
        });
      } catch (error) {
        console.log('No previous tracking to resume');
      }
    };
    resumeTracking();
  }, [trackingData.busNumber, fromStage, toStage]);

  // Socket.IO: connect & join bus room
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true
    });
    socketRef.current = socket;

    const room = `bus_${trackingData.busNumber.toUpperCase()}`;
    socket.emit('joinBus', trackingData.busNumber.toUpperCase());

    socket.on('locationUpdate', (payload) => {
      if (payload.busNumber.toUpperCase() !== trackingData.busNumber.toUpperCase()) return;
      if (payload.currentLocation?.latitude && payload.currentLocation?.longitude) {
        const newLoc = {
          lat: payload.currentLocation.latitude,
          lng: payload.currentLocation.longitude
        };
        setCurrentLocation(newLoc);
        setSpeed(payload.speed || 0);
      }
    });

    socket.on('trackingStopped', (payload) => {
      if (payload.busNumber.toUpperCase() !== trackingData.busNumber.toUpperCase()) return;
      onStopTracking();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [trackingData.busNumber, onStopTracking]);

  // Tracking duration timer
  useEffect(() => {
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      setTrackingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize map when location available
  useEffect(() => {
    if (currentLocation?.lat && currentLocation?.lng && !mapRef.current && window.L) {
      initMap();
    }
  }, [currentLocation]);

  // Watch position (driver GPS)
  useEffect(() => {
    if (!navigator.geolocation) {
      onError('Geolocation not supported');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };

        if (lastPositionRef.current) {
          const distance = calculateDistance(
            lastPositionRef.current.lat,
            lastPositionRef.current.lng,
            newLocation.lat,
            newLocation.lng
          );
          setTotalDistance((prev) => prev + distance);
        }

        if (pos.coords.speed !== null && pos.coords.speed >= 0) {
          setSpeed(Math.round(pos.coords.speed * 3.6));
        }

        lastPositionRef.current = newLocation;
        setCurrentLocation(newLocation);
      },
      (error) => {
        console.error('Geolocation error:', error);
        onError('Location tracking error: ' + error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000
      }
    );

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [onError]);

  // Send updates to backend every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentLocation && driverInfo?.token) {
        updateLocation(currentLocation.lat, currentLocation.lng);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentLocation, driverInfo, speed]);

  // Update marker when location changes
  const updateMapMarker = useCallback(() => {
    if (!markerRef.current || !currentLocation?.lat || !currentLocation?.lng || !mapRef.current) {
      return;
    }

    const newPos = [currentLocation.lat, currentLocation.lng];
    try {
      markerRef.current.setLatLng(newPos);
      if (circleRef.current) {
        circleRef.current.setLatLng(newPos);
      }
      mapRef.current.panTo(newPos, {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.25
      });
    } catch (error) {
      console.error('Map update error:', error);
    }
  }, [currentLocation]);

  useEffect(() => {
    updateMapMarker();
  }, [updateMapMarker]);

  // Map layer switching
  useEffect(() => {
    if (!mapRef.current || !layersRef.current[mapType]) return;
    Object.values(layersRef.current).forEach((layer) => {
      if (mapRef.current.hasLayer(layer)) {
        mapRef.current.removeLayer(layer);
      }
    });
    layersRef.current[mapType].addTo(mapRef.current);
  }, [mapType]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const initMap = () => {
    if (!window.L || !currentLocation?.lat || !currentLocation?.lng) {
      console.error('Cannot init map: missing Leaflet or valid location');
      return;
    }

    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }

    mapContainer.innerHTML = '';

    const map = window.L.map(mapContainer, {
      zoomControl: true,
      attributionControl: true,
      zoomAnimation: true
    }).setView([currentLocation.lat, currentLocation.lng], 16, { animate: false });

    mapRef.current = map;

    const streetLayer = window.L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }
    );

    const satelliteLayer = window.L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '© Esri',
        maxZoom: 19
      }
    );

    const hybridLayer = window.L.layerGroup([
      window.L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '© Esri',
          maxZoom: 19
        }
      ),
      window.L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
        {
          attribution: '© CartoDB',
          maxZoom: 19
        }
      )
    ]);

    layersRef.current = {
      street: streetLayer,
      satellite: satelliteLayer,
      hybrid: hybridLayer
    };

    streetLayer.addTo(map);

    setTimeout(() => {
      addBusMarker(currentLocation);
    }, 100);
  };

  const addBusMarker = (location) => {
    if (!mapRef.current || !location?.lat || !location?.lng) return;

    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
    }
    if (circleRef.current) {
      mapRef.current.removeLayer(circleRef.current);
    }

    const busIcon = window.L.divIcon({
      className: 'custom-bus-marker',
      html: `
        <div style="position: relative; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            width: 50px;
            height: 50px;
            background: radial-gradient(circle, rgba(124, 58, 237, 0.4) 0%, rgba(124, 58, 237, 0) 70%);
            border-radius: 50%;
            animation: marker-pulse 2s infinite;
          "></div>
          <div style="
            position: absolute;
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
            border-radius: 50%;
            box-shadow:
              0 2px 8px rgba(124, 58, 237, 0.4),
              0 0 0 3px rgba(255, 255, 255, 0.9),
              0 0 0 4px rgba(124, 58, 237, 0.3);
          "></div>
          <div style="
            position: relative;
            z-index: 10;
            color: white;
            font-size: 18px;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
          ">🚌</div>
          <div style="
            position: absolute;
            bottom: -6px;
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 8px solid #7c3aed;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          "></div>
        </div>
        <style>
          @keyframes marker-pulse {
            0%, 100% {
              transform: scale(0.9);
              opacity: 0.6;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.2;
            }
          }
        </style>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 50],
      popupAnchor: [0, -50]
    });

    markerRef.current = window.L.marker([location.lat, location.lng], { icon: busIcon })
      .addTo(mapRef.current);

    circleRef.current = window.L.circle([location.lat, location.lng], {
      color: '#7c3aed',
      fillColor: '#7c3aed',
      fillOpacity: 0.1,
      radius: 80,
      weight: 2,
      dashArray: '5, 10'
    }).addTo(mapRef.current);

    markerRef.current.bindPopup(`
      <div style="font-family: system-ui; padding: 12px; min-width: 220px;">
        <div style="font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">
          🚌 ${trackingData.busNumber}
        </div>
        <div style="font-size: 13px; color: #64748b; line-height: 1.6;">
          <div><strong>Driver:</strong> ${trackingData.driverName}</div>
          ${fromStage && toStage
            ? `<div><strong>Route:</strong> ${fromStage} → ${toStage}</div>`
            : ''}
          <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
            <span style="width:8px;height:8px;background:#10b981;border-radius:50%;display:inline-block;animation:pulse 2s infinite;"></span>
            <strong style="color:#10b981;">Live Tracking</strong>
          </div>
        </div>
      </div>
    `);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    return `${minutes}m ${secs}s`;
  };

  const updateLocation = async (lat, lng) => {
    try {
      const token = localStorage.getItem('driverToken');
      if (!token) return;

      await fetch(`${API_URL}/bus/update-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          busNumber: trackingData.busNumber,
          latitude: lat,
          longitude: lng,
          speed: speed
        })
      });
    } catch (error) {
      console.error('Update location error:', error);
    }
  };

  const handleStopTracking = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('driverToken');
      await fetch(`${API_URL}/bus/stop-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          busNumber: trackingData.busNumber
        })
      });
      onStopTracking();
    } catch (error) {
      onError('Failed to stop tracking: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!trackingData.qrCode) return;
    const link = document.createElement('a');
    link.href = trackingData.qrCode;
    link.download = `bus-${trackingData.busNumber}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareToWhatsApp = () => {
    if (!trackingData.busNumber) return;
    const trackingUrl = `${window.location.origin}/track/${trackingData.busNumber}`;
    const message =
      `🚌 Track Bus ${trackingData.busNumber} in Real-Time!\n\n` +
      (fromStage && toStage ? `🚏 Route: ${fromStage} → ${toStage}\n\n` : '') +
      `👤 Driver: ${trackingData.driverName}\n📍 Live Location Updates\n\n🔗 Track Now: ${trackingUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!currentLocation) {
    return (
      <div className="min-h-[500px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Waiting for GPS</h3>
          <p className="text-slate-600">Enable location services and refresh</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen p-4 sm:p-6">
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-[2rem] blur-2xl opacity-20"></div>

      <div className="relative bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 max-w-4xl mx-auto">
        <div className="p-6 sm:p-8 space-y-6">
          {/* Route banner */}
          {fromStage && toStage && (
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-2xl p-4 mb-2 shadow-lg">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-indigo-100 font-semibold uppercase tracking-wide">
                      Route Information
                    </p>
                    <p className="text-sm sm:text-base text-white font-bold">
                      This bus is going from <span className="underline">{fromStage}</span> to <span className="underline">{toStage}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/90">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  Only valid for this route during this trip.
                </div>
              </div>
            </div>
          )}

          {/* Live Status */}
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <Radio className="w-7 h-7 text-white animate-pulse" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-lg"></div>
                  <h3 className="text-xl font-black text-white">Live Tracking Active</h3>
                </div>
                <div className="space-y-1 text-white/95 font-semibold">
                  <p className="text-lg">
                    Bus: <span className="font-black">{trackingData.busNumber}</span>
                  </p>
                  <p className="text-sm">
                    Driver: <span className="font-bold">{trackingData.driverName}</span>
                  </p>
                  {fromStage && toStage && (
                    <p className="text-xs">
                      Route: <span className="font-semibold">{fromStage} → {toStage}</span>
                    </p>
                  )}
                </div>
                {currentLocation && (
                  <div className="mt-3 text-xs font-mono bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg text-white">
                    📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </div>
                )}
              </div>
              <CheckCircle className="w-8 h-8 text-white flex-shrink-0" strokeWidth={2.5} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-violet-100 to-purple-100 border-2 border-violet-300 rounded-xl p-4">
              <div className="flex flex-col items-center text-center">
                <div className="bg-violet-500 p-2 rounded-lg mb-2">
                  <Gauge className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-black text-violet-900">{speed}</p>
                <p className="text-xs font-bold text-violet-700">km/h</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-cyan-100 to-blue-100 border-2 border-cyan-300 rounded-xl p-4">
              <div className="flex flex-col items-center text-center">
                <div className="bg-cyan-500 p-2 rounded-lg mb-2">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-black text-cyan-900">{formatDuration(trackingDuration)}</p>
                <p className="text-xs font-bold text-cyan-700">Duration</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-100 to-teal-100 border-2 border-emerald-300 rounded-xl p-4">
              <div className="flex flex-col items-center text-center">
                <div className="bg-emerald-500 p-2 rounded-lg mb-2">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-black text-emerald-900">{totalDistance.toFixed(1)}</p>
                <p className="text-xs font-bold text-emerald-700">km</p>
              </div>
            </div>
          </div>

          {/* QR Section */}
          {trackingData.qrCode && (
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-300 rounded-2xl p-6">
              <div className="text-center mb-4">
                <div className="inline-block bg-white p-3 rounded-2xl shadow-xl mb-3 border-2 border-purple-200">
                  <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-3 rounded-xl inline-block">
                    <QrCode className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Passenger QR Code</h3>
                <p className="text-sm font-semibold text-purple-700 mb-4">
                  Passengers can scan and see live location from {fromStage || 'origin'} to {toStage || 'destination'}.
                </p>
              </div>

              <div className="inline-block bg-white p-4 rounded-2xl shadow-2xl border-4 border-purple-300 mb-4 w-full max-w-xs mx-auto">
                <img src={trackingData.qrCode} alt="Bus Tracking QR Code" className="w-full mx-auto" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={shareToWhatsApp}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <Share2 className="w-5 h-5" strokeWidth={2.5} />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={downloadQRCode}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <Download className="w-5 h-5" strokeWidth={2.5} />
                  <span>Download</span>
                </button>
              </div>

              <div className="mt-4 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-purple-200">
                <p className="text-xs font-bold text-center text-purple-800 flex items-center justify-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Display printed QR on bus door or share in WhatsApp groups.
                </p>
              </div>
            </div>
          )}

          {/* Map */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-200">
            <div id="map" className="w-full h-[400px] sm:h-[500px] bg-slate-100"></div>

            {/* Map Type Switcher */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
              <button
                onClick={() => setMapType('street')}
                className={`px-3 py-2 rounded-xl font-bold text-xs shadow-lg transition-all backdrop-blur-md ${
                  mapType === 'street'
                    ? 'bg-violet-600 text-white scale-105'
                    : 'bg-white/90 text-slate-700 hover:bg-white'
                }`}
              >
                🗺️ Street
              </button>
              <button
                onClick={() => setMapType('satellite')}
                className={`px-3 py-2 rounded-xl font-bold text-xs shadow-lg transition-all backdrop-blur-md ${
                  mapType === 'satellite'
                    ? 'bg-violet-600 text-white scale-105'
                    : 'bg-white/90 text-slate-700 hover:bg-white'
                }`}
              >
                🛰️ Satellite
              </button>
              <button
                onClick={() => setMapType('hybrid')}
                className={`px-3 py-2 rounded-xl font-bold text-xs shadow-lg transition-all backdrop-blur-md ${
                  mapType === 'hybrid'
                    ? 'bg-violet-600 text-white scale-105'
                    : 'bg-white/90 text-slate-700 hover:bg-white'
                }`}
              >
                🌐 Hybrid
              </button>
            </div>

            {/* Live indicator */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-emerald-500/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-white">LIVE TRACKING</span>
            </div>
          </div>

          {/* Stop Button */}
          <button
            onClick={handleStopTracking}
            disabled={loading}
            className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold text-lg py-5 px-8 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 hover:shadow-2xl disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/30 border-t-white"></div>
                <span>Stopping...</span>
              </>
            ) : (
              <>
                <X className="w-6 h-6" strokeWidth={2.5} />
                <span>Stop Tracking (Same Bus Number)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrackingView;
