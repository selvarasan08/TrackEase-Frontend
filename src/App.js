import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/DashBoard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driverInfo, setDriverInfo] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('driverToken');
    const driver = localStorage.getItem('driverInfo');
    if (token && driver) {
      setIsLoggedIn(true);
      setDriverInfo(JSON.parse(driver));
    }
  }, []);

  const handleLoginSuccess = (driver, token) => {
    localStorage.setItem('driverToken', token);
    localStorage.setItem('driverInfo', JSON.stringify(driver));
    setIsLoggedIn(true);
    setDriverInfo(driver);
  };

  const handleLogout = () => {
    localStorage.removeItem('driverToken');
    localStorage.removeItem('driverInfo');
    setIsLoggedIn(false);
    setDriverInfo(null);
  };

  return (
    <>
      {!isLoggedIn ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard driverInfo={driverInfo} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
