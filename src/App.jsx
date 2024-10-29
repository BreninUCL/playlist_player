import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DeviceSelector from './components/DeviceSelector';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login'; 
import WebSocketReceiver from './components/WebSocketReceiver';

const App = () => {
  return (
    <Routes>
      <Route path="/ws" element ={<WebSocketReceiver/>}/>
      <Route path="/login" element={<Login />} />
      <Route path="/select-device" element={<ProtectedRoute><DeviceSelector /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/select-device" />} /> 
    </Routes>
  );
};

export default App;
