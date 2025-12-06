import React, { useState } from 'react';
import { Bus, Mail, Lock, LogIn, AlertCircle, X } from 'lucide-react';

const API_URL ="https://trackease-backend-teq8.onrender.com/api";

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const response = await fetch(`${API_URL}/drivers/login`, {  // ✅ Fixed path
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Store token and driver data
    localStorage.setItem('driverToken', data.token);
    localStorage.setItem('driverId', data.driver.id);
    
    onLoginSuccess(data.driver, data.token);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-cyan-50 overflow-hidden flex items-center justify-center">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-violet-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-[2rem] blur-2xl opacity-20"></div>
          
          {/* Card */}
          <div className="relative bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden border border-white/20">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 p-8 text-center">
              <div className="inline-block bg-white/20 backdrop-blur-sm p-4 rounded-2xl mb-4">
                <Bus className="w-12 h-12 text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-black text-white mb-2">
                BusTrackr Pro
              </h1>
              <p className="text-violet-100 font-semibold">
                Driver Login Portal
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mx-6 mt-6 bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900">{error}</p>
                  </div>
                  <button
                    onClick={() => setError('')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Email Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                  <Mail className="w-5 h-5 text-violet-600" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@example.com"
                  required
                  className="w-full px-6 py-4 border-2 border-slate-200 rounded-2xl text-lg font-medium focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all shadow-sm"
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                  <Lock className="w-5 h-5 text-violet-600" />
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-6 py-4 border-2 border-slate-200 rounded-2xl text-lg font-medium focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all shadow-sm"
                />
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 hover:from-violet-700 hover:via-purple-700 hover:to-cyan-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold text-lg py-5 px-8 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 hover:shadow-2xl disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/30 border-t-white"></div>
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-6 h-6 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                    <span>Login to Dashboard</span>
                  </>
                )}
              </button>

              {/* Info Text */}
              <div className="text-center pt-4">
                <p className="text-sm text-slate-600">
                  Don't have an account?{' '}
                  <button type="button" className="font-bold text-violet-600 hover:text-violet-700">
                    Contact Admin
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;