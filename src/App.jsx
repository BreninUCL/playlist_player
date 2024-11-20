import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DeviceSelector from './components/DeviceSelector';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login'; 
import PlayPage from './components/PlayPage';

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/select-device" element={<ProtectedRoute><DeviceSelector /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/select-device" />} /> 
      <Route path="/device/:deviceId" element={<ProtectedRoute><PlayPage /></ProtectedRoute>} />
    </Routes>
  );
};

export default App;
