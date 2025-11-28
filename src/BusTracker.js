import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/bus';
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // Get from Google Cloud Console

const BusTracker = () => {
  const [view, setView] = useState('home');
  const [busNumber, setBusNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [trackingBusId, setTrackingBusId] = useState('');
  const [busData, setBusData] = useState(null);
  
  const watchIdRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const updateIntervalRef = useRef(null);

  // Start tracking for driver
  const startTracking = async () => {
    if (!busNumber || !driverName) {
      alert('Please enter bus number and driver name');
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await axios.post(`${API_URL}/start-tracking`, {
              busNumber,
              driverName,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });

            setQrCode(response.data.qrCode);
            setIsTracking(true);

            // Start watching position
            watchIdRef.current = navigator.geolocation.watchPosition(
              (pos) => {
                updateLocation(busNumber, pos.coords.latitude, pos.coords.longitude);
              },
              (error) => console.error('Location error:', error),
              { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            );
          } catch (error) {
            alert('Error starting tracking: ' + error.message);
          }
        },
        (error) => {
          alert('Unable to get location: ' + error.message);
        }
      );
    } else {
      alert('Geolocation not supported');
    }
  };

  const updateLocation = async (busNum, lat, lng) => {
    try {
      await axios.post(`${API_URL}/update-location`, {
        busNumber: busNum,
        latitude: lat,
        longitude: lng
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const stopTracking = async () => {
    try {
      await axios.post(`${API_URL}/stop-tracking`, { busNumber });
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      setIsTracking(false);
      setQrCode('');
    } catch (error) {
      console.error('Error stopping tracking:', error);
    }
  };

  // Passenger tracking
  const startTrackingBus = (busId) => {
    setTrackingBusId(busId);
    setView('tracker');
    fetchBusLocation(busId);
    
    // Update every 20 seconds
    updateIntervalRef.current = setInterval(() => {
      fetchBusLocation(busId);
    }, 20000);
  };

  const fetchBusLocation = async (busId) => {
    try {
      const response = await axios.get(`${API_URL}/${busId}`);
      const data = response.data.bus;
      
      setBusData({
        ...data,
        lastUpdate: new Date(data.lastUpdated).toLocaleTimeString()
      });

      const location = {
        lat: data.location.latitude,
        lng: data.location.longitude
      };

      // Initialize or update map
      if (!mapRef.current) {
        initMap(location);
      } else {
        updateMap(location);
      }
    } catch (error) {
      alert('Error fetching bus location: ' + error.message);
    }
  };

  const initMap = (location) => {
    const map = new window.google.maps.Map(document.getElementById('map'), {
      center: location,
      zoom: 15
    });

    const marker = new window.google.maps.Marker({
      position: location,
      map: map,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/bus.png',
        scaledSize: new window.google.maps.Size(40, 40)
      },
      title: trackingBusId
    });

    mapRef.current = map;
    markerRef.current = marker;
  };

  const updateMap = (location) => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setPosition(location);
      mapRef.current.panTo(location);
    }
  };

  // Cleanup
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

  // Check URL for tracking parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trackBus = params.get('track');
    if (trackBus) {
      startTrackingBus(trackBus);
    }
  }, []);

  // Load Google Maps script
  useEffect(() => {
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Same JSX as demo above, but with real API calls */}
      {/* Copy the JSX from the artifact above */}
    </div>
  );
};

export default BusTracker;