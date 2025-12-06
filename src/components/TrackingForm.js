import React, { useState } from 'react';
import { Bus, User, Navigation, MapPin, Smartphone, Gauge, Zap } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/bus';

function TrackingForm({ driverInfo, onStartTracking, onError }) {
  const [busNumber, setBusNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!busNumber.trim()) {
      onError('Please enter bus number');
      return;
    }

    setLoading(true);
    onError('');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(`${API_URL}/start-tracking`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('driverToken')}`
              },
              body: JSON.stringify({
                busNumber: busNumber.trim(),
                driverName: driverInfo.name,
                driverId: driverInfo.id,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to start tracking');
            }

            const data = await response.json();
            onStartTracking({
              busNumber: busNumber.trim(),
              driverName: driverInfo.name,
              qrCode: data.qrCode,
              initialLocation: {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              }
            });
          } catch (error) {
            onError(error.message);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          onError('Unable to access location: ' + error.message);
          setLoading(false);
        }
      );
    } else {
      onError('Geolocation is not supported');
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-[2rem] blur-2xl opacity-20"></div>
      
      <div className="relative bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden border border-white/20">
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
              <Navigation className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Driver Control Panel
            </h2>
          </div>
          <p className="text-violet-100 font-medium">
            Start tracking your bus journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
              <Bus className="w-5 h-5 text-violet-600" />
              Bus Number
            </label>
            <input
              type="text"
              value={busNumber}
              onChange={(e) => setBusNumber(e.target.value.toUpperCase())}
              placeholder="e.g., TN01AB1234 or 123"
              className="w-full px-6 py-4 border-2 border-slate-200 rounded-2xl text-lg font-medium focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all shadow-sm"
            />
            <p className="mt-2 text-xs text-slate-500 font-medium">
              Enter full registration (TN01AB1234) or route number (123)
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
              <User className="w-5 h-5 text-violet-600" />
              Driver Name
            </label>
            <input
              type="text"
              value={driverInfo.name}
              disabled
              className="w-full px-6 py-4 border-2 border-slate-200 rounded-2xl text-lg font-medium bg-slate-50 text-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !busNumber.trim()}
            className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 hover:from-violet-700 hover:via-purple-700 hover:to-cyan-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold text-lg py-5 px-8 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 hover:shadow-2xl disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/30 border-t-white"></div>
                <span>Starting Tracking...</span>
              </>
            ) : (
              <>
                <Zap className="w-6 h-6 group-hover:animate-bounce" strokeWidth={2.5} />
                <span>Start Tracking Journey</span>
              </>
            )}
          </button>

          <div className="grid sm:grid-cols-3 gap-4 pt-4">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500 p-2 rounded-lg">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">Real-time GPS</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">Updates every second</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">QR Access</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">Share via WhatsApp</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="bg-violet-500 p-2 rounded-lg">
                  <Gauge className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">Live Stats</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">Speed & distance</p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TrackingForm;
