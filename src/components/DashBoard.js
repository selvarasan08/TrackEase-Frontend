import React, { useState } from 'react';
import Header from './Header';
import TrackingForm from './TrackingForm';
import TrackingView from './TrackingView';
import ErrorAlert from './ErrorAlert';

function Dashboard({ driverInfo, onLogout }) {
  const [isTracking, setIsTracking] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState('');

  const handleStartTracking = (data) => {
    setIsTracking(true);
    setTrackingData(data);
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    setTrackingData(null);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-cyan-50 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-violet-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <Header isTracking={isTracking} driverInfo={driverInfo} onLogout={onLogout} />
      
      {error && <ErrorAlert error={error} onClose={() => setError('')} />}

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 sm:py-10">
        {!isTracking ? (
          <TrackingForm 
            driverInfo={driverInfo}
            onStartTracking={handleStartTracking}
            onError={setError}
          />
        ) : (
          <TrackingView
            trackingData={trackingData}
            driverInfo={driverInfo}
            onStopTracking={handleStopTracking}
            onError={setError}
          />
        )}
      </div>

      <footer className="relative z-10 max-w-4xl mx-auto px-4 pb-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-violet-700">
            Powered by BusTrackr Pro • Real-time GPS Tracking
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;
