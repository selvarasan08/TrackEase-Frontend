import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapPin, Bus, QrCode, User, Navigation, AlertCircle, Clock, Zap, Route, Radio } from 'lucide-react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/bus';

function App() {
  const [view, setView] = useState('home');
  const [busNumber, setBusNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [trackingBusId, setTrackingBusId] = useState('');
  const [busData, setBusData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const watchIdRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const updateIntervalRef = useRef(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (view === 'tracker' && currentLocation && !mapRef.current) {
      initMap();
    }
  }, [view, currentLocation]);

  const initMap = () => {
    if (!window.L) {
      console.error('Leaflet not loaded');
      return;
    }

    const map = window.L.map('map').setView([currentLocation.lat, currentLocation.lng], 15);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    const busIcon = window.L.divIcon({
      className: 'custom-bus-marker',
      html: `
        <div style="position: relative;">
          <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            border: 3px solid white;
            animation: markerBounce 2s infinite;
          ">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80px;
            height: 80px;
            border: 2px solid #667eea;
            border-radius: 50%;
            animation: markerPulse 2s infinite;
          "></div>
        </div>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 50]
    });

    const marker = window.L.marker([currentLocation.lat, currentLocation.lng], {
      icon: busIcon
    }).addTo(map);

    const circle = window.L.circle([currentLocation.lat, currentLocation.lng], {
      color: '#667eea',
      fillColor: '#667eea',
      fillOpacity: 0.1,
      radius: 100
    }).addTo(map);

    marker.bindPopup(`
      <div style="text-align: center; font-family: system-ui;">
        <strong style="color: #667eea; font-size: 16px;">🚌 ${busData?.busNumber || 'Bus'}</strong>
        <br/>
        <span style="font-size: 12px; color: #666;">Driver: ${busData?.driverName || 'N/A'}</span>
      </div>
    `).openPopup();

    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;
  };

  // Update marker position
  useEffect(() => {
    if (markerRef.current && currentLocation && mapRef.current) {
      const newPos = [currentLocation.lat, currentLocation.lng];
      markerRef.current.setLatLng(newPos);
      if (circleRef.current) {
        circleRef.current.setLatLng(newPos);
      }
      mapRef.current.panTo(newPos);
    }
  }, [currentLocation]);

  // Start tracking for driver
  const startTracking = async () => {
    if (!busNumber.trim() || !driverName.trim()) {
      setError('Please enter bus number and driver name');
      return;
    }

    setError('');
    setLoading(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await axios.post(`${API_URL}/start-tracking`, {
              busNumber: busNumber.trim(),
              driverName: driverName.trim(),
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });

            setQrCodeUrl(response.data.qrCode);
            setIsTracking(true);
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });

            // Start watching position
            watchIdRef.current = navigator.geolocation.watchPosition(
              (pos) => {
                updateLocation(busNumber.trim(), pos.coords.latitude, pos.coords.longitude);
              },
              (error) => {
                console.error('Location error:', error);
                setError('Unable to track location: ' + error.message);
              },
              { 
                enableHighAccuracy: true, 
                maximumAge: 10000, 
                timeout: 5000 
              }
            );

            setLoading(false);
          } catch (error) {
            console.error('Start tracking error:', error);
            setError(error.response?.data?.error || 'Failed to start tracking');
            setLoading(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Unable to access location: ' + error.message);
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by this browser');
      setLoading(false);
    }
  };

  // Update location to backend
  const updateLocation = async (busNum, lat, lng) => {
    try {
      await axios.post(`${API_URL}/update-location`, {
        busNumber: busNum,
        latitude: lat,
        longitude: lng
      });
      
      setCurrentLocation({ lat, lng, timestamp: Date.now() });
    } catch (error) {
      console.error('Update location error:', error);
    }
  };

  // Stop tracking
  const stopTracking = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/stop-tracking`, { 
        busNumber: busNumber.trim() 
      });
      
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      
      setIsTracking(false);
      setQrCodeUrl('');
      setCurrentLocation(null);
      setLoading(false);
    } catch (error) {
      console.error('Stop tracking error:', error);
      setError(error.response?.data?.error || 'Failed to stop tracking');
      setLoading(false);
    }
  };

  // Start tracking bus for passenger
  const startTrackingBus = (busId) => {
    if (!busId || !busId.trim()) {
      setError('Please enter a valid bus number');
      return;
    }

    setError('');
    setTrackingBusId(busId.trim().toUpperCase());
    setView('tracker');
    fetchBusLocation(busId.trim());
    
    // Update every 20 seconds
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }
    
    updateIntervalRef.current = setInterval(() => {
      fetchBusLocation(busId.trim());
    }, 20000);
  };

  // Fetch bus location
  const fetchBusLocation = async (busId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/${busId.toUpperCase()}`);
      const data = response.data.bus;
      
      setBusData({
        busNumber: data.busNumber,
        driverName: data.driverName,
        lastUpdate: new Date(data.lastUpdated).toLocaleTimeString(),
        isStale: data.isStale
      });

      setCurrentLocation({
        lat: data.location.latitude,
        lng: data.location.longitude
      });

      setError('');
      setLoading(false);
    } catch (error) {
      console.error('Fetch bus location error:', error);
      setError(error.response?.data?.error || 'Failed to fetch bus location');
      setLoading(false);
    }
  };

  // Check URL for tracking parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trackBus = params.get('track');
    if (trackBus) {
      startTrackingBus(trackBus);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="App min-h-screen" style={{
      background: 'linear-gradient(to bottom right, #faf5ff, #eff6ff, #eef2ff)'
    }}>
      {/* Animated Background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: 0.3,
        zIndex: 0
      }}>
        <div className="animate-blob" style={{
          position: 'absolute',
          top: '5rem',
          left: '5rem',
          width: '16rem',
          height: '16rem',
          background: '#d8b4fe',
          borderRadius: '9999px',
          mixBlendMode: 'multiply',
          filter: 'blur(3rem)'
        }}></div>
        <div className="animate-blob animation-delay-2000" style={{
          position: 'absolute',
          top: '10rem',
          right: '5rem',
          width: '16rem',
          height: '16rem',
          background: '#fde68a',
          borderRadius: '9999px',
          mixBlendMode: 'multiply',
          filter: 'blur(3rem)'
        }}></div>
        <div className="animate-blob animation-delay-4000" style={{
          position: 'absolute',
          bottom: '5rem',
          left: '10rem',
          width: '16rem',
          height: '16rem',
          background: '#fbcfe8',
          borderRadius: '9999px',
          mixBlendMode: 'multiply',
          filter: 'blur(3rem)'
        }}></div>
      </div>

      {/* Header */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(to right, #4f46e5, #7c3aed, #db2777)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        zIndex: 10
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'black',
          opacity: 0.1
        }}></div>
        <div style={{
          position: 'relative',
          maxWidth: '72rem',
          margin: '0 auto',
          padding: '1.5rem 1rem'
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div style={{ position: 'relative' }}>
                <Bus color="white" size={40} />
                <div style={{
                  position: 'absolute',
                  top: '-0.25rem',
                  right: '-0.25rem',
                  width: '0.75rem',
                  height: '0.75rem',
                  background: '#4ade80',
                  borderRadius: '9999px'
                }} className="animate-ping"></div>
                <div style={{
                  position: 'absolute',
                  top: '-0.25rem',
                  right: '-0.25rem',
                  width: '0.75rem',
                  height: '0.75rem',
                  background: '#4ade80',
                  borderRadius: '9999px'
                }}></div>
              </div>
              <div>
                <h1 style={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  color: 'white',
                  letterSpacing: '-0.025em'
                }}>BusTrack</h1>
                <p style={{
                  color: '#e9d5ff',
                  fontSize: '0.875rem'
                }}>Real-time Journey Partner</p>
              </div>
            </div>
            <button
              onClick={() => {
                setView('home');
                if (isTracking) stopTracking();
                setError('');
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(12px)',
                color: 'white',
                padding: '0.5rem 1.5rem',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              Home
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '72rem',
          margin: '1rem auto',
          padding: '0 1rem'
        }}>
          <div style={{
            background: '#fee2e2',
            border: '2px solid #fca5a5',
            borderRadius: '1rem',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AlertCircle color="#dc2626" size={24} />
            <p style={{ color: '#991b1b', fontWeight: 600 }}>{error}</p>
            <button
              onClick={() => setError('')}
              style={{
                marginLeft: 'auto',
                color: '#991b1b',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem',
                fontWeight: 700
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Home View */}
      {view === 'home' && (
        <div style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '72rem',
          margin: '0 auto',
          padding: '3rem 1rem'
        }}>
          <div className="text-center" style={{ marginBottom: '4rem' }}>
            <h2 className="animate-fade-in" style={{
              fontSize: '3rem',
              fontWeight: 800,
              background: 'linear-gradient(to right, #4f46e5, #7c3aed, #db2777)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '1rem'
            }}>
              Track Your Bus in Real-Time
            </h2>
            <p style={{
              fontSize: '1.25rem',
              color: '#4b5563',
              maxWidth: '42rem',
              margin: '0 auto'
            }}>
              Never miss your bus again! Smart tracking with QR technology
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginBottom: '3rem'
          }}>
            {/* Driver Card */}
            <div
              onClick={() => setView('driver')}
              className="card-hover"
              style={{
                position: 'relative',
                background: 'white',
                borderRadius: '1.5rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                padding: '2rem',
                cursor: 'pointer',
                transition: 'all 0.3s',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '10rem',
                height: '10rem',
                background: 'linear-gradient(to bottom right, #818cf8, #a78bfa)',
                borderRadius: '9999px',
                filter: 'blur(3rem)',
                opacity: 0.2,
                transition: 'opacity 0.3s'
              }}></div>
              
              <div className="flex" style={{
                position: 'relative',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <div style={{
                  background: 'linear-gradient(to bottom right, #6366f1, #8b5cf6)',
                  padding: '1.5rem',
                  borderRadius: '1.5rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.3s'
                }}>
                  <User color="white" size={48} />
                </div>
                <h3 style={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  color: '#1f2937',
                  marginBottom: '0.75rem'
                }}>
                  I'm a Driver
                </h3>
                <p style={{
                  color: '#4b5563',
                  marginBottom: '1rem'
                }}>
                  Start tracking your bus journey and generate QR codes for passengers
                </p>
                <div className="flex items-center gap-2" style={{
                  color: '#6366f1',
                  fontWeight: 600
                }}>
                  <span>Get Started</span>
                  <Navigation size={20} />
                </div>
              </div>

              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '0.5rem',
                background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
                transform: 'scaleX(0)',
                transformOrigin: 'left',
                transition: 'transform 0.3s'
              }} className="card-bar"></div>
            </div>

            {/* Passenger Card */}
            <div
              onClick={() => {
                const busId = prompt('Enter bus number to track (e.g., TN01AB1234):');
                if (busId) startTrackingBus(busId);
              }}
              className="card-hover"
              style={{
                position: 'relative',
                background: 'white',
                borderRadius: '1.5rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                padding: '2rem',
                cursor: 'pointer',
                transition: 'all 0.3s',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '10rem',
                height: '10rem',
                background: 'linear-gradient(to bottom right, #4ade80, #10b981)',
                borderRadius: '9999px',
                filter: 'blur(3rem)',
                opacity: 0.2,
                transition: 'opacity 0.3s'
              }}></div>
              
              <div className="flex" style={{
                position: 'relative',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <div style={{
                  background: 'linear-gradient(to bottom right, #10b981, #059669)',
                  padding: '1.5rem',
                  borderRadius: '1.5rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.3s'
                }}>
                  <QrCode color="white" size={48} />
                </div>
                <h3 style={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  color: '#1f2937',
                  marginBottom: '0.75rem'
                }}>
                  I'm a Passenger
                </h3>
                <p style={{
                  color: '#4b5563',
                  marginBottom: '1rem'
                }}>
                  Scan QR code at any bus stop to track your bus in real-time
                </p>
                <div className="flex items-center gap-2" style={{
                  color: '#10b981',
                  fontWeight: 600
                }}>
                  <span>Track Now</span>
                  <MapPin size={20} />
                </div>
              </div>

              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '0.5rem',
                background: 'linear-gradient(to right, #10b981, #059669)',
                transform: 'scaleX(0)',
                transformOrigin: 'left',
                transition: 'transform 0.3s'
              }} className="card-bar"></div>
            </div>
          </div>

          {/* Features */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginTop: '3rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(12px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'inline-block',
                background: '#dbeafe',
                padding: '0.75rem',
                borderRadius: '9999px',
                marginBottom: '1rem'
              }}>
                <Zap color="#2563eb" size={32} />
              </div>
              <h4 style={{
                fontWeight: 700,
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>Live Updates</h4>
              <p style={{
                color: '#4b5563',
                fontSize: '0.875rem'
              }}>Location refreshes every 20 seconds</p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(12px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'inline-block',
                background: '#f3e8ff',
                padding: '0.75rem',
                borderRadius: '9999px',
                marginBottom: '1rem'
              }}>
                <Route color="#7c3aed" size={32} />
              </div>
              <h4 style={{
                fontWeight: 700,
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>Accurate Tracking</h4>
              <p style={{
                color: '#4b5563',
                fontSize: '0.875rem'
              }}>GPS-powered precision mapping</p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(12px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'inline-block',
                background: '#fce7f3',
                padding: '0.75rem',
                borderRadius: '9999px',
                marginBottom: '1rem'
              }}>
                <QrCode color="#db2777" size={32} />
              </div>
              <h4 style={{
                fontWeight: 700,
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>Easy Access</h4>
              <p style={{
                color: '#4b5563',
                fontSize: '0.875rem'
              }}>Scan QR code and track instantly</p>
            </div>
          </div>
        </div>
      )}

      {/* Driver View */}
      {view === 'driver' && (
        <div style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '48rem',
          margin: '0 auto',
          padding: '3rem 1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
              padding: '2rem',
              color: 'white'
            }}>
              <div className="flex items-center gap-4" style={{ marginBottom: '0.5rem' }}>
                <Bus size={40} />
                <h2 style={{
                  fontSize: '1.875rem',
                  fontWeight: 700
                }}>Driver Dashboard</h2>
              </div>
              <p style={{
                color: '#e9d5ff'
              }}>Control your bus tracking system</p>
            </div>
            
            <div style={{ padding: '2rem' }}>
              {!isTracking ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: '#374151',
                      marginBottom: '0.75rem'
                    }} className="flex items-center gap-2">
                      <Bus size={18} />
                      Bus Number
                    </label>
                    <input
                      type="text"
                      value={busNumber}
                      onChange={(e) => setBusNumber(e.target.value)}
                      placeholder="e.g., TN01AB1234"
                      style={{
                        width: '100%',
                        padding: '1rem 1.5rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '1rem',
                        fontSize: '1.125rem',
                        transition: 'all 0.3s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#6366f1';
                        e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: '#374151',
                      marginBottom: '0.75rem'
                    }} className="flex items-center gap-2">
                      <User size={18} />
                      Driver Name
                    </label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Enter your name"
                      style={{
                        width: '100%',
                        padding: '1rem 1.5rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '1rem',
                        fontSize: '1.125rem',
                        transition: 'all 0.3s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#6366f1';
                        e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <button onClick={startTracking}
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? '#9ca3af' : 'linear-gradient(to right, #4f46e5, #7c3aed)',
                  color: 'white',
                  padding: '1.25rem',
                  borderRadius: '1rem',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '1.125rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem'
                }}
                onMouseOver={(e) => !loading && (e.target.style.transform = 'scale(1.02)')}
                onMouseOut={(e) => !loading && (e.target.style.transform = 'scale(1)')}
              >
                {loading ? (
                  <>
                    <div className="animate-spin" style={{
                      width: '1.5rem',
                      height: '1.5rem',
                      border: '3px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: 'white',
                      borderRadius: '9999px'
                    }}></div>
                    Starting...
                  </>
                ) : (
                  <>
                    <Navigation size={24} />
                    Start Tracking Journey
                  </>
                )}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{
                background: 'linear-gradient(to right, #d1fae5, #a7f3d0)',
                border: '2px solid #6ee7b7',
                borderRadius: '1rem',
                padding: '1.5rem'
              }}>
                <div className="flex items-start gap-4">
                  <div style={{
                    background: '#10b981',
                    padding: '0.75rem',
                    borderRadius: '9999px'
                  }}>
                    <Radio className="animate-pulse" color="white" size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontWeight: 700,
                      color: '#065f46',
                      fontSize: '1.125rem',
                      marginBottom: '0.25rem'
                    }}>
                      🟢 Live Tracking Active
                    </p>
                    <p style={{
                      color: '#047857',
                      fontWeight: 600
                    }}>
                      Bus {busNumber}
                    </p>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#059669',
                      marginTop: '0.25rem'
                    }}>
                      Driver: {driverName}
                    </p>
                    {currentLocation && (
                      <div style={{
                        marginTop: '0.75rem',
                        fontSize: '0.75rem',
                        color: '#059669',
                        fontFamily: 'monospace',
                        background: 'rgba(255, 255, 255, 0.5)',
                        padding: '0.5rem',
                        borderRadius: '0.5rem'
                      }}>
                        📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {qrCodeUrl && (
                <div style={{
                  background: 'linear-gradient(to bottom right, #fae8ff, #fce7f3)',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  textAlign: 'center',
                  border: '2px solid #f0abfc'
                }}>
                  <div style={{
                    display: 'inline-block',
                    background: 'white',
                    padding: '1rem',
                    borderRadius: '1rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    marginBottom: '1rem'
                  }}>
                    <QrCode color="#a855f7" size={32} style={{ marginBottom: '0.5rem', display: 'block', margin: '0 auto' }} />
                    <p style={{
                      fontWeight: 700,
                      color: '#1f2937',
                      marginBottom: '0.75rem',
                      fontSize: '1.125rem'
                    }}>
                      QR Code for Passengers
                    </p>
                    <img
                      src={qrCodeUrl}
                      alt="Bus Tracking QR Code"
                      style={{
                        border: '4px solid #d8b4fe',
                        borderRadius: '1rem',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  </div>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#7e22ce',
                    fontWeight: 600,
                    marginTop: '1rem'
                  }}>
                    📱 Print and place this at bus stops
                  </p>
                </div>
              )}

              <button
                onClick={stopTracking}
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? '#9ca3af' : 'linear-gradient(to right, #ef4444, #ec4899)',
                  color: 'white',
                  padding: '1.25rem',
                  borderRadius: '1rem',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '1.125rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseOver={(e) => !loading && (e.target.style.transform = 'scale(1.02)')}
                onMouseOut={(e) => !loading && (e.target.style.transform = 'scale(1)')}
              >
                {loading ? 'Stopping...' : 'Stop Tracking'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )}

  {/* Tracker View */}
  {view === 'tracker' && (
    <div style={{
      position: 'relative',
      zIndex: 1,
      maxWidth: '90rem',
      margin: '0 auto',
      padding: '2rem 1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'linear-gradient(to right, #4f46e5, #7c3aed, #db2777)',
          color: 'white',
          padding: '1.5rem'
        }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3" style={{ marginBottom: '0.5rem' }}>
                <Bus size={32} />
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 700
                }}>Bus {trackingBusId}</h2>
              </div>
              {busData && (
                <div className="flex items-center gap-4" style={{
                  fontSize: '0.875rem',
                  flexWrap: 'wrap'
                }}>
                  <span className="flex items-center gap-2">
                    <User size={16} />
                    {busData.driverName}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock size={16} />
                    Updated: {busData.lastUpdate}
                  </span>
                </div>
              )}
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(12px)',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{
                width: '0.75rem',
                height: '0.75rem',
                background: '#4ade80',
                borderRadius: '9999px'
              }} className="animate-pulse"></div>
              <span style={{ fontWeight: 600 }}>Live</span>
            </div>
          </div>
        </div>
        
        <div id="map" style={{
          width: '100%',
          height: '600px',
          background: '#f3f4f6',
          position: 'relative'
        }}>
          {!window.L && (
            <div className="flex items-center justify-center" style={{
              height: '100%'
            }}>
              <div style={{ textAlign: 'center' }}>
                <Bus className="animate-bounce" color="#818cf8" size={64} style={{
                  margin: '0 auto 1rem'
                }} />
                <p style={{
                  color: '#4b5563',
                  fontWeight: 600,
                  fontSize: '1.125rem'
                }}>
                  Loading map...
                </p>
              </div>
            </div>
          )}
        </div>

        <div style={{
          background: 'linear-gradient(to right, #eef2ff, #f5f3ff)',
          padding: '1rem',
          textAlign: 'center',
          borderTop: '2px solid #e0e7ff'
        }}>
          <p className="flex items-center justify-center gap-2" style={{
            color: '#5b21b6',
            fontWeight: 600
          }}>
            <Zap size={18} className="animate-pulse" />
            Location updates automatically every 20 seconds
          </p>
        </div>
      </div>
    </div>
  )}

  <style jsx>{`
    .card-hover:hover {
      transform: translateY(-0.5rem);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    
    .card-hover:hover .card-bar {
      transform: scaleX(1);
    }
    
    .card-hover:hover > div:first-child {
      opacity: 0.3;
    }
    
    .card-hover:hover > div > div:first-child {
      transform: scale(1.1);
    }
  `}</style>
</div>
);
}
export default App;