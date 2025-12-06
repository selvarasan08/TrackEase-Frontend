import React from 'react';
import { AlertCircle, X } from 'lucide-react';

function ErrorAlert({ error, onClose }) {
  return (
    <div className="relative z-40 max-w-7xl mx-auto px-4 mt-4 animate-in slide-in-from-top duration-300">
      <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-r-2xl p-4 shadow-2xl backdrop-blur-sm bg-white/95">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 pt-1">
            <p className="text-sm font-semibold text-red-900">{error}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-red-500 hover:text-red-700 transition-colors p-1 hover:bg-red-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorAlert;