import React from 'react';
import { Bus, Radio, LogOut } from 'lucide-react';

function Header({ isTracking, driverInfo, onLogout }) {
  return (
    <header className="relative z-10 bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 shadow-2xl">
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="bg-white/25 backdrop-blur-md p-3 rounded-2xl shadow-xl">
                <Bus className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-ping"></div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full"></div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                BusTrackr Pro
              </h1>
              <p className="text-violet-100 text-sm font-semibold">
                Welcome, {driverInfo?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isTracking && (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-500/90 backdrop-blur-md rounded-full shadow-lg">
                <div className="relative">
                  <Radio className="w-4 h-4 text-white" />
                  <div className="absolute inset-0 animate-ping">
                    <Radio className="w-4 h-4 text-white opacity-75" />
                  </div>
                </div>
                <span className="text-sm font-bold text-white uppercase tracking-wide">Live</span>
              </div>
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl transition-all shadow-lg"
            >
              <LogOut className="w-4 h-4 text-white" />
              <span className="hidden sm:inline text-sm font-bold text-white">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
